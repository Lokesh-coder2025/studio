
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
      let allocatedCount;
      
      if (isPartTime) {
        const pt_base = Math.floor(0.5 * base_share);
        const presenceDaysCount = inv.availableDays?.length || 0;
        // Cap duty at the number of available days if it's less than their 50% share
        allocatedCount = Math.min(pt_base, presenceDaysCount);
      } else {
        allocatedCount = base_share;
      }
      invigilatorDutyCounts.set(inv.name, allocatedCount);
      total_allocated += allocatedCount;
    });

    // === Step 4: Distribute the Excess (Remainder) ===
    let R = T - total_allocated;
    if (R > 0) {
      // Distribute remainder starting from the most junior invigilators (who are full-time)
      const fullTimeInvigilators = invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);
      let ftIndex = fullTimeInvigilators.length - 1;
      
      while (R > 0 && ftIndex >= 0) {
        const inv = fullTimeInvigilators[ftIndex];
        const currentData = invigilatorDutyCounts.get(inv.name);
        
        if (currentData !== undefined) {
            invigilatorDutyCounts.set(inv.name, currentData + 1);
            R--;
        }
        
        ftIndex--;
        // Cycle through again if necessary
        if(ftIndex < 0) {
            ftIndex = fullTimeInvigilators.length - 1;
        }
      }
    }
    
    // === Step 5: Day-by-day Assignment ===
    const assignments: OptimizeDutyAssignmentsOutput = examinations.map(e => ({ ...e, invigilators: [] }));
    const invigilatorDayTracker = new Map<string, Set<string>>(); // Tracks days an invigilator has a duty

    for (const exam of assignments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const needed = exam.invigilatorsNeeded;
      const examDate = exam.date;
      const dayOfWeek = format(parseISO(examDate), 'EEEE');
      let assignedCount = 0;

      // Create a list of eligible candidates for this exam, sorted by seniority
      const candidates = invigilators
        .map(inv => {
            const dutiesAssignedSoFar = assignments.reduce((count, asgn) => 
                asgn.invigilators.includes(inv.name) ? count + 1 : count, 0);
            return { inv, dutiesAssignedSoFar };
        })
        .filter(({ inv, dutiesAssignedSoFar }) => {
            const invTotalDuties = invigilatorDutyCounts.get(inv.name) || 0;
            const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);
            const isPartTime = inv.availableDays && inv.availableDays.length > 0;
            const hasAvailability = !isPartTime || inv.availableDays?.includes(dayOfWeek);

            return dutiesAssignedSoFar < invTotalDuties && !hasDutyOnDay && hasAvailability;
        });

      // Assign duties from the candidate list
      for (let i = 0; i < candidates.length && assignedCount < needed; i++) {
        const { inv } = candidates[i];
        exam.invigilators.push(inv.name);
        assignedCount++;
        
        if (!invigilatorDayTracker.has(inv.name)) {
            invigilatorDayTracker.set(inv.name, new Set());
        }
        invigilatorDayTracker.get(inv.name)!.add(examDate);
      }
      
      // If slots are still empty (critical issue), fill them with any available invigilator
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
