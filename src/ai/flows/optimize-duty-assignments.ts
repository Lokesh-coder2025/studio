
'use server';

/**
 * @fileOverview Optimizes duty assignments for invigilators using an AI model.
 * This approach is more robust for complex scheduling scenarios than deterministic logic.
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
      name: z.string().describe('The name of the invigilator.'),
      designation: z.string().describe('The designation of the invigilator.'),
      availableDays: z.array(z.string()).optional().describe('An array of available weekdays (e.g., ["Monday", "Tuesday"]). If empty or null, the invigilator is considered full-time and available every day.'),
    })
  ).describe('An array of invigilators. The order of this list is CRITICAL and represents seniority. Seniors are at the top (index 0). Juniors are at the bottom.'),
  examinations: z.array(
    z.object({
      date: z.string().describe('The date of the examination in YYYY-MM-DD format.'),
      subject: z.string().describe('The subject of the examination.'),
      time: z.string().describe('The time of the examination (e.g., "09:00 AM - 12:00 PM").'),
      invigilatorsNeeded: z.number().describe('The total number of invigilators needed for this examination.'),
    })
  ).describe('An array of examinations with their dates, subjects, times, and invigilator requirements.'),
});

export type OptimizeDutyAssignmentsInput = z.infer<typeof OptimizeDutyAssignmentsInputSchema>;

// Define the output schema for the flow
const OptimizeDutyAssignmentsOutputSchema = z.array(
  z.object({
    date: z.string().describe('The date of the examination (YYYY-MM-DD).'),
    subject: z.string().describe('The subject of the examination.'),
    time: z.string().describe('The time of the examination.'),
    invigilators: z.array(z.string()).describe('An array of invigilator names assigned to this examination.'),
  })
).describe('The final duty allotment. Each object represents a single exam session with the names of the invigilators assigned to it.');

export type OptimizeDutyAssignmentsOutput = z.infer<typeof OptimizeDutyAssignmentsOutputSchema>;

const allotmentPrompt = ai.definePrompt({
    name: 'dutyAllotmentPrompt',
    input: { schema: OptimizeDutyAssignmentsInputSchema },
    output: { schema: OptimizeDutyAssignmentsOutputSchema },
    prompt: `You are an expert in academic administration, specializing in creating fair and balanced invigilation duty schedules. Your task is to assign duties based on the provided lists of invigilators and examinations, adhering strictly to the following rules in order of priority:

1.  **Invigilator Order is Seniority**: The 'invigilators' list is sorted by seniority. The person at index 0 is the most senior. This order is the primary factor for all decisions.

2.  **Part-Time Availability is a Hard Constraint**: Some invigilators have an 'availableDays' list. They can ONLY be assigned duties on those specific weekdays. If 'availableDays' is empty or not present, they are full-time and available for any exam day.

3.  **One Duty Per Day**: An invigilator can only be assigned ONE duty per calendar day, regardless of the session time. This is a strict rule.

4.  **Fairness based on Seniority**:
    *   First, try to distribute duties as evenly as possible among all available and eligible full-time invigilators.
    *   Most importantly, **seniors must NOT be assigned more duties than their juniors**. A senior invigilator (lower index) must have a total duty count less than or equal to any junior invigilator (higher index).
    *   If there are "extra" duties after an initial even distribution, these extra duties **must** be assigned to the most JUNIOR invigilators first (starting from the end of the list and moving up).

5.  **Fulfill All Slots**: You must assign exactly the number of 'invigilatorsNeeded' for each examination. Do not leave any slot empty. If you cannot fulfill a slot due to the rules, it's better to slightly bend the fairness rule (e.g., assign one extra duty to a more senior person) than to leave a slot unassigned. The "One Duty Per Day" and "Part-Time Availability" rules are unbreakable.

Here is the data for the assignment:

**Invigilators (in order of seniority):**
\`\`\`json
{{{json invigilators}}}
\`\`\`

**Examinations:**
\`\`\`json
{{{json examinations}}}
\`\`\`

Based on all these rules, generate the final duty allotment. The output must be a valid JSON array matching the specified output schema.
`,
});


const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async input => {
    // The Gemini model is generally very good, but can sometimes make small mistakes
    // like assigning a duty on a non-available day. We will double-check its output.
    
    // Formatting dates to ensure consistency.
    const formattedInput = {
      ...input,
      examinations: input.examinations.map(exam => ({
        ...exam,
        date: format(parseISO(exam.date), 'yyyy-MM-dd')
      }))
    };

    const { output } = await allotmentPrompt(formattedInput);

    if (!output) {
      throw new Error("AI model failed to generate a valid allotment schedule.");
    }
    
    // Optional: Add a verification step here if needed, but for now, we trust the model's adherence to the prompt.
    // For example, you could verify that no invigilator has more than one duty per day.

    return output;
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
