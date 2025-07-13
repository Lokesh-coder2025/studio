
'use client';

import { useState, useMemo, useRef } from 'react';
import type { Invigilator, Assignment } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

type InvigilatorDutySummaryProps = {
  invigilators: Invigilator[];
  assignments: Assignment[];
};

const serialNumberColors = [
  "bg-blue-100 text-blue-800", "bg-green-100 text-green-800", "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800", "bg-indigo-100 text-indigo-800",
  "bg-red-100 text-red-800", "bg-cyan-100 text-cyan-800", "bg-orange-100 text-orange-800"
];

export function InvigilatorDutySummary({ invigilators, assignments }: InvigilatorDutySummaryProps) {
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  const selectedInvigilator = useMemo(() => {
    return invigilators.find(inv => inv.id === selectedInvigilatorId) || null;
  }, [selectedInvigilatorId, invigilators]);

  const invigilatorDuties = useMemo(() => {
    if (!selectedInvigilator) return [];
    
    return assignments
      .filter(a => a.invigilators.includes(selectedInvigilator.name))
      .map(a => ({
        ...a,
        date: a.date,
        day: format(parseISO(a.date), 'EEE'),
      }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilator, assignments]);

  const handleDownloadPdf = () => {
    const input = summaryCardRef.current;
    if (input && selectedInvigilator) {
      input.classList.add('pdf-render');
      const button = input.querySelector('#download-pdf-btn');
      if (button) {
        (button as HTMLElement).style.display = 'none';
      }

      html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        const leftMargin = 20; // 2cm
        const rightMargin = 20; // 2cm
        const topMargin = 20; // 2cm

        let imgWidth = pdfWidth - leftMargin - rightMargin;
        let imgHeight = imgWidth / ratio;

        if (imgHeight > pdfHeight - topMargin) {
          imgHeight = pdfHeight - topMargin;
          imgWidth = imgHeight * ratio;
        }

        const x = leftMargin;
        const y = topMargin;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`${selectedInvigilator.name}-duty-summary.pdf`);
      }).finally(() => {
        input.classList.remove('pdf-render');
        if (button) {
          (button as HTMLElement).style.display = 'flex';
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <label htmlFor="invigilator-select" className="block text-sm font-medium text-foreground mb-2">Select Invigilator Name</label>
        <Select onValueChange={setSelectedInvigilatorId}>
            <SelectTrigger id="invigilator-select">
                <SelectValue placeholder={<div className="flex items-center"><Search className="h-4 w-4 mr-2" /> Search for an invigilator...</div>} />
            </SelectTrigger>
            <SelectContent>
                {invigilators.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {selectedInvigilator ? (
        <>
          <style>
            {`
              .pdf-render {
                font-family: "Avenir", sans-serif !important;
                font-size: 16px !important;
              }
              .pdf-render .text-xl {
                font-size: 1.5rem !important; 
              }
              .pdf-render th {
                font-weight: bold !important;
              }
            `}
          </style>
          <Card ref={summaryCardRef} className="overflow-hidden">
            <CardHeader className="p-0">
                <div className="bg-primary text-primary-foreground flex items-center justify-center p-4 min-h-[80px]">
                    <CardTitle className="text-xl">Invigilator's Duty Summary</CardTitle>
                </div>
                <div className="p-6 pb-4 space-y-4">
                  <div className="flex justify-between items-center text-sm w-full">
                      <p className="flex-1 text-left"><span className="font-semibold">Name:</span> {selectedInvigilator.name}</p>
                      <p className="flex-1 text-center"><span className="font-semibold">Designation:</span> {selectedInvigilator.designation}</p>
                      <p className="flex-1 text-right"><span className="font-semibold">No of Duties Allotted:</span> {invigilatorDuties.length.toString().padStart(2, '0')}</p>
                  </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-bold">Sl.No</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Day</TableHead>
                      <TableHead className="font-bold">Subject</TableHead>
                      <TableHead className="text-center font-bold">Timings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invigilatorDuties.length > 0 ? (
                      invigilatorDuties.map((duty, index) => (
                        <TableRow key={`${duty.date}-${duty.subject}`}>
                          <TableCell className="text-center">
                            <div className={cn(
                                "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                serialNumberColors[index % serialNumberColors.length]
                            )}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>{format(parseISO(duty.date), 'dd.MM.yyyy')}</TableCell>
                          <TableCell>{duty.day}</TableCell>
                          <TableCell>{duty.subject}</TableCell>
                          <TableCell className="text-center">{duty.time}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No duties assigned to this invigilator.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6">
               <Button id="download-pdf-btn" onClick={handleDownloadPdf} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
         <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select an invigilator to view their duty summary.</p>
         </div>
      )}
    </div>
  );
}
