
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

const getSessionNumber = (timeString: string) => {
    try {
        const startTimeStr = timeString.split(' - ')[0];
        const startTime = parseTime(startTimeStr, 'hh:mm a', new Date());
        return isAfter(startTime, parseTime('12:00 PM', 'hh:mm a', new Date())) ? 2 : 1;
    } catch(e) {
        console.error(`Could not parse time: ${timeString}. Defaulting to session 1.`);
        return 1;
    }
};


/**
 * This function directly implements the duty allotment logic without using an AI prompt.
 * This ensures that the complex, rule-based allocation is performed predictably and accurately.
 * The logic now includes session alternation for fairness.
 */
function deterministicDutyAllocation(input: OptimizeDutyAssignmentsInput): OptimizeDutyAssignmentsOutput {
    // 1. Create a flat list of all duty slots that need to be filled, sorted by date and then session.
    let dutySlots: { date: string, subject: string, time: string, day: string, session: number }[] = [];
    input.examinations.forEach(exam => {
        for (let i = 0; i < exam.invigilatorsNeeded; i++) {
            dutySlots.push({ 
                date: exam.date, 
                subject: exam.subject, 
                time: exam.time,
                day: getWeekday(exam.date), 
                session: getSessionNumber(exam.time)
            });
        }
    });
    dutySlots.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if(dateA !== dateB) return dateA - dateB;
        return a.session - b.session; // Prioritize morning sessions
    });

    // 2. Prepare invigilator roster.
    const roster = input.invigilators.map(inv => ({
      ...inv,
      isPartTime: inv.availableDays && inv.availableDays.length > 0,
      dutiesAssigned: 0,
      assignedSlots: new Set<string>(), // Track date|time to prevent double-booking
      lastDutyInfo: { date: null as (string | null), session: null as (number | null) }
    })).reverse(); // Reverse to match the last-in, first-out order from the UI.

    const finalAssignments: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};

    // 3. Assign duties slot by slot.
    for (const slot of dutySlots) {
        // Sort the roster before each slot to find the best candidate.
        // This is more dynamic than a simple round-robin.
        roster.sort((a, b) => {
            // Priority 1: Fewer duties assigned
            if (a.dutiesAssigned !== b.dutiesAssigned) {
                return a.dutiesAssigned - b.dutiesAssigned;
            }
            // Priority 2: Session Alternation (strong preference)
            // If an invigilator's last duty was on a different day, check if they can take the opposite session
            if (a.lastDutyInfo.date !== slot.date && b.lastDutyInfo.date !== slot.date) {
                const aNeedsAlternate = a.lastDutyInfo.session !== null && a.lastDutyInfo.session === slot.session;
                const bNeedsAlternate = b.lastDutyInfo.session !== null && b.lastDutyInfo.session === slot.session;
                if (aNeedsAlternate && !bNeedsAlternate) return 1; // b is better
                if (!aNeedsAlternate && bNeedsAlternate) return -1; // a is better
            }
            // Priority 3: Full-timers over Part-timers
            return (a.isPartTime ? 1 : 0) - (b.isPartTime ? 1 : 0);
        });

        let assignedInvigilator = null;
        for (const invigilator of roster) {
            const isAvailableOnDay = !invigilator.isPartTime || (invigilator.availableDays && invigilator.availableDays.includes(slot.day));
            const slotKey = `${slot.date}|${slot.time}`;
            const isAlreadyAssignedSlot = invigilator.assignedSlots.has(slotKey);

            if (isAvailableOnDay && !isAlreadyAssignedSlot) {
                assignedInvigilator = invigilator;
                break;
            }
        }
        
        if (assignedInvigilator) {
            const examKey = `${slot.date}|${slot.subject}|${slot.time}`;
            if (!finalAssignments[examKey]) {
                finalAssignments[examKey] = {
                    date: slot.date,
                    subject: slot.subject,
                    time: slot.time,
                    invigilators: []
                };
            }
            finalAssignments[examKey].invigilators.push(assignedInvigilator.name);
            
            // Update tracking for the invigilator
            assignedInvigilator.dutiesAssigned++;
            assignedInvigilator.assignedSlots.add(`${slot.date}|${slot.time}`);
            assignedInvigilator.lastDutyInfo = { date: slot.date, session: slot.session };
        } else {
           console.warn(`Could not find an available invigilator for a duty on ${slot.date} at ${slot.time}. All available invigilators may already be assigned for that time slot.`);
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
