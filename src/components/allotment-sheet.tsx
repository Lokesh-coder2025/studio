'use client';

import type { Invigilator, Examination, Assignment } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { exportToExcel } from '@/lib/excel-export';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: Assignment[];
};

export function AllotmentSheet({ invigilators, examinations, assignments }: AllotmentSheetProps) {

  const examDates = useMemo(() => {
    const dates = new Set<string>();
    assignments.forEach(a => dates.add(a.date));
    return Array.from(dates).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
  }, [assignments]);

  const dutyData = useMemo(() => {
    return invigilators.map(inv => {
      let totalDuties = 0;
      const dutiesByDate: { [key: string]: number } = {};
      
      examDates.forEach(date => {
        const assignmentForDate = assignments.find(a => a.date === date);
        if (assignmentForDate && assignmentForDate.invigilators.includes(inv.name)) {
          dutiesByDate[date] = 1;
          totalDuties++;
        } else {
          dutiesByDate[date] = 0;
        }
      });

      return {
        ...inv,
        duties: dutiesByDate,
        totalDuties,
      };
    });
  }, [invigilators, assignments, examDates]);

  const handleExport = () => {
    const exportData = dutyData.map((inv, index) => {
      const row: {[key: string]: any} = {
        'Sl No': index + 1,
        'Invigilator’s Name': inv.name,
        'Designation': inv.designation,
      };
      examDates.forEach(date => {
        const formattedDate = format(parseISO(date), "dd-MMM");
        row[formattedDate] = inv.duties[date] ? '1' : '';
      });
      row['Total'] = inv.totalDuties;
      return row;
    });

    exportToExcel(exportData, 'Duty Allotment', 'duty-allotment-sheet');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport}>
          <Download className="mr-2" /> Download as Excel
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sl.No</TableHead>
              <TableHead>Invigilator’s Name</TableHead>
              <TableHead>Designation</TableHead>
              {examDates.map(date => (
                <TableHead key={date} className="text-center">{format(parseISO(date), 'dd-MMM')}</TableHead>
              ))}
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dutyData.length > 0 ? (
              dutyData.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.designation}</TableCell>
                  {examDates.map(date => (
                    <TableCell key={date} className="text-center">
                      {row.duties[date] ? '1' : ''}
                    </TableCell>
                  ))}
                  <TableCell className="font-bold text-center">{row.totalDuties}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={examDates.length + 4} className="h-24 text-center">
                  No duty data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
