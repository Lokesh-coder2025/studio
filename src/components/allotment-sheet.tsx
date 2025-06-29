'use client';

import type { Invigilator, Examination, Assignment } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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

  const { columnTotals, grandTotal } = useMemo(() => {
    const totals: { [key: string]: number } = {};
    let grand = 0;
    
    examDates.forEach(date => {
      const dateTotal = dutyData.reduce((sum, inv) => sum + (inv.duties[date] || 0), 0);
      totals[date] = dateTotal;
    });

    grand = dutyData.reduce((sum, inv) => sum + inv.totalDuties, 0);
    
    return { columnTotals: totals, grandTotal: grand };
  }, [dutyData, examDates]);

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

    // Add the total row for export
    const totalRow: { [key: string]: any } = {
        'Sl No': '',
        'Invigilator’s Name': '',
        'Designation': 'Total',
    };
    examDates.forEach(date => {
        const formattedDate = format(parseISO(date), "dd-MMM");
        totalRow[formattedDate] = columnTotals[date];
    });
    totalRow['Total'] = grandTotal;
    exportData.push(totalRow);

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
              <TableHead rowSpan={2} className="w-[50px] align-middle">Sl.No</TableHead>
              <TableHead rowSpan={2} className="align-middle">Invigilator’s Name</TableHead>
              <TableHead rowSpan={2} className="align-middle">Designation</TableHead>
              {examDates.map(date => (
                <TableHead key={date} className="text-center">{format(parseISO(date), 'dd-MMM')}</TableHead>
              ))}
              <TableHead rowSpan={2} className="text-center align-middle">Total</TableHead>
            </TableRow>
            <TableRow>
              {examDates.map(date => {
                const subject = assignments.find(a => a.date === date)?.subject || '';
                return (
                  <TableHead key={`${date}-subject`} className="text-center font-normal whitespace-nowrap">
                    {subject}
                  </TableHead>
                );
              })}
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
          {dutyData.length > 0 && (
            <TableFooter>
                <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                <TableCell colSpan={3} className="text-right font-bold">Total Duties</TableCell>
                {examDates.map(date => (
                    <TableCell key={`total-${date}`} className="text-center font-bold">
                    {columnTotals[date]}
                    </TableCell>
                ))}
                <TableCell className="text-center font-bold">{grandTotal}</TableCell>
                </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
