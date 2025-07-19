'use server';
/**
 * @fileOverview An AI flow for sending an SMS message.
 *
 * - sendSms - A function that sends an SMS.
 * - SendSmsInput - The input type for the sendSms function.
 * - SendSmsOutput - The return type for the sendSms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Twilio from 'twilio';

const SendSmsInputSchema = z.object({
  to: z.string().describe('The recipient mobile number, including country code (e.g., +1234567890).'),
  body: z.string().describe('The text of the SMS message.'),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  success: z.boolean().describe('Whether the SMS was sent successfully.'),
  message: z.string().describe('A message indicating the result of the operation.'),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;


async function sendSmsWithTwilio(input: SendSmsInput): Promise<SendSmsOutput> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    const errorMessage = "Twilio credentials are not configured in .env file.";
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const message = await client.messages.create({
      body: input.body,
      from: TWILIO_PHONE_NUMBER,
      to: input.to,
    });

    const successMessage = `SMS sent successfully to ${input.to}. SID: ${message.sid}`;
    console.log(successMessage);
    
    return {
      success: true,
      message: successMessage,
    };

  } catch (error) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { 
        success: false, 
        message: `Failed to send SMS: ${errorMessage}` 
    };
  }
}

const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
    outputSchema: SendSmsOutputSchema,
  },
  async (input) => {
    return await sendSmsWithTwilio(input);
  }
);


export async function sendSms(input: SendSmsInput): Promise<SendSmsOutput> {
  return sendSmsFlow(input);
}
