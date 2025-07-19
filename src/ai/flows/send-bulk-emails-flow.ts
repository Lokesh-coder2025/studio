'use server';
/**
 * @fileOverview An AI flow for sending emails in bulk.
 *
 * - sendBulkEmails - A function that sends multiple emails with attachments.
 * - SendBulkEmailsInput - The input type for the sendBulkEmails function.
 * - SendBulkEmailsOutput - The return type for the sendBulkEmails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail, type SendEmailInput } from './send-email-flow';

const SendBulkEmailsInputSchema = z.array(z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  htmlBody: z.string().describe('The HTML body of the email.'),
  pdfBase64: z.string().describe('The PDF attachment encoded in Base64.'),
  pdfFileName: z.string().describe('The file name for the PDF attachment.'),
}));
export type SendBulkEmailsInput = z.infer<typeof SendBulkEmailsInputSchema>;

const SendBulkEmailsOutputSchema = z.object({
  totalEmails: z.number().describe('The total number of emails requested.'),
  successfulEmails: z.number().describe('The number of emails sent successfully.'),
  failedEmails: z.number().describe('The number of emails that failed to send.'),
  results: z.array(z.object({
      to: z.string(),
      success: z.boolean(),
      message: z.string(),
  })),
});
export type SendBulkEmailsOutput = z.infer<typeof SendBulkEmailsOutputSchema>;


const sendBulkEmailsFlow = ai.defineFlow(
  {
    name: 'sendBulkEmailsFlow',
    inputSchema: SendBulkEmailsInputSchema,
    outputSchema: SendBulkEmailsOutputSchema,
  },
  async (emails) => {
    let successfulEmails = 0;
    let failedEmails = 0;
    
    const emailPromises = emails.map(emailInput => sendEmail(emailInput as SendEmailInput));
    
    const results = await Promise.all(emailPromises);

    const detailedResults = results.map((result, index) => {
        if(result.success) {
            successfulEmails++;
        } else {
            failedEmails++;
        }
        return {
            to: emails[index].to,
            success: result.success,
            message: result.message
        };
    });

    return {
      totalEmails: emails.length,
      successfulEmails,
      failedEmails,
      results: detailedResults,
    };
  }
);


export async function sendBulkEmails(input: SendBulkEmailsInput): Promise<SendBulkEmailsOutput> {
  return sendBulkEmailsFlow(input);
}
