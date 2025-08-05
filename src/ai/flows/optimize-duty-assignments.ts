
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
import { format, parseISO, getDay } from 'date-fns';

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
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    return dayMapping[getDay(parseISO(dateString))];
};

/**
 * This function directly implements the duty allotment logic without using an AI prompt.
 * This ensures that the complex, rule-based allocation is performed predictably and accurately.
 * The logic is based on a weighted distribution to ensure fairness between full-time and part-time staff.
 */
function deterministicDutyAllocation(input: OptimizeDutyAssignmentsInput): OptimizeDutyAssignmentsOutput {
    // 1. Create a flat list of all duty slots that need to be filled, sorted by date.
    let dutySlots: { date: string, subject: string, time: string, day: string }[] = [];
    input.examinations.forEach(exam => {
        for (let i = 0; i < exam.invigilatorsNeeded; i++) {
            dutySlots.push({ 
                date: exam.date, 
                subject: exam.subject, 
                time: exam.time,
                day: getWeekday(exam.date), 
            });
        }
    });
    dutySlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Prepare invigilator roster.
    // Full-time invigilators get a weight of 2, part-time get a weight of 1.
    const roster = input.invigilators.map(inv => ({
      ...inv,
      isPartTime: inv.availableDays && inv.availableDays.length > 0,
      dutiesAssigned: 0,
      // Track assigned slots to prevent double-booking on the same day/time
      assignedSlots: new Set<string>(), 
    })).reverse(); // Reverse to match the last-in, first-out order from the UI.

    const finalAssignments: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};

    // 3. Assign duties slot by slot using a round-robin approach.
    let rosterIndex = 0;
    for (const slot of dutySlots) {
        let assigned = false;
        let attempts = 0;

        while (!assigned && attempts < roster.length) {
            const invigilator = roster[rosterIndex];
            
            // Check availability:
            // 1. Is the invigilator available on this weekday? (Full-timers are always available)
            const isAvailableOnDay = !invigilator.isPartTime || (invigilator.availableDays && invigilator.availableDays.includes(slot.day));
            // 2. Is the invigilator already assigned a duty on this exact date and time?
            const slotKey = `${slot.date}|${slot.time}`;
            const isAlreadyAssignedSlot = invigilator.assignedSlots.has(slotKey);

            if (isAvailableOnDay && !isAlreadyAssignedSlot) {
                const examKey = `${slot.date}|${slot.subject}|${slot.time}`;
                if (!finalAssignments[examKey]) {
                    finalAssignments[examKey] = {
                        date: slot.date,
                        subject: slot.subject,
                        time: slot.time,
                        invigilators: []
                    };
                }
                finalAssignments[examKey].invigilators.push(invigilator.name);
                
                // Update tracking for the invigilator
                invigilator.dutiesAssigned++;
                invigilator.assignedSlots.add(slotKey);
                
                assigned = true;

                // Sort the roster after each full round to maintain fairness
                // This prioritizes those with fewer duties, then full-timers
                if(rosterIndex === roster.length -1) {
                  roster.sort((a, b) => {
                      if (a.dutiesAssigned !== b.dutiesAssigned) {
                          return a.dutiesAssigned - b.dutiesAssigned;
                      }
                      // isPartTime is boolean, so false (full-timer) comes before true (part-timer)
                      return (a.isPartTime ? 1 : 0) - (b.isPartTime ? 1 : 0);
                  });
                }
            }
            
            // Move to the next invigilator for the next slot
            rosterIndex = (rosterIndex + 1) % roster.length;
            attempts++;
        }
        
        if (!assigned) {
           console.warn(`Could not find an available invigilator for a duty on ${slot.date} at ${slot.time}. All available invigilators may already be assigned for that time slot.`);
           // Fallback logic can be added here if necessary, e.g., assign to the least-burdened available person even if it breaks secondary rules.
        }
    }

    return Object.values(finalAssignments);
}


const optimizeDutyAssignmentsFlow = ai.defineFlow(
  {
    name: 'optimizeDutyAssignmentsFlow',
    inputSchema: OptimizeDutyAssignmentsInputSchema,
    outputSchema: OptimizeDutyAssignmentsOutputSchema,
  },
  async input => {
    // We now call the deterministic function instead of an AI prompt.
    // This ensures rules are strictly followed.
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
