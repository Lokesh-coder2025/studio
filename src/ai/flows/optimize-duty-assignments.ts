
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

// Define the tool to check invigilator availability for pre-existing duties
const checkInvigilatorAvailability = ai.defineTool({
  name: 'checkInvigilatorAvailability',
  description: 'Checks if an invigilator has a pre-existing duty on a given date from the input.',
  inputSchema: z.object({
    invigilatorName: z.string().describe('The name of the invigilator to check.'),
    date: z.string().describe('The date to check for availability.'),
  }),
  outputSchema: z.boolean().describe('True if the invigilator is available (no pre-existing duty), false otherwise.'),
}, async (input) => {
  const { invigilatorName, date } = input;
  const invigilator = allInvigilators.find(i => i.name === invigilatorName);
  if (invigilator?.duties?.some(duty => duty.date === date)) {
    return false;
  }
  return true;
});

let allInvigilators: OptimizeDutyAssignmentsInput['invigilators'] = [];

// Define the prompt for optimizing duty assignments
const optimizeDutyAssignmentsPrompt = ai.definePrompt({
  name: 'optimizeDutyAssignmentsPrompt',
  input: { schema: OptimizeDutyAssignmentsInputSchema },
  output: { schema: OptimizeDutyAssignmentsOutputSchema },
  tools: [checkInvigilatorAvailability],
  system: `You are an expert at creating fair and optimized invigilation duty schedules. Your task is to generate duty assignments based on a list of invigilators and examinations. You must produce a valid JSON array matching the output schema.`,
  prompt: `Please generate a duty schedule by following these steps and rules precisely:

**Step 1: Calculate Total Duties and Distribution**
1.  Calculate the total number of duties required. This is the sum of 'invigilatorsNeeded' for all examinations.
2.  Calculate the base number of duties per invigilator by performing integer division of total duties by the number of invigilators.
3.  Calculate the number of excess duties, which is the remainder from the division.

**Step 2: Assign Duties based on Strict Rules**
You must generate a duty schedule that adheres to the following rules, in this exact order of priority:

**Rule 1: Fulfill Examination Needs (Hard Constraint)**
- Every examination must have exactly the number of invigilators specified by 'invigilatorsNeeded'.

**Rule 2: No Same-Day Double Duty (Hard Constraint)**
- An invigilator CANNOT be assigned to more than one examination on the same day.

**Rule 3: Equal Distribution (Primary Goal)**
- Distribute duties so that most invigilators have the base number of duties calculated in Step 1.

**Rule 4: Assign Excess Duties Hierarchically (Strict Order)**
- Assign the excess duties one by one to invigilators starting from the **VERY END** of the provided invigilator list and moving upwards. For example, if there are 3 excess duties and 10 invigilators, invigilator #10 gets an extra duty, invigilator #9 gets an extra duty, and invigilator #8 gets an extra duty. This means the lecturers at the top of the list will have fewer duties than the lecturers at the bottom. The order of the invigilator list provided below is crucial for this rule.

**Rule 5: Avoid Subject Conflicts (Soft Constraint / Preference)**
- As a preference, AVOID assigning an invigilator to an exam for a subject they teach. You can infer their subject from their 'designation' (e.g., a "Lecturer in English" teaches "English").
- You should only break this rule if it is absolutely necessary to meet the hard constraints (Rules 1 and 2) and distribution principles (Rules 3 and 4).

**Input Data:**

Invigilators (The order is important for Rule 4):
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
    allInvigilators = input.invigilators;
    const { output } = await optimizeDutyAssignmentsPrompt(input);
    return output!;
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
