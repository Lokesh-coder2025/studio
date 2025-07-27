
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
  ).describe('An array of invigilators with their names, designations, and existing duties. The order is important for handling excess duties.'),
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

**Step 1: Calculate Total Duties and Distribution**
1.  Calculate the total number of duties required. This is the sum of 'invigilatorsNeeded' for all examinations.
2.  Calculate the base number of duties per invigilator by performing integer division of total duties by the number of invigilators.
3.  Calculate the number of excess duties, which is the remainder from the division.

**Step 2: Assign Duties based on a Strict Hierarchy of Rules**

**Rule 1: Fulfill Examination Needs (Hard Constraint - HIGHEST PRIORITY)**
- Every examination *must* have exactly the number of invigilators specified by 'invigilatorsNeeded'. This is the most important rule.

**Rule 2: Enforce Hierarchical Duty Assignment (Hard Constraint - CRITICAL PRIORITY)**
- After ensuring Rule 1 is met, you *must* distribute duties according to a strict hierarchical model.
- First, ensure every invigilator is assigned the 'base number' of duties calculated in Step 1.
- Then, assign the 'excess duties' one by one, starting from the **VERY END** of the provided invigilator list and moving upwards without skipping anyone. For example, if there are 3 excess duties, the last invigilator on the list gets one, the second-to-last gets one, and the third-to-last gets one.
- The order of the invigilator list provided below is absolutely critical for this rule. This rule takes precedence over all fairness considerations below.

**Rule 3: Fairly Distribute Same-Day Double Duties (Preference)**
- *Only after* the above two hard constraints have been perfectly satisfied, try to distribute any necessary same-day double duties as fairly as possible across all invigilators. Do not break Rule 2 to satisfy this preference.

**Rule 4: Avoid Subject Conflicts (Soft Constraint / Final Preference)**
- As a final preference, try to avoid assigning an invigilator to an exam for a subject they teach (e.g., a "Lecturer in English" for an "English" exam).
- This is the lowest priority rule. You should only follow it if it does not conflict with Rules 1, 2, or 3.

**Input Data:**

Invigilators (The order is important for Rule 2):
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
