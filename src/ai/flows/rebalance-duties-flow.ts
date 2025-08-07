
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
const isAvailable = (invigilator: Invigilator, assignment: Assignment): boolean => {
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
    const fullTimeInvigilators = invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);

    // Using a loop to allow for multiple passes if necessary.
    // A single pass might not resolve all imbalances if swaps are constrained.
    let swapsMade;
    let passCount = 0;
    const maxPasses = 5; // To prevent infinite loops

    do {
      swapsMade = 0;
      // Iterate through seniors
      for (let i = 0; i < fullTimeInvigilators.length - 1; i++) {
        const senior = fullTimeInvigilators[i];
        
        // Compare with every junior
        for (let j = i + 1; j < fullTimeInvigilators.length; j++) {
          const junior = fullTimeInvigilators[j];
          
          let seniorDutiesCount = countDuties(rebalancedAssignments, senior.name);
          let juniorDutiesCount = countDuties(rebalancedAssignments, junior.name);

          // If senior has more duties than junior, try to swap
          if (seniorDutiesCount > juniorDutiesCount) {
            
            // Find a duty held by the senior that the junior can take
            for (const seniorAssignment of rebalancedAssignments) {
              if (seniorAssignment.invigilators.includes(senior.name)) {
                // Check if junior is available and not already assigned to that slot
                const juniorIsAvailable = isAvailable(junior, seniorAssignment) && 
                                           !rebalancedAssignments.find(a => 
                                               a.date === seniorAssignment.date && 
                                               a.time === seniorAssignment.time && 
                                               a.invigilators.includes(junior.name));

                if (juniorIsAvailable) {
                  // Perform the swap
                  seniorAssignment.invigilators = seniorAssignment.invigilators.filter(name => name !== senior.name);
                  seniorAssignment.invigilators.push(junior.name);

                  // Update counts and mark that a swap was made
                  seniorDutiesCount--;
                  juniorDutiesCount++;
                  swapsMade++;
                  
                  // Break from this loop to re-evaluate counts as they've changed
                  break;
                }
              }
            }
          }
          // If a swap was made, we need to restart the comparison for the current senior
          if (seniorDutiesCount <= juniorDutiesCount) {
             continue; // Move to the next junior
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
