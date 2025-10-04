
'use server';

/**
 * @fileOverview An AI flow for optimizing invigilator duty assignments.
 * This flow uses a Google AI model to generate a fair and balanced duty roster
 * based on invigilator seniority, availability, and examination requirements.
 *
 * - optimizeDutyAssignments - The main function to call the AI flow.
 * - OptimizeDutyAssignmentsInput - The Zod schema for the input.
 * - OptimizeDutyAssignmentsOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the flow, which details invigilators and exams.
const OptimizeDutyAssignmentsInputSchema = z.object({
  invigilators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      designation: z.string(),
      availableDays: z.array(z.string()).optional().describe("The days of the week the invigilator is available (e.g., ['Monday', 'Wednesday']). Empty or undefined means available full-time."),
    })
  ).describe('An array of all available invigilators, sorted by seniority (most senior first).'),
  examinations: z.array(
    z.object({
      date: z.string().describe('The date of the examination in YYYY-MM-DD format.'),
      subject: z.string(),
      time: z.string().describe('The time slot for the examination (e.g., "09:00 AM - 12:00 PM").'),
      invigilatorsNeeded: z.number().describe('The total number of invigilators required for this examination.'),
    })
  ).describe('An array of all examinations to be scheduled.'),
});
export type OptimizeDutyAssignmentsInput = z.infer<typeof OptimizeDutyAssignmentsInputSchema>;

// Define the output schema for the flow, which is the final assignment list.
const OptimizeDutyAssignmentsOutputSchema = z.array(
  z.object({
    date: z.string(),
    subject: z.string(),
    time: z.string(),
    invigilators: z.array(z.string()).describe('An array of names of the invigilators assigned to this examination.'),
  })
);
export type OptimizeDutyAssignmentsOutput = z.infer<typeof OptimizeDutyAssignmentsOutputSchema>;

// Define the Genkit prompt that instructs the AI model.
const dutyAllotmentPrompt = ai.definePrompt({
    name: 'dutyAllotmentPrompt',
    input: { schema: OptimizeDutyAssignmentsInputSchema },
    output: { schema: OptimizeDutyAssignmentsOutputSchema },
    prompt: `You are an expert in academic administration, specializing in creating fair and optimized invigilation duty schedules for examinations.

Your task is to assign invigilators to a series of examinations based on the following rules and data. The final output must be a valid JSON array matching the provided schema.

**Core Rules:**
1.  **Seniority Precedence:** The list of invigilators is provided in order of seniority (index 0 is the most senior). Seniors should generally be assigned fewer duties than their juniors.
2.  **Duty Distribution:** Duties must be distributed as evenly and fairly as possible. The total number of duties assigned to any two invigilators should not differ significantly, while still respecting seniority.
3.  **Availability is Key:**
    - Full-time invigilators (those with no 'availableDays' specified) are available for any exam.
    - Part-time invigilators MUST only be assigned duties on their specified 'availableDays'.
4.  **No Double Duty:** An invigilator cannot be assigned to more than one examination on the same day.
5.  **Meet Requirements:** Each examination must have the exact number of invigilators specified in 'invigilatorsNeeded'.
6.  **Avoid Back-to-Back Duties:** If possible, avoid assigning an invigilator duties on consecutive days to prevent burnout.

**Input Data:**
-   **Invigilators (sorted by seniority):**
    \`\`\`json
    {{{jsonStringify invigilators}}}
    \`\`\`
-   **Examinations:**
    \`\`\`json
    {{{jsonStringify examinations}}}
    \`\`\`

Based on this data and the rules above, generate the optimal duty assignments.
`,
});


// Define the Genkit flow that executes the prompt.
const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async (input) => {
    // Call the AI model with the formatted prompt and structured input.
    const { output } = await dutyAllotmentPrompt(input);
    
    // The model's output is already in the correct format, so we can return it directly.
    return output!;
  }
);

// This is the exported function that will be called from the application.
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
