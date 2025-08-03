
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
    let dutySlots: { date: string, subject: string, time: string, day: string, assigned: boolean, invigilatorName: string | null }[] = [];
    input.examinations.forEach(exam => {
        for (let i = 0; i < exam.invigilatorsNeeded; i++) {
            dutySlots.push({ 
                date: exam.date, 
                subject: exam.subject, 
                time: exam.time,
                day: getWeekday(exam.date), 
                assigned: false,
                invigilatorName: null
            });
        }
    });
    dutySlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Separate invigilators into full-time and part-time
    const fullTimeInvigilators = input.invigilators.filter(inv => !inv.availableDays || inv.availableDays.length === 0);
    const partTimeInvigilators = input.invigilators.filter(inv => inv.availableDays && inv.availableDays.length > 0);

    // Create a map to track duties assigned to each invigilator
    const invigilatorDutyCount: { [name: string]: number } = {};
    input.invigilators.forEach(inv => invigilatorDutyCount[inv.name] = 0);
    
    // 3. Calculate base duties
    const totalDutySlots = dutySlots.length;
    // For calculation, treat 2 part-timers as 1 full-timer
    const fullTimeEquivalents = fullTimeInvigilators.length + (partTimeInvigilators.length / 2);
    const baseDutiesPerFullTimer = fullTimeEquivalents > 0 ? Math.floor(totalDutySlots / fullTimeEquivalents) : 0;
    const baseDutiesPerPartTimer = Math.floor(baseDutiesPerFullTimer / 2);

    // 4. Assign duties to part-time invigilators first
    const partTimeOrder = [...partTimeInvigilators].reverse();
    for (const inv of partTimeOrder) {
        let dutiesAssigned = 0;
        for (const slot of dutySlots) {
            if (!slot.assigned && dutiesAssigned < baseDutiesPerPartTimer && inv.availableDays!.includes(slot.day)) {
                slot.assigned = true;
                slot.invigilatorName = inv.name;
                invigilatorDutyCount[inv.name]++;
                dutiesAssigned++;
            }
        }
    }

    // 5. Assign duties to full-time invigilators (base + remaining)
    const fullTimeOrder = [...fullTimeInvigilators].reverse();
    let unassignedSlots = dutySlots.filter(s => !s.assigned);
    let invigilatorIndex = 0;

    while (unassignedSlots.length > 0) {
        const invigilator = fullTimeOrder[invigilatorIndex % fullTimeOrder.length];
        const slotToAssign = unassignedSlots.shift(); // Take the next available slot
        if (slotToAssign) {
            slotToAssign.assigned = true;
            slotToAssign.invigilatorName = invigilator.name;
            invigilatorDutyCount[invigilator.name]++;
        }
        invigilatorIndex++;
    }

    // 6. Format the output
    const assignmentsMap: { [key: string]: { date: string, subject: string, time: string, invigilators: string[] } } = {};
    dutySlots.forEach(slot => {
        const key = `${slot.date}|${slot.subject}|${slot.time}`;
        if (!assignmentsMap[key]) {
            assignmentsMap[key] = {
                date: slot.date,
                subject: slot.subject,
                time: slot.time,
                invigilators: []
            };
        }
        if (slot.invigilatorName) {
            assignmentsMap[key].invigilators.push(slot.invigilatorName);
        }
    });

    return Object.values(assignmentsMap);
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
