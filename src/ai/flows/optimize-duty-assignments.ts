
'use server';

/**
 * @fileOverview Optimizes duty assignments for invigilators, considering availability, subject constraints, and fairness.
 *
 * - optimizeDutyAssignments - A function that optimizes duty assignments.
 * - OptimizeDutyAssignmentsInput - The input type for the optimizeDutyAssignments function.
 * - OptimizeDutyAssignmentsOutput - The return type for the optimizeDutyAssignments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const OptimizeDutyAssignmentsInputSchema = z.object({
  invigilators: z.array(
    z.object({
      name: z.string().describe('The name of the invigilator.'),
      designation: z.string().describe('The designation of the invigilator.'),
      duties: z.array(z.object({
        date: z.string().describe('The date of the duty.'),
        subject: z.string().describe('The subject of the duty.'),
      })).optional(),
    })
  ).describe('An array of invigilators with their names, designations, and existing duties. The order of this list is critical for duty assignment.'),
  examinations: z.array(
    z.object({
      date: z.string().describe('The date of the examination.'),
      subject: z.string().describe('The subject of the examination.'),
      time: z.string().describe('The time of the examination.'),
      rooms: z.number().describe('The number of rooms allotted for the examination.'),
      invigilatorsNeeded: z.number().describe('The number of invigilators needed for the examination.'),
    })
  ).describe('An array of examinations with their dates, subjects, times, and invigilator requirements.'),
});

export type OptimizeDutyAssignmentsInput = z.infer<typeof OptimizeDutyAssignmentsInputSchema>;

// Define the output schema for the flow
const OptimizeDutyAssignmentsOutputSchema = z.array(
  z.object({
    date: z.string().describe('The date of the examination.'),
    subject: z.string().describe('The subject of the examination.'),
    time: z.string().describe('The time of the examination.'),
    invigilators: z.array(z.string()).describe('An array of invigilator names assigned to this examination.'),
  })
).describe('An array of duty assignments, each specifying the date, subject, time, and assigned invigilators.');

export type OptimizeDutyAssignmentsOutput = z.infer<typeof OptimizeDutyAssignmentsOutputSchema>;


// Define the prompt for optimizing duty assignments
const optimizeDutyAssignmentsPrompt = ai.definePrompt({
  name: 'optimizeDutyAssignmentsPrompt',
  input: { schema: OptimizeDutyAssignmentsInputSchema },
  output: { schema: OptimizeDutyAssignmentsOutputSchema },
  system: `You are an expert at creating fair and optimized invigilation duty schedules. Your task is to generate duty assignments based on a list of invigilators and examinations. You must produce a valid JSON array matching the output schema.`,
  prompt: `Please generate a duty schedule by following these steps and rules precisely. The order of the rules signifies their priority.

**Primary Goal: Fulfill All Examination Duties**
Your main objective is to ensure every single examination has the exact number of invigilators specified by 'invigilatorsNeeded'. This is a hard, non-negotiable requirement.

**Core Allotment Rule: Strict Bottom-to-Top Assignment**
You must allot all duties using a single, continuous method. Start from the **last person** on the invigilator list and assign them a duty. Then, move to the second-to-last person, then the third-to-last, and so on, ascending up the list. Once you reach the first person, cycle back to the last person and repeat the process until all duty slots for all exams are filled.

- The invigilator list order is critical. Do not deviate from it.
- This bottom-to-top cycle is the *only* method you should use for assignment. Do not use any other logic like "base" or "excess" duties.
- This process ensures that invigilators at the bottom of the list will always have an equal or greater number of duties than those at the top.

**Secondary Preferences (Apply only if they DO NOT conflict with the core rules)**
1.  **Fair Double Duty Distribution:** If an invigilator must be assigned two duties on the same day, try to distribute this load across different invigilators over the course of the full schedule. Do not break the bottom-to-top rule to achieve this.
2.  **Avoid Subject Conflicts:** As a final, lowest-priority preference, try to avoid assigning an invigilator to an exam for a subject they teach.

**Input Data:**

Invigilators (The order is critical for the bottom-to-top rule):
{{#each invigilators}}
- Name: {{this.name}}, Designation: {{this.designation}}
{{/each}}

Examinations:
{{#each examinations}}
- Date: {{this.date}}, Subject: {{this.subject}}, Time: {{this.time}}, Invigilators Needed: {{this.invigilatorsNeeded}}
{{/each}}

Generate the complete and optimized list of duty assignments based on these rules.`, 
});

// Define the flow for optimizing duty assignments
const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async input => {
    const { output } = await optimizeDutyAssignmentsPrompt(input);
    return output!;
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
