
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
    return dayMapping[getDay(parseISO(dateString))];
};

/**
 * This function implements the duty allotment logic according to the specified rules.
 * It respects the order of invigilators (seniority), handles part-time availability correctly,
 * and distributes duties fairly.
 */
function deterministicDutyAllocation(input: OptimizeDutyAssignmentsInput): OptimizeDutyAssignmentsOutput {
    // 1. Separate invigilators into part-time and full-time lists, preserving original order.
    const partTimeInvigilators = input.invigilators.filter(inv => inv.availableDays && inv.availableDays.length > 0);
    const fullTimeInvigilators = input.invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);
    
    const roster = [...partTimeInvigilators, ...fullTimeInvigilators].map(inv => ({
        ...inv,
        dutiesAssigned: 0,
        // Tracks "date|time" to prevent double booking on the same day/session.
        assignedSlots: new Set<string>(), 
        // Tracks just "date" to prevent multiple duties on the same day.
        assignedDates: new Set<string>(),
    }));

    // 2. Create a flat list of all individual duty slots required for all exams.
    const allDutySlots: { date: string; subject: string; time: string; day: string; assignedTo: string | null }[] = [];
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
    
    // Sort slots by date and time to ensure chronological assignment
    allDutySlots.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.time.localeCompare(b.time);
    });


    // 3. Two-pass assignment: part-timers first, then full-timers.
    const assignmentPass = (slotsToFill: typeof allDutySlots, invigilatorsToUse: typeof roster) => {
        let invigilatorIndex = 0;
        slotsToFill.forEach(slot => {
            if (slot.assignedTo) return; // Skip if already assigned in a previous pass

            let attempts = 0;
            let assigned = false;
            while (attempts < invigilatorsToUse.length && !assigned) {
                const invigilator = invigilatorsToUse[invigilatorIndex];
                
                // Availability check: day of the week for part-timers
                const isAvailableOnDay = !invigilator.availableDays || invigilator.availableDays.length === 0 || invigilator.availableDays.includes(slot.day);
                
                // Check if invigilator already has any duty on this day.
                const hasDutyOnDay = invigilator.assignedDates.has(slot.date);

                if (isAvailableOnDay && !hasDutyOnDay) {
                    slot.assignedTo = invigilator.name;
                    invigilator.dutiesAssigned++;
                    invigilator.assignedDates.add(slot.date);
                    assigned = true;
                }

                invigilatorIndex = (invigilatorIndex + 1) % invigilatorsToUse.length;
                attempts++;
            }
        });
    };
    
    const partTimeRoster = roster.filter(inv => inv.availableDays && inv.availableDays.length > 0);
    const fullTimeRoster = roster.filter(inv => !inv.availableDays || inv.availableDays.length === 0);

    // First pass: Assign duties that can be fulfilled by part-timers.
    assignmentPass(allDutySlots, partTimeRoster);
    
    // Second pass: Assign remaining duties to full-timers.
    assignmentPass(allDutySlots, fullTimeRoster);

    // 4. Consolidate assignments into the final structure.
    const finalAssignments: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};
    allDutySlots.forEach(slot => {
        const examKey = `${slot.date}|${slot.subject}|${slot.time}`;
        if (!finalAssignments[examKey]) {
            finalAssignments[examKey] = {
                date: slot.date,
                subject: slot.subject,
                time: slot.time,
                invigilators: []
            };
        }
        if (slot.assignedTo) {
            finalAssignments[examKey].invigilators.push(slot.assignedTo);
        } else {
            // Log a warning if a slot couldn't be filled.
            console.warn(`Could not assign a duty for ${slot.subject} on ${slot.date} at ${slot.time}. There may be insufficient available invigilators.`);
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
