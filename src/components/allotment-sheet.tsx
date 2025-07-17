
'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useMemo, forwardRef } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';


type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: Assignment[];
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
};

export const AllotmentSheet = forwardRef<HTMLDivElement, AllotmentSheetProps>(
  ({ invigilators, examinations, assignments, setAssignments }, ref) => {
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

    const { columnTotals, grandTotal, requiredTotals, requiredGrandTotal } = useMemo(() => {
      const allotted: { [key: string]: number } = {};
      let allottedGrand = 0;
      
      const required: { [key: string]: number } = {};
      let requiredGrand = 0;
      
      uniqueExams.forEach(exam => {
        const examKey = getExamKey(exam);
        const examTotal = dutyData.reduce((sum, inv) => sum + (inv.duties[examKey] || 0), 0);
        allotted[examKey] = examTotal;
        
        const details = examDetailsMap.get(examKey);
        required[examKey] = details?.roomsAllotted || 0;
      });

      allottedGrand = dutyData.reduce((sum, inv) => sum + inv.totalDuties, 0);
      requiredGrand = Object.values(required).reduce((sum, rooms) => sum + rooms, 0);

      return { columnTotals: allotted, grandTotal: allottedGrand, requiredTotals: required, requiredGrandTotal: requiredGrand };
    }, [dutyData, uniqueExams, examDetailsMap]);

    const handleToggleDuty = (invigilatorName: string, examToUpdate: Assignment) => {
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
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] align-middle">Sl.No</TableHead>
                <TableHead className="align-middle">Invigilator’s Name</TableHead>
                <TableHead className="align-middle">Designation</TableHead>
                {uniqueExams.map(exam => (
                  <TableHead key={getExamKey(exam)} className="text-center w-[120px]">
                      <div>{format(parseISO(exam.date), 'dd-MMM')}</div>
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
                      return (
                          <TableCell 
                            key={`${row.id}-${examKey}`} 
                            className="text-center p-0"
                          >
                            <button
                              onClick={() => handleToggleDuty(row.name, exam)}
                              className={cn(
                                "w-full h-full p-2 flex items-center justify-center cursor-pointer transition-colors",
                                !isAssigned && "hover:bg-muted"
                              )}
                            >
                              {isAssigned ? (
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-semibold">
                                  1
                                </div>
                              ) : (
                                <span className="text-muted-foreground opacity-20">0</span>
                              )}
                            </button>
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
            {dutyData.length > 0 && (
              <TableFooter>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={3} className="text-right font-bold">No of Rooms </TableCell>
                      {uniqueExams.map(exam => {
                          const examKey = getExamKey(exam);
                          return (
                              <TableCell key={`required-${examKey}`} className="text-center font-bold">
                                  {requiredTotals[examKey]}
                              </TableCell>
                          )
                      })}
                      <TableCell className="text-center font-bold">{requiredGrandTotal}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                  <TableCell colSpan={3} className="text-right font-bold">Total Duties Allotted</TableCell>
                  {uniqueExams.map(exam => {
                      const examKey = getExamKey(exam);
                      const isMismatch = columnTotals[examKey] !== requiredTotals[examKey];
                      return (
                          <TableCell 
                              key={`total-${examKey}`} 
                              className={cn(
                                  "text-center font-bold",
                                  isMismatch && "text-destructive"
                              )}
                          >
                              {columnTotals[examKey]}
                          </TableCell>
                      )
                  })}
                  <TableCell className={cn("text-center font-bold", grandTotal !== requiredGrandTotal && "text-destructive")}>{grandTotal}</TableCell>
                  </TableRow>
              </TableFooter>
            )}
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }
);

AllotmentSheet.displayName = 'AllotmentSheet';
