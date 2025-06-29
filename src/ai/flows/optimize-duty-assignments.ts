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
  ).describe('An array of invigilators with their names, designations, and existing duties.'),
  examinations: z.array(
    z.object({
      date: z.string().describe('The date of the examination.'),
      subject: z.string().describe('The subject of the examination.'),
      time: z.string().describe('The time of the examination.'),
      rooms: z.number().describe('The number of rooms allotted for the examination.'),
      invigilatorsNeeded: z.number().describe('The number of invigilators needed for the examination.'),
      relieversNeeded: z.number().describe('The number of relievers needed for the examination.'),
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

// Define the tool to check invigilator availability
const checkInvigilatorAvailability = ai.defineTool({
  name: 'checkInvigilatorAvailability',
  description: 'Checks if an invigilator is available on a given date and time, considering their existing duties and subject constraints.',
  inputSchema: z.object({
    invigilatorName: z.string().describe('The name of the invigilator to check.'),
    date: z.string().describe('The date to check for availability.'),
    subject: z.string().describe('The subject of the examination.'),
    designation: z.string().describe('The designation of the invigilator.'),
  }),
  outputSchema: z.boolean().describe('True if the invigilator is available, false otherwise.'),
}, async (input) => {
  // Implement the logic to check invigilator availability based on the input
  // This will involve checking their existing duties and subject constraints
  const { invigilatorName, date, subject, designation } = input;

  // Check if the invigilator has a duty on the same date
  const invigilator = allInvigilators.find(i => i.name === invigilatorName);
  if (invigilator?.duties?.some(duty => duty.date === date)) {
    return false;
  }

  // Check if the invigilator's designation includes the subject of the exam
    if (designation.toLowerCase().includes(subject.toLowerCase())) {
        return false; // Invigilator should not be assigned to their own subject
    }

  // If no conflicts, the invigilator is available
  return true;
});

let allInvigilators: OptimizeDutyAssignmentsInput['invigilators'] = [];

// Define the prompt for optimizing duty assignments
const optimizeDutyAssignmentsPrompt = ai.definePrompt({
  name: 'optimizeDutyAssignmentsPrompt',
  input: { schema: OptimizeDutyAssignmentsInputSchema },
  output: { schema: OptimizeDutyAssignmentsOutputSchema },
  tools: [checkInvigilatorAvailability],
  prompt: `Given the list of invigilators and examinations, optimize the duty assignments considering the following constraints:

- Distribute duties as equally as possible among invigilators.
- Avoid assigning teachers to invigilate exams of their own subject (based on designation keyword match).
- Ensure that each examination has the required number of invigilators and relievers.
- Use the checkInvigilatorAvailability tool to check the availability of each invigilator before assigning them a duty.

Invigilators:
{{#each invigilators}}
- Name: {{this.name}}, Designation: {{this.designation}}, Existing Duties: {{this.duties}}
{{/each}}

Examinations:
{{#each examinations}}
- Date: {{this.date}}, Subject: {{this.subject}}, Time: {{this.time}}, Rooms: {{this.rooms}}, Invigilators Needed: {{this.invigilatorsNeeded}}, Relievers Needed: {{this.relieversNeeded}}
{{/each}}

Output the optimized duty assignments in the following format:
[
  {
    "date": "date of the examination",
    "subject": "subject of the examination",
    "time": "time of the examination",
    "invigilators": ["array of invigilator names assigned to this examination"]
  },
  ...
]

Consider all the constraints and use the tool to provide the best possible duty assignments.`, 
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
