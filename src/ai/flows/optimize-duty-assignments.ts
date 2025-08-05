
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
 */
function deterministicDutyAllocation(input: OptimizeDutyAssignmentsInput): OptimizeDutyAssignmentsOutput {
    // 1. Create a flat list of all duty slots that need to be filled
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

    // 2. Separate invigilators by type and prepare for weighted allocation
    const fullTimeInvigilators = input.invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);
    const partTimeInvigilators = input.invigilators.filter(inv => inv.availableDays && inv.availableDays.length > 0);

    // Create a roster with weights (2 for full-time, 1 for part-time)
    // Reverse the order to follow the last-in, first-out principle from the UI
    const weightedRoster = [
      ...fullTimeInvigilators.reverse().map(inv => ({ ...inv, weight: 2, dutiesAssigned: 0 })),
      ...partTimeInvigilators.reverse().map(inv => ({ ...inv, weight: 1, dutiesAssigned: 0 }))
    ];

    const finalAssignments: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};
    const assignedDutiesToInvigilators: { [name: string]: { date: string, time: string }[] } = {};
    input.invigilators.forEach(inv => {
      assignedDutiesToInvigilators[inv.name] = [];
    });

    // 3. Assign duties slot by slot
    for (const slot of dutySlots) {
        let assigned = false;
        
        // Sort roster before each assignment to prioritize fairness
        // Priority: fewest duties, then highest weight (full-timers first)
        weightedRoster.sort((a, b) => {
            if (a.dutiesAssigned !== b.dutiesAssigned) {
                return a.dutiesAssigned - b.dutiesAssigned;
            }
            return b.weight - a.weight;
        });

        for (const invigilator of weightedRoster) {
            // Check availability
            const isAvailable = invigilator.weight === 2 || (invigilator.availableDays && invigilator.availableDays.includes(slot.day));
            
            // Check if already assigned a duty on the same day and time
            const hasDutyAtSameTime = assignedDutiesToInvigilators[invigilator.name].some(
                d => d.date === slot.date && d.time === slot.time
            );

            if (isAvailable && !hasDutyAtSameTime) {
                const key = `${slot.date}|${slot.subject}|${slot.time}`;
                if (!finalAssignments[key]) {
                    finalAssignments[key] = {
                        date: slot.date,
                        subject: slot.subject,
                        time: slot.time,
                        invigilators: []
                    };
                }
                finalAssignments[key].invigilators.push(invigilator.name);
                
                // Update tracking
                invigilator.dutiesAssigned++;
                assignedDutiesToInvigilators[invigilator.name].push({ date: slot.date, time: slot.time });
                
                assigned = true;
                break; // Move to the next slot
            }
        }
        
        if (!assigned) {
           console.warn(`Could not find an available invigilator for a duty on ${slot.date} at ${slot.time}. All available invigilators may already be assigned for that time slot.`);
           // Fallback: assign to someone, even if it breaks the "one duty per timeslot" rule, to ensure the slot is filled.
           // This should ideally not happen if there are enough invigilators.
            for (const invigilator of weightedRoster) {
                 const isAvailable = invigilator.weight === 2 || (invigilator.availableDays && invigilator.availableDays.includes(slot.day));
                 if(isAvailable) {
                     const key = `${slot.date}|${slot.subject}|${slot.time}`;
                     if (!finalAssignments[key]) {
                         finalAssignments[key] = { date: slot.date, subject: slot.subject, time: slot.time, invigilators: [] };
                     }
                     finalAssignments[key].invigilators.push(invigilator.name);
                     invigilator.dutiesAssigned++;
                     assignedDutiesToInvigilators[invigilator.name].push({ date: slot.date, time: slot.time });
                     break;
                 }
            }
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
