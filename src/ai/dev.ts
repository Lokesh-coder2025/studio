import { config } from 'dotenv';
config();

import '@/ai/flows/generate-exam-descriptions.ts';
import '@/ai/flows/optimize-duty-assignments.ts';
import '@/ai/flows/send-email-flow.ts';
