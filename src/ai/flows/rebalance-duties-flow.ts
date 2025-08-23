
'use server';

/**
 * @fileOverview Rebalances duties to ensure fairness based on seniority.
 *
 * - rebalanceDuties - A function that takes an existing allotment and optimizes it.
 * - RebalanceDutiesInput - The input type for the rebalanceDuties function.
 * - RebalanceDutiesOutput - The return type for the rebalanceDuties function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Invigilator, Assignment } from '@/types';

const InvigilatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string(),
  mobileNo: z.string(),
  email: z.string(),
  availableDays: z.array(z.string()).optional(),
});

const AssignmentSchema = z.object({
  date: z.string(),
  subject: z.string(),
  time: z.string(),
  invigilators: z.array(z.string()),
});

const RebalanceDutiesInputSchema = z.object({
  invigilators: z.array(InvigilatorSchema),
  assignments: z.array(AssignmentSchema),
});
export type RebalanceDutiesInput = z.infer<typeof RebalanceDutiesInputSchema>;

const RebalanceDutiesOutputSchema = z.array(AssignmentSchema);
export type RebalanceDutiesOutput = z.infer<typeof RebalanceDutiesOutputSchema>;

// Helper function to count duties for a given invigilator
const countDuties = (assignments: Assignment[], invigilatorName: string): number => {
    return assignments.reduce((count, assignment) => {
        if (assignment.invigilators.includes(invigilatorName)) {
            return count + 1;
        }
        return count;
    }, 0);
};

// Helper function to check if an invigilator is available for a given assignment
const isAvailable = (invigilator: Invigilator, assignment: Assignment, allAssignments: Assignment[]): boolean => {
    // Check if invigilator is already assigned to this exact slot
    if (assignment.invigilators.includes(invigilator.name)) {
        return false;
    }
    // Check for part-time availability
    if (invigilator.availableDays && invigilator.availableDays.length > 0) {
        const dayOfWeek = new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (!invigilator.availableDays.includes(dayOfWeek)) {
            return false;
        }
    }
    // Check if invigilator already has any other duty on that day.
    // This is a key rule for seniors but we apply it here for checking availability generally.
    const hasAnotherDutyOnDay = allAssignments.some(a => 
        a.date === assignment.date &&
        a.time !== assignment.time &&
        a.invigilators.includes(invigilator.name)
    );
    if(hasAnotherDutyOnDay) return false;

    return true;
};

const rebalanceDutiesFlow = ai.defineFlow(
  {
    name: 'rebalanceDutiesFlow',
    inputSchema: RebalanceDutiesInputSchema,
    outputSchema: RebalanceDutiesOutputSchema,
  },
  async ({ invigilators, assignments }) => {
    let rebalancedAssignments = JSON.parse(JSON.stringify(assignments));
    
    // We only rebalance between full-time invigilators to respect part-timer constraints
    const fullTimeInvigilators = invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);

    let swapsMade;
    const maxPasses = fullTimeInvigilators.length * fullTimeInvigilators.length; // Generous pass limit
    let passCount = 0;

    do {
      swapsMade = 0;
      // Iterate through seniors (i)
      for (let i = 0; i < fullTimeInvigilators.length; i++) {
        const senior = fullTimeInvigilators[i];
        
        // Compare with every junior (j)
        for (let j = i + 1; j < fullTimeInvigilators.length; j++) {
          const junior = fullTimeInvigilators[j];
          
          let seniorDutiesCount = countDuties(rebalancedAssignments, senior.name);
          let juniorDutiesCount = countDuties(rebalancedAssignments, junior.name);

          // Rule: Seniors must not be assigned more duties than juniors.
          if (seniorDutiesCount > juniorDutiesCount) {
            
            // Try to find a duty held by the senior that the junior can take
            for (const seniorAssignment of rebalancedAssignments) {
              // Is the senior in this assignment?
              if (seniorAssignment.invigilators.includes(senior.name)) {
                
                // Is the junior available and not already in this slot?
                const juniorIsAvailableForThisSlot = isAvailable(junior, seniorAssignment, rebalancedAssignments);

                if (juniorIsAvailableForThisSlot) {
                  // Perform the swap
                  // Remove senior from assignment
                  const seniorIndex = seniorAssignment.invigilators.indexOf(senior.name);
                  seniorAssignment.invigilators.splice(seniorIndex, 1);
                  // Add junior to assignment
                  seniorAssignment.invigilators.push(junior.name);

                  swapsMade++;
                  
                  // Duty counts have changed, so we break from the inner loops 
                  // to re-evaluate from the start of the current senior's comparisons.
                  break; 
                }
              }
            }
          }
          // If a swap was made, re-check counts for the current senior against subsequent juniors
          if (swapsMade > 0 && seniorDutiesCount > countDuties(rebalancedAssignments, junior.name)) {
             continue;
          }
        }
      }
      passCount++;
    } while (swapsMade > 0 && passCount < maxPasses);

    return rebalancedAssignments;
  }
);

export async function rebalanceDuties(input: RebalanceDutiesInput): Promise<RebalanceDutiesOutput> {
  return rebalanceDutiesFlow(input);
}
