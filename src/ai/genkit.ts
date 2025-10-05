/**
 * @fileoverview This file initializes the Genkit AI platform with the Google AI plugin.
 * It configures the AI model to be used throughout the application, ensuring a single
 * point of configuration for all AI-powered features.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Set a default model for all flows.
  model: 'gemini-1.5-flash',
});
