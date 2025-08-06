
'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useMemo, forwardRef } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: Assignment[];
  setAssignments?: Dispatch<SetStateAction<Assignment[]>>;
};

export const AllotmentSheet = forwardRef<HTMLDivElement, AllotmentSheetProps>(
  ({ invigilators, examinations, assignments, setAssignments }, ref) => {
    const isEditable = !!setAssignments;

    const uniqueExams = useMemo(() => {
      return [...assignments].sort((a,b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return a.time.localeCompare(b.time);
      });
    }, [assignments]);

    const getExamKey = (exam: {date: string, subject: string, time: string}) => `${exam.date}|${exam.subject}|${exam.time}`;

    const dutyData = useMemo(() => {
      return invigilators.map(inv => {
        let totalDuties = 0;
        const dutiesByExam: { [key: string]: number } = {};
        
        uniqueExams.forEach(exam => {
          const examKey = getExamKey(exam);
          if (exam.invigilators.includes(inv.name)) {
            dutiesByExam[examKey] = 1;
            totalDuties++;
          } else {
            dutiesByExam[examKey] = 0;
          }
        });

        return {
          ...inv,
          duties: dutiesByExam,
          totalDuties,
        };
      });
    }, [invigilators, uniqueExams]);
    
    const examDetailsMap = useMemo(() => {
      const map = new Map<string, Examination>();
      examinations.forEach(exam => {
        const examKey = getExamKey({
          date: format(parseISO(exam.date), 'yyyy-MM-dd'),
          subject: exam.subject,
          time: `${exam.startTime} - ${exam.endTime}`
        });
        map.set(examKey, exam);
      });
      return map;
    }, [examinations]);

    const dayColors = useMemo(() => {
        const colors = [
            'bg-pink-100 text-pink-800',       // Sunday
            'bg-yellow-100 text-yellow-800',  // Monday
            'bg-purple-100 text-purple-800',  // Tuesday
            'bg-green-100 text-green-800',    // Wednesday
            'bg-blue-100 text-blue-800',      // Thursday
            'bg-orange-100 text-orange-800',  // Friday
            'bg-red-100 text-red-800'         // Saturday
        ];
        const dateColorMap = new Map<string, string>();
        const uniqueDates = [...new Set(uniqueExams.map(exam => exam.date))];
        
        uniqueDates.forEach(dateStr => {
            const dayIndex = getDay(parseISO(dateStr));
            dateColorMap.set(dateStr, colors[dayIndex]);
        });

        return dateColorMap;
    }, [uniqueExams]);

    const { allottedTotals, allottedGrandTotal, roomTotals, relieverTotals, requiredGrandTotal } = useMemo(() => {
        const allotted: { [key: string]: number } = {};
        const rooms: { [key: string]: number } = {};
        const relievers: { [key: string]: number } = {};

        uniqueExams.forEach(exam => {
            const examKey = getExamKey(exam);
            
            // Calculate allotted duties
            allotted[examKey] = dutyData.reduce((sum, inv) => sum + (inv.duties[examKey] || 0), 0);
            
            // Get required duties from original examination data
            const details = examDetailsMap.get(examKey);
            rooms[examKey] = details?.roomsAllotted || 0;
            relievers[examKey] = details?.relieversRequired || 0;
        });

        const allottedGrand = dutyData.reduce((sum, inv) => sum + inv.totalDuties, 0);
        const requiredGrand = Object.values(rooms).reduce((sum, r) => sum + r, 0) + Object.values(relievers).reduce((sum, r) => sum + r, 0);

        return { 
            allottedTotals: allotted, 
            allottedGrandTotal: allottedGrand, 
            roomTotals: rooms, 
            relieverTotals: relievers, 
            requiredGrandTotal: requiredGrand 
        };
    }, [dutyData, uniqueExams, examDetailsMap]);

    const handleToggleDuty = (invigilatorName: string, examToUpdate: Assignment) => {
      if (!setAssignments) return;
      setAssignments(prevAssignments => {
        return prevAssignments.map(assignment => {
          if (
            assignment.date === examToUpdate.date &&
            assignment.subject === examToUpdate.subject &&
            assignment.time === examToUpdate.time
          ) {
            const isAssigned = assignment.invigilators.includes(invigilatorName);
            let newInvigilators;
            if (isAssigned) {
              newInvigilators = assignment.invigilators.filter(name => name !== invigilatorName);
            } else {
              newInvigilators = [...assignment.invigilators, invigilatorName];
            }
            return { ...assignment, invigilators: newInvigilators };
          }
          return assignment;
        });
      });
    };

    return (
      <div ref={ref} className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] align-middle">Sl.No</TableHead>
              <TableHead className="align-middle">Invigilator’s Name</TableHead>
              <TableHead className="align-middle">Designation</TableHead>
              {uniqueExams.map(exam => (
                <TableHead key={getExamKey(exam)} className="text-center w-[90px]">
                    <div>{format(parseISO(exam.date), 'dd/MM')}</div>
                    <div className="font-normal">{exam.subject}</div>
                    <div className="text-xs font-light">{exam.time}</div>
                </TableHead>
              ))}
              <TableHead className="text-center align-middle">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dutyData.length > 0 ? (
              dutyData.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.designation}</TableCell>
                  {uniqueExams.map(exam => {
                    const examKey = getExamKey(exam);
                    const isAssigned = row.duties[examKey] === 1;
                    const colorClass = dayColors.get(exam.date) || 'bg-primary/20 text-primary';
                    return (
                        <TableCell 
                          key={`${row.id}-${examKey}`} 
                          className="text-center p-0"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleToggleDuty(row.name, exam)}
                                disabled={!isEditable}
                                className={cn(
                                  "w-full h-full p-2 flex items-center justify-center transition-colors",
                                  isEditable && !isAssigned && "hover:bg-muted",
                                  !isEditable && "cursor-default"
                                )}
                              >
                                {isAssigned ? (
                                  <div className={cn("flex items-center justify-center w-6 h-6 rounded-md font-semibold", colorClass)}>
                                    1
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground opacity-30">
                                    0
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{format(parseISO(exam.date), 'PPP')} ({format(parseISO(exam.date), 'EEEE')})</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                    )
                  })}
                  <TableCell className="font-bold text-center">{row.totalDuties}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={uniqueExams.length + 4} className="h-24 text-center">
                  No duty data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {dutyData.length > 0 && isEditable && (
            <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">No of Rooms </TableCell>
                    {uniqueExams.map(exam => {
                        const examKey = getExamKey(exam);
                        return (
                            <TableCell key={`rooms-${examKey}`} className="text-center font-bold">
                                {roomTotals[examKey]}
                            </TableCell>
                        )
                    })}
                    <TableCell className="text-center font-bold">{Object.values(roomTotals).reduce((a, b) => a + b, 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">No of Relievers </TableCell>
                    {uniqueExams.map(exam => {
                        const examKey = getExamKey(exam);
                        return (
                            <TableCell key={`relievers-${examKey}`} className="text-center font-bold">
                                {relieverTotals[examKey]}
                            </TableCell>
                        )
                    })}
                    <TableCell className="text-center font-bold">{Object.values(relieverTotals).reduce((a, b) => a + b, 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                <TableCell colSpan={3} className="text-right font-bold">Total Duties Allotted</TableCell>
                {uniqueExams.map(exam => {
                    const examKey = getExamKey(exam);
                    const required = (roomTotals[examKey] || 0) + (relieverTotals[examKey] || 0);
                    const isMismatch = allottedTotals[examKey] !== required;
                    return (
                        <TableCell 
                            key={`total-${examKey}`} 
                            className={cn(
                                "text-center font-bold",
                                isMismatch && "text-destructive"
                            )}
                        >
                            {allottedTotals[examKey]}
                        </TableCell>
                    )
                })}
                <TableCell className={cn("text-center font-bold", allottedGrandTotal !== requiredGrandTotal && "text-destructive")}>{allottedGrandTotal}</TableCell>
                </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    );
  }
);

AllotmentSheet.displayName = 'AllotmentSheet';
