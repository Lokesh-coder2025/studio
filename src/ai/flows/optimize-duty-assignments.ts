
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
    
    const fullTimeInvigilators = invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);
    const partTimeInvigilators = invigilators.filter(inv => inv.availableDays && inv.availableDays.length > 0);
    
    const Nf = fullTimeInvigilators.length;
    const Np = partTimeInvigilators.length;

    // === Step 2: Calculate Base Shares (considering PTs get 50%) ===
    // We model this as T = (Nf * X) + (Np * 0.5 * X), where X is the full-time share.
    // T = X * (Nf + 0.5 * Np) => X = T / (Nf + 0.5 * Np)
    const effectiveTotalInvigilators = Nf + (0.5 * Np);
    const base_share_float = effectiveTotalInvigilators > 0 ? T / effectiveTotalInvigilators : 0;
    const ft_base_share = Math.floor(base_share_float);
    const pt_base_share = Math.floor(0.5 * ft_base_share);
    
    const invigilatorDutyCounts = new Map<string, number>();
    let total_allocated = 0;

    invigilators.forEach(inv => {
      const isPartTime = inv.availableDays && inv.availableDays.length > 0;
      let allocatedCount = isPartTime ? pt_base_share : ft_base_share;

      if(isPartTime){
        const presenceDaysCount = inv.availableDays?.length || 0;
        allocatedCount = Math.min(allocatedCount, presenceDaysCount);
      }
      
      invigilatorDutyCounts.set(inv.name, allocatedCount);
      total_allocated += allocatedCount;
    });

    // === Step 3: Distribute the Excess (Remainder) to Juniors ===
    let R = T - total_allocated;
    if (R > 0) {
      let ftIndex = fullTimeInvigilators.length - 1;
      while (R > 0 && ftIndex >= 0) {
        const inv = fullTimeInvigilators[ftIndex];
        const currentData = invigilatorDutyCounts.get(inv.name);
        if (currentData !== undefined) {
            invigilatorDutyCounts.set(inv.name, currentData + 1);
            R--;
        }
        ftIndex--;
        if(ftIndex < 0 && R > 0) {
            ftIndex = fullTimeInvigilators.length - 1;
        }
      }
    }
    
    // === Step 4: Day-by-day Assignment ===
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
      if (assignedCount < needed) {
         for (let i = 0; i < invigilators.length && assignedCount < needed; i++) {
            const inv = invigilators[i];
            if (exam.invigilators.includes(inv.name)) continue; 

            const isPartTime = inv.availableDays && inv.availableDays.length > 0;
            const hasAvailability = !isPartTime || inv.availableDays?.includes(dayOfWeek);
            const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);

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
