
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
import { format, parseISO, subDays } from 'date-fns';

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
    
    const base_share = Nf > 0 ? Math.floor(T / Nf) : 0;
    
    const invigilatorDutyCounts = new Map<string, number>();
    let total_allocated = 0;
    let ft_allocated = 0;

    fullTimeInvigilators.forEach(inv => {
      invigilatorDutyCounts.set(inv.name, base_share);
      ft_allocated += base_share;
    });

    partTimeInvigilators.forEach(inv => {
        const pt_base_share = Math.floor(0.5 * base_share);
        const presenceDaysCount = inv.availableDays?.length || 0;
        const dutiesForPartTimer = Math.min(pt_base_share, presenceDaysCount);
        invigilatorDutyCounts.set(inv.name, dutiesForPartTimer);
    });

    total_allocated = Array.from(invigilatorDutyCounts.values()).reduce((sum, count) => sum + count, 0);

    // === Step 3: Distribute the Excess (Remainder) to Juniors ===
    let R = T - total_allocated;
    if (R > 0) {
      const juniorFtInvigilators = [...fullTimeInvigilators].reverse();
      let cycles = 0;
      const maxCycles = T; // safety break

      while(R > 0 && cycles < maxCycles) {
        for(const inv of juniorFtInvigilators) {
          if (R > 0) {
            const currentCount = invigilatorDutyCounts.get(inv.name) || 0;
            invigilatorDutyCounts.set(inv.name, currentCount + 1);
            R--;
          } else {
            break;
          }
        }
        cycles++;
      }
    }
    
    // === Step 4: Day-by-day Assignment ===
    const assignments: OptimizeDutyAssignmentsOutput = examinations.map(e => ({ ...e, invigilators: [] }));
    const invigilatorDayTracker = new Map<string, Set<string>>(); // Tracks days an invigilator has a duty

    for (const exam of assignments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const needed = exam.invigilatorsNeeded;
      const examDate = exam.date;
      const dayOfWeek = format(parseISO(examDate), 'EEEE');
      const previousDay = format(subDays(parseISO(examDate), 1), 'yyyy-MM-dd');
      let assignedCount = 0;

      // Create a list of eligible candidates for this exam, sorted by multiple criteria
      const candidates = invigilators
        .map((inv, index) => {
            const dutiesAssignedSoFar = assignments.reduce((count, asgn) => 
                asgn.invigilators.includes(inv.name) ? count + 1 : count, 0);
            const workedYesterday = invigilatorDayTracker.get(inv.name)?.has(previousDay) || false;
            return { inv, dutiesAssignedSoFar, workedYesterday, seniority: index };
        })
        .filter(({ inv, dutiesAssignedSoFar }) => {
            const invTotalDuties = invigilatorDutyCounts.get(inv.name) || 0;
            const hasDutyOnDay = invigilatorDayTracker.get(inv.name)?.has(examDate);
            const isPartTime = inv.availableDays && inv.availableDays.length > 0;
            const hasAvailability = !isPartTime || inv.availableDays?.includes(dayOfWeek);

            return dutiesAssignedSoFar < invTotalDuties && !hasDutyOnDay && hasAvailability;
        })
        .sort((a, b) => {
            // Primary sort: Prioritize those who did NOT work yesterday
            if (a.workedYesterday !== b.workedYesterday) {
                return a.workedYesterday ? 1 : -1;
            }
            // Secondary sort: Seniority (lower index is more senior)
            return a.seniority - b.seniority;
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
