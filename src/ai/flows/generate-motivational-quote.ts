'use server';

/**
 * @fileOverview A flow for generating a motivational quote.
 *
 * - generateMotivationalQuote - A function that returns a short motivational quote.
 * - GenerateMotivationalQuoteInput - The input type for the function.
 * - GenerateMotivationalQuoteOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMotivationalQuoteInputSchema = z.object({
  name: z.string().describe('The name of the invigilator for whom the quote is intended.'),
});
export type GenerateMotivationalQuoteInput = z.infer<typeof GenerateMotivationalQuoteInputSchema>;

const GenerateMotivationalQuoteOutputSchema = z.object({
  quote: z.string().describe('A short, uplifting, and motivational quote for an educator.'),
});
export type GenerateMotivationalQuoteOutput = z.infer<typeof GenerateMotivationalQuoteOutputSchema>;

export async function generateMotivationalQuote(input: GenerateMotivationalQuoteInput): Promise<GenerateMotivationalQuoteOutput> {
  return generateMotivationalQuoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMotivationalQuotePrompt',
  input: {schema: GenerateMotivationalQuoteInputSchema},
  output: {schema: GenerateMotivationalQuoteOutputSchema},
  prompt: `You are a creative assistant. Generate a short, unique, and uplifting motivational quote suitable for an educator or invigilator named {{{name}}}. The quote should be inspiring and relevant to their role in ensuring a fair and smooth examination process. It should be one or two sentences long.`,
});

const generateMotivationalQuoteFlow = ai.defineFlow(
  {
    name: 'generateMotivationalQuoteFlow',
    inputSchema: GenerateMotivationalQuoteInputSchema,
    outputSchema: GenerateMotivationalQuoteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
