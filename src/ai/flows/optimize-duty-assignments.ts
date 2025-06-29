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
  prompt: `You are an expert at creating fair and optimized invigilation duty schedules. Given the list of invigilators and examinations, generate the duty assignments by adhering to the following rules in order of priority:

**1. Hard Constraints:**
- Each examination must have the exact number of invigilators specified by 'invigilatorsNeeded'.
- An invigilator cannot be assigned to more than one exam on the same day. You must ensure you do not assign the same invigilator to two different exams on the same day within the generated schedule.

**2. Duty Distribution Principles:**
- **Primary Goal:** Distribute the total number of duties as equally as possible among all available invigilators.
- **Handling Excess Duties:** After an even distribution, if there are remaining duties to be assigned, allocate them one by one to invigilators starting from the **bottom** of the provided list and moving upwards. For example, if there are 2 extra duties, the last invigilator on the list gets one, and the second-to-last gets the other.

**3. Assignment Preferences (Soft Constraints):**
- **Subject Conflict Avoidance:** It is highly preferred to avoid assigning an invigilator to an exam for a subject they teach. You can infer their subject from their 'designation' (e.g., a "Lecturer in English" teaches "English"). Only violate this preference if it is absolutely necessary to fulfill the hard constraints.

Invigilators (The order is important for handling excess duties):
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
