
'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Invigilator, Assignment } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { exportToExcel } from '@/lib/excel-export';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  assignments: Assignment[];
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
};

export function AllotmentSheet({ invigilators, assignments, setAssignments }: AllotmentSheetProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const uniqueExams = useMemo(() => {
    return [...assignments].sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.time.localeCompare(b.time);
    });
  }, [assignments]);

  const getExamKey = (exam: Assignment) => `${exam.date}|${exam.subject}|${exam.time}`;

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

  const { columnTotals, grandTotal } = useMemo(() => {
    const totals: { [key: string]: number } = {};
    let grand = 0;
    
    uniqueExams.forEach(exam => {
      const examKey = getExamKey(exam);
      const examTotal = dutyData.reduce((sum, inv) => sum + (inv.duties[examKey] || 0), 0);
      totals[examKey] = examTotal;
    });

    grand = dutyData.reduce((sum, inv) => sum + inv.totalDuties, 0);
    
    return { columnTotals: totals, grandTotal: grand };
  }, [dutyData, uniqueExams]);

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

  const handleExport = () => {
    const exportData = dutyData.map((inv, index) => {
      const row: {[key: string]: any} = {
        'Sl No': index + 1,
        'Invigilator’s Name': inv.name,
        'Designation': inv.designation,
      };
      uniqueExams.forEach(exam => {
        const header = `${format(parseISO(exam.date), "dd-MMM")}\n${exam.subject}`;
        const examKey = getExamKey(exam);
        row[header] = inv.duties[examKey] ? '1' : '';
      });
      row['Total'] = inv.totalDuties;
      return row;
    });

    const totalRow: { [key: string]: any } = {
        'Sl No': '',
        'Invigilator’s Name': '',
        'Designation': 'Total',
    };
    uniqueExams.forEach(exam => {
        const header = `${format(parseISO(exam.date), "dd-MMM")}\n${exam.subject}`;
        const examKey = getExamKey(exam);
        totalRow[header] = columnTotals[examKey];
    });
    totalRow['Total'] = grandTotal;
    exportData.push(totalRow);

    exportToExcel(exportData, 'Duty Allotment', 'duty-allotment-sheet');
  }

  const handleDownloadPdf = () => {
    const tableEl = tableContainerRef.current;
    const buttonsEl = document.getElementById('allotment-actions');
    if (tableEl && buttonsEl) {
      buttonsEl.style.display = 'none'; // Hide buttons
      html2canvas(tableEl, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a3');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        let imgWidth = pdfWidth - 20;
        let imgHeight = imgWidth / ratio;

        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save('duty-allotment-sheet.pdf');
      }).finally(() => {
        buttonsEl.style.display = 'flex'; // Show buttons again
      });
    }
  };

  return (
    <div className="space-y-4">
      <div id="allotment-actions" className="flex justify-end gap-2">
        <Button onClick={handleExport}>
          <Download className="mr-2" /> Download as Excel
        </Button>
        <Button onClick={handleDownloadPdf} variant="outline">
          <Download className="mr-2" /> Download as PDF
        </Button>
      </div>
      <div ref={tableContainerRef} className="rounded-md border overflow-x-auto">
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
                              "w-full h-full p-4 flex items-center justify-center cursor-pointer transition-colors",
                              isAssigned ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-muted"
                            )}
                          >
                            {isAssigned ? '1' : <span className="text-muted-foreground opacity-20">0</span>}
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
                <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                <TableCell colSpan={3} className="text-right font-bold">Total Duties</TableCell>
                {uniqueExams.map(exam => {
                    const examKey = getExamKey(exam);
                    return (
                        <TableCell key={`total-${examKey}`} className="text-center font-bold">
                            {columnTotals[examKey]}
                        </TableCell>
                    )
                })}
                <TableCell className="text-center font-bold">{grandTotal}</TableCell>
                </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
