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
  // No input is needed for a general quote.
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
  prompt: `You are a creative assistant. Generate a short, unique, and uplifting motivational quote. The quote should be inspiring and general in nature, suitable for an educator. It can be about life, education, or personal growth. It should be one or two sentences long.`,
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
