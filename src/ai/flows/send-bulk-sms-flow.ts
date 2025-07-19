'use server';
/**
 * @fileOverview An AI flow for sending SMS messages in bulk.
 *
 * - sendBulkSms - A function that sends multiple SMS messages.
 * - SendBulkSmsInput - The input type for the sendBulkSms function.
 * - SendBulkSmsOutput - The return type for the sendBulkSms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendSms, type SendSmsInput } from './send-sms-flow';

const SendBulkSmsInputSchema = z.array(z.object({
  to: z.string().describe('The recipient mobile number.'),
  body: z.string().describe('The body of the SMS message.'),
}));
export type SendBulkSmsInput = z.infer<typeof SendBulkSmsInputSchema>;

const SendBulkSmsOutputSchema = z.object({
  totalSms: z.number().describe('The total number of SMS messages requested.'),
  successfulSms: z.number().describe('The number of SMS messages sent successfully.'),
  failedSms: z.number().describe('The number of SMS messages that failed to send.'),
  results: z.array(z.object({
      to: z.string(),
      success: z.boolean(),
      message: z.string(),
  })),
});
export type SendBulkSmsOutput = z.infer<typeof SendBulkSmsOutputSchema>;


const sendBulkSmsFlow = ai.defineFlow(
  {
    name: 'sendBulkSmsFlow',
    inputSchema: SendBulkSmsInputSchema,
    outputSchema: SendBulkSmsOutputSchema,
  },
  async (messages) => {
    let successfulSms = 0;
    let failedSms = 0;
    
    const smsPromises = messages.map(smsInput => sendSms(smsInput as SendSmsInput));
    
    const results = await Promise.all(smsPromises);

    const detailedResults = results.map((result, index) => {
        if(result.success) {
            successfulSms++;
        } else {
            failedSms++;
        }
        return {
            to: messages[index].to,
            success: result.success,
            message: result.message
        };
    });

    return {
      totalSms: messages.length,
      successfulSms,
      failedSms,
      results: detailedResults,
    };
  }
);


export async function sendBulkSms(input: SendBulkSmsInput): Promise<SendBulkSmsOutput> {
  return sendBulkSmsFlow(input);
}
