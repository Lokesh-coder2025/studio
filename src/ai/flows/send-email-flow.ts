'use server';
/**
 * @fileOverview An AI flow for sending emails with attachments.
 *
 * - sendEmail - A function that sends an email.
 * - SendEmailInput - The input type for the sendEmail function.
 * - SendEmailOutput - The return type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  htmlBody: z.string().describe('The HTML body of the email.'),
  pdfBase64: z.string().describe('The PDF attachment encoded in Base64.'),
  pdfFileName: z.string().describe('The file name for the PDF attachment.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

const SendEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  message: z.string().describe('A message indicating the result of the operation.'),
});
export type SendEmailOutput = z.infer<typeof SendEmailOutputSchema>;


// This is a placeholder for a real email sending service.
// In a real application, you would configure this with your email provider's credentials.
// For this example, we'll use a test account from Ethereal.email.
async function sendEmailWithNodemailer(input: SendEmailInput): Promise<SendEmailOutput> {
  try {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    const mailOptions = {
        from: '"DutyFlow" <noreply@dutyflow.com>',
        to: input.to,
        subject: input.subject,
        html: input.htmlBody,
        attachments: [
            {
                filename: input.pdfFileName,
                content: input.pdfBase64,
                encoding: 'base64',
                contentType: 'application/pdf',
            },
        ],
    };

    let info = await transporter.sendMail(mailOptions);

    const successMessage = `Email sent successfully. Preview URL: ${nodemailer.getTestMessageUrl(info)}`;
    console.log(successMessage);
    
    return {
      success: true,
      message: successMessage,
    };

  } catch (error) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { 
        success: false, 
        message: `Failed to send email: ${errorMessage}` 
    };
  }
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: SendEmailOutputSchema,
  },
  async (input) => {
    // In a real-world scenario, you might add more logic here,
    // like logging, validation, or using a more robust email service.
    return await sendEmailWithNodemailer(input);
  }
);


export async function sendEmail(input: SendEmailInput): Promise<SendEmailOutput> {
  return sendEmailFlow(input);
}
