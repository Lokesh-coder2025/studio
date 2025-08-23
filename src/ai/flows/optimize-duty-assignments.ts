
'use server';

/**
 * @fileOverview Optimizes duty assignments for invigilators, considering availability, subject constraints, and fairness.
 *
 * - optimizeDutyAssignments - A function that optimizes duty assignments.
 * - OptimizeDutyAssignmentsInput - The input type for the optimizeDutyAssignments function.
 * - OptimizeDutyAssignmentsOutput - The return type for the optimizeDutyAssignments function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format, parseISO, getDay, isAfter, parse as parseTime } from 'date-fns';

// Define the input schema for the flow
const OptimizeDutyAssignmentsInputSchema = z.object({
  invigilators: z.array(
    z.object({
      id: z.string(),
      name: z.string().describe('The name of the invigilator.'),
      designation: z.string().describe('The designation of the invigilator.'),
      availableDays: z.array(z.string()).optional().describe('An array of available weekdays (e.g., ["Monday", "Tuesday"]). If empty or null, the invigilator is considered full-time.'),
    })
  ).describe('An array of invigilators with their names, designations, and availability. The order of this list is critical for duty assignment.'),
  examinations: z.array(
    z.object({
      date: z.string().describe('The date of the examination.'),
      subject: z.string().describe('The subject of the examination.'),
      time: z.string().describe('The time of the examination.'),
      rooms: z.number().describe('The number of rooms allotted for the examination.'),
      invigilatorsNeeded: z.number().describe('The number of invigilators needed for the examination.'),
    })
  ).describe('An array of examinations with their dates, subjects, times, and invigilator requirements.'),
});

export type OptimizeDutyAssignmentsInput = z.infer<typeof OptimizeDutyAssignmentsInputSchema>;

// Define the output schema for the flow
const OptimizeDutyAssignmentsOutputSchema = z.array(
  z.object({
    date: z.string().describe('The date of the examination.'),
    subject: z.string().describe('The subject of the examination.'),
    time: z.string().describe('The time of the examination.'),
    invigilators: z.array(z.string()).describe('An array of invigilator names assigned to this examination.'),
  })
).describe('An array of duty assignments, each specifying the date, subject, time, and assigned invigilators.');

export type OptimizeDutyAssignmentsOutput = z.infer<typeof OptimizeDutyAssignmentsOutputSchema>;

// Helper to convert date to weekday name
const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const getWeekday = (dateString: string) => {
    return dayMapping[getDay(parseISO(dateString))];
};

/**
 * This function implements the duty allotment logic according to the specified rules.
 * It prioritizes fairness and respects seniority and availability constraints.
 */
function deterministicDutyAllocation(input: OptimizeDutyAssignmentsInput): OptimizeDutyAssignmentsOutput {
    // 1. Prepare invigilator roster, respecting the seniority order from the UI.
    const roster = input.invigilators.map((inv, index) => ({
      ...inv,
      isPartTime: !!(inv.availableDays && inv.availableDays.length > 0),
      dutiesAssigned: 0,
      assignedSlots: new Set<string>(), // Tracks "date|time" to prevent double booking on the same day.
    }));

    // 2. Create a flat list of all individual duty slots required for all exams.
    const allDutySlots: { date: string, subject: string, time: string, day: string, assignedTo: string | null }[] = [];
    input.examinations.forEach(exam => {
        for (let i = 0; i < exam.invigilatorsNeeded; i++) {
            allDutySlots.push({ 
                date: exam.date, 
                subject: exam.subject, 
                time: exam.time,
                day: getWeekday(exam.date),
                assignedTo: null
            });
        }
    });

    // 3. Round-robin distribution for fairness.
    let invigilatorIndex = 0;
    allDutySlots.forEach(slot => {
        let attempts = 0;
        let assigned = false;
        while(attempts < roster.length && !assigned) {
            const invigilator = roster[invigilatorIndex];
            const slotKey = `${slot.date}|${slot.time}`;

            // Availability check: day of the week
            const isAvailableOnDay = !invigilator.isPartTime || invigilator.availableDays!.includes(slot.day);
            
            // Double-duty check: Is invigilator already assigned to this exact date and time?
            const isAlreadyAssignedSlot = invigilator.assignedSlots.has(slotKey);

            if (isAvailableOnDay && !isAlreadyAssignedSlot) {
                slot.assignedTo = invigilator.name;
                invigilator.dutiesAssigned++;
                invigilator.assignedSlots.add(slotKey);
                assigned = true;
            }

            invigilatorIndex = (invigilatorIndex + 1) % roster.length;
            attempts++;
        }
    });

    // 4. Consolidate assignments into the final structure.
    const finalAssignments: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};
    allDutySlots.forEach(slot => {
        if(slot.assignedTo) {
            const examKey = `${slot.date}|${slot.subject}|${slot.time}`;
            if (!finalAssignments[examKey]) {
                finalAssignments[examKey] = {
                    date: slot.date,
                    subject: slot.subject,
                    time: slot.time,
                    invigilators: []
                };
            }
            finalAssignments[examKey].invigilators.push(slot.assignedTo);
        } else {
            console.warn(`Could not assign a duty for ${slot.subject} on ${slot.date} at ${slot.time}. There may be insufficient invigilators.`);
        }
    });

    return Object.values(finalAssignments);
}


const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async input => {
    // We call the deterministic function to ensure rules are strictly followed.
    const formattedInput = {
      ...input,
      examinations: input.examinations.map(exam => ({
        ...exam,
        date: format(parseISO(exam.date), 'yyyy-MM-dd')
      }))
    };
    return deterministicDutyAllocation(formattedInput);
  }
);

// Exported function to call the flow
export async function optimizeDutyAssignments(input: OptimizeDutyAssignmentsInput): Promise<OptimizeDutyAssignmentsOutput> {
  return optimizeDutyAssignmentsFlow(input);
}
