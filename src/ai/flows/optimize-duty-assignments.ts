
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
import { format, parseISO } from 'date-fns';

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
    if (N === 0) return [];
    const base_share = Math.floor(T / N);

    // === Step 2 & 3: Initial Allocation & PT Constraints ===
    let total_allocated = 0;
    const invigilatorDutyCounts = new Map<string, number>();

    invigilators.forEach(inv => {
      const isPartTime = inv.availableDays && inv.availableDays.length > 0;
      let allocatedCount = base_share;
      
      if (isPartTime) {
        const pt_base = Math.floor(0.5 * base_share);
        const presenceDaysCount = inv.availableDays?.length || 0;
        // Cap duty at the number of available days if it's less than their 50% share
        allocatedCount = Math.min(pt_base, presenceDaysCount);
      }
      invigilatorDutyCounts.set(inv.name, allocatedCount);
      total_allocated += allocatedCount;
    });

    // === Step 4: Distribute the Excess (Remainder) ===
    let R = T - total_allocated;
    if (R > 0) {
      // Distribute remainder starting from the most junior invigilators
      for (let i = invigilators.length - 1; i >= 0; i--) {
        if (R <= 0) break;
        const inv = invigilators[i];
        const isPartTime = inv.availableDays && inv.availableDays.length > 0;
        const currentData = invigilatorDutyCounts.get(inv.name);
        
        // Generally, give excess to full-timers. A part-timer could get one if logic allows.
        // For simplicity and fairness, we prioritize FT for excess duties.
        if (currentData !== undefined && !isPartTime) {
            invigilatorDutyCounts.set(inv.name, currentData + 1);
            R--;
        }
      }
      
      // If remainder still exists (e.g. all remaining are PT), cycle through again if needed.
      // This is a failsafe for edge cases.
      if (R > 0) {
          for (let i = invigilators.length - 1; i >= 0; i--) {
              if (R <= 0) break;
              const inv = invigilators[i];
              const currentData = invigilatorDutyCounts.get(inv.name);
              if(currentData !== undefined) {
                  invigilatorDutyCounts.set(inv.name, currentData + 1);
                  R--;
              }
          }
      }

    }
    
    // === Step 5: Day-by-day Assignment ===
    const assignments: OptimizeDutyAssignmentsOutput = examinations.map(e => ({ ...e, invigilators: [] }));
    const invigilatorDayTracker = new Map<string, Set<string>>(); // Tracks days an invigilator has a duty

    for (const exam of assignments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const needed = exam.invigilatorsNeeded;
      const examDate = exam.date;
      // The day name needs to match the format stored in `availableDays` (e.g., 'Monday')
      const dayOfWeek = format(parseISO(examDate), 'EEEE');
      let assignedCount = 0;

      // Assign duties for this exam, prioritizing seniors
      for (let i = 0; i < invigilators.length && assignedCount < needed; i++) {
        const inv = invigilators[i];
        const invTotalDuties = invigilatorDutyCounts.get(inv.name) || 0;
        
        // Calculate duties already assigned to this invigilator
        const dutiesAssignedSoFar = assignments.reduce((count, asgn) => 
            asgn.invigilators.includes(inv.name) ? count + 1 : count, 0);

        const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);
        const isPartTime = inv.availableDays && inv.availableDays.length > 0;
        const hasAvailability = !isPartTime || inv.availableDays?.includes(dayOfWeek);

        if (dutiesAssignedSoFar < invTotalDuties && !hasDutyOnDay && hasAvailability) {
          exam.invigilators.push(inv.name);
          assignedCount++;
          
          if (!invigilatorDayTracker.has(inv.name)) {
              invigilatorDayTracker.set(inv.name, new Set());
          }
          invigilatorDayTracker.get(inv.name)!.add(examDate);
        }
      }
      
      // If slots are still empty, it's a critical issue. Fill them with any available invigilator
      // who doesn't have a duty on that day, even if it exceeds their quota.
      // This prioritizes filling slots over perfect quota adherence.
      if (assignedCount < needed) {
         for (let i = 0; i < invigilators.length && assignedCount < needed; i++) {
            const inv = invigilators[i];
            if (exam.invigilators.includes(inv.name)) continue; // Already assigned this exam

            const isPartTime = inv.availableDays && inv.availableDays.length > 0;
            const hasAvailability = !isPartTime || inv.availableDays?.includes(dayOfWeek);
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
    
    return assignments;
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
