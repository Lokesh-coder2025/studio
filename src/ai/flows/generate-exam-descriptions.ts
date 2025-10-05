'use server';

/**
 * @fileOverview Exam description generation flow.
 *
 * - generateExamDescriptions - A function that generates exam descriptions based on the subject name and syllabus.
 * - GenerateExamDescriptionsInput - The input type for the generateExamDescriptions function.
 * - GenerateExamDescriptionsOutput - The return type for the generateExamDescriptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateExamDescriptionsInputSchema = z.object({
  subjectName: z.string().describe('The name of the subject for the exam.'),
  syllabus: z.string().describe('The syllabus of the subject.'),
});
export type GenerateExamDescriptionsInput = z.infer<typeof GenerateExamDescriptionsInputSchema>;

const GenerateExamDescriptionsOutputSchema = z.object({
  description: z.string().describe('A concise and engaging description of the exam.'),
  progress: z.string().describe('Progress of the description generation.'),
});
export type GenerateExamDescriptionsOutput = z.infer<typeof GenerateExamDescriptionsOutputSchema>;

export async function generateExamDescriptions(input: GenerateExamDescriptionsInput): Promise<GenerateExamDescriptionsOutput> {
  return generateExamDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExamDescriptionsPrompt',
  input: {schema: GenerateExamDescriptionsInputSchema},
  output: {schema: GenerateExamDescriptionsOutputSchema},
  prompt: `You are an expert in creating exam descriptions for invigilators.

  Based on the subject name and syllabus, create a concise and engaging exam description.

  Subject Name: {{{subjectName}}}
  Syllabus: {{{syllabus}}}
  
  Description:`, 
});

const generateExamDescriptionsFlow = ai.defineFlow(
  {
    name: 'generateExamDescriptionsFlow',
    inputSchema: GenerateExamDescriptionsInputSchema,
    outputSchema: GenerateExamDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      ...output!,
      progress: 'Generated a concise exam description based on the subject name and syllabus.',
    };
  }
);
