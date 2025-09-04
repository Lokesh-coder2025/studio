
'use server';

/**
 * @fileOverview Optimizes duty assignments for invigilators using a deterministic algorithm.
 * This approach ensures fairness and adherence to strict seniority and availability rules.
 *
 * - optimizeDutyAssignments - A function that optimizes duty assignments.
 * - OptimizeDutyAssignmentsInput - The input type for the optimizeDutyAssignments function.
 * - OptimizeDutyAssignmentsOutput - The return type for the optimizeDutyAssignments function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format, parseISO, getDay } from 'date-fns';

// Define the input schema for the flow
const OptimizeDutyAssignmentsInputSchema = z.object({
  invigilators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      designation: z.string(),
      availableDays: z.array(z.string()).optional(),
    })
  ),
  examinations: z.array(
    z.object({
      date: z.string(),
      subject: z.string(),
      time: z.string(),
      invigilatorsNeeded: z.number(),
    })
  ),
});
export type OptimizeDutyAssignmentsInput = z.infer<typeof OptimizeDutyAssignmentsInputSchema>;

// Define the output schema for the flow
const OptimizeDutyAssignmentsOutputSchema = z.array(
  z.object({
    date: z.string(),
    subject: z.string(),
    time: z.string(),
    invigilators: z.array(z.string()),
  })
);
export type OptimizeDutyAssignmentsOutput = z.infer<typeof OptimizeDutyAssignmentsOutputSchema>;

const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async ({ invigilators, examinations }) => {
    // === Step 1: Compute Totals ===
    const T = examinations.reduce((sum, exam) => sum + exam.invigilatorsNeeded, 0);
    const N = invigilators.length;
    const base_share = Math.floor(T / N);

    // === Step 2 & 3: Initial Allocation & PT Constraints ===
    let total_allocated = 0;
    const invigilatorDutyCounts = new Map<string, { total: number, isPartTime: boolean }>();

    invigilators.forEach(inv => {
      const isPartTime = inv.availableDays && inv.availableDays.length > 0;
      let allocatedCount = base_share;
      if (isPartTime) {
        // PT cap at 50% of base share, but not less than 1 if they have availability
        const pt_base = Math.floor(0.5 * base_share);
        const presenceDaysCount = inv.availableDays?.length || 0;
        allocatedCount = Math.min(pt_base, presenceDaysCount > 0 ? presenceDaysCount : 0);
      }
      invigilatorDutyCounts.set(inv.name, { total: allocatedCount, isPartTime });
      total_allocated += allocatedCount;
    });

    // === Step 4: Distribute the Excess (Remainder) ===
    let R = T - total_allocated;
    if (R > 0) {
      // Distribute remainder starting from the most junior invigilators
      for (let i = invigilators.length - 1; i >= 0; i--) {
        if (R <= 0) break;
        const inv = invigilators[i];
        const currentData = invigilatorDutyCounts.get(inv.name);
        if (currentData) {
            currentData.total += 1;
            invigilatorDutyCounts.set(inv.name, currentData);
            R--;
        }
      }
    }
    
    // In case of rounding issues leading to deficit, give duties to seniors
    if (R < 0) {
         for (let i = 0; i < invigilators.length; i++) {
            if (R >= 0) break;
            const inv = invigilators[i];
            const currentData = invigilatorDutyCounts.get(inv.name);
            if (currentData && currentData.total > 0) {
                currentData.total -= 1;
                invigilatorDutyCounts.set(inv.name, currentData);
                R++;
            }
        }
    }

    // === Step 5: Day-by-day Assignment ===
    const assignments: OptimizeDutyAssignmentsOutput = examinations.map(e => ({ ...e, invigilators: [] }));
    const invigilatorDayTracker = new Map<string, Set<string>>(); // Tracks which days an invigilator has a duty

    for (const exam of assignments) {
      const needed = exam.invigilatorsNeeded;
      const examDate = exam.date;
      const dayOfWeek = format(parseISO(examDate), 'EEEE');
      let assignedCount = 0;

      // Assign duties for this exam, prioritizing seniors
      for (let i = 0; i < invigilators.length && assignedCount < needed; i++) {
        const inv = invigilators[i];
        const invData = invigilatorDutyCounts.get(inv.name)!;
        const invDutiesSoFar = exam.invigilators.length + assignments.filter(a => a.date !== examDate && a.invigilators.includes(inv.name)).length;

        const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);
        const hasAvailability = !invData.isPartTime || inv.availableDays?.includes(dayOfWeek);

        if (invDutiesSoFar < invData.total && !hasDutyOnDay && hasAvailability) {
          exam.invigilators.push(inv.name);
          assignedCount++;
          
          if (!invigilatorDayTracker.has(inv.name)) {
              invigilatorDayTracker.set(inv.name, new Set());
          }
          invigilatorDayTracker.get(inv.name)!.add(examDate);
        }
      }
      
      // If slots are still empty (e.g., due to strict one-duty-a-day rule), fill them with any available invigilator
      if (assignedCount < needed) {
         for (let i = 0; i < invigilators.length && assignedCount < needed; i++) {
            const inv = invigilators[i];
            if (exam.invigilators.includes(inv.name)) continue; // Already assigned this exam

            const invData = invigilatorDutyCounts.get(inv.name)!;
            const hasAvailability = !invData.isPartTime || inv.availableDays?.includes(dayOfWeek);
            const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);

            // Bend the total count rule to ensure the slot is filled, but NOT the one-duty-per-day rule
             if (hasAvailability && !hasDutyOnDay) {
                exam.invigilators.push(inv.name);
                assignedCount++;
                 if (!invigilatorDayTracker.has(inv.name)) {
                    invigilatorDayTracker.set(inv.name, new Set());
                }
                invigilatorDayTracker.get(inv.name)!.add(examDate);
            }
         }
      }
    }
    
    // === Step 6: Validation (Implicitly handled by design, but can be added) ===
    // The logic above is designed to fill all slots.

    // === Step 7: Output format ===
    return assignments;
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
