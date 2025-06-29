'use client';

import { useState, useMemo, useRef } from 'react';
import type { Invigilator, Assignment } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type InvigilatorDutySummaryProps = {
  invigilators: Invigilator[];
  assignments: Assignment[];
};

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
      const button = input.querySelector('button');
      if (button) {
        button.style.display = 'none';
      }

      html2canvas(input, { scale: 2 }).then((canvas) => {
        if (button) {
          button.style.display = '';
        }
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth - 20;
        const imgHeight = imgWidth / ratio;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`${selectedInvigilator.name}-duty-summary.pdf`);
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
        <Card ref={summaryCardRef}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invigilator's Duty Summary</CardTitle>
              <Button onClick={handleDownloadPdf} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <p><span className="font-semibold">Name:</span> {selectedInvigilator.name}</p>
                <p><span className="font-semibold">Designation:</span> {selectedInvigilator.designation}</p>
                <p><span className="font-semibold">No of Duties Allotted:</span> {invigilatorDuties.length.toString().padStart(2, '0')}</p>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Sl.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Timings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invigilatorDuties.length > 0 ? (
                    invigilatorDuties.map((duty, index) => (
                      <TableRow key={`${duty.date}-${duty.subject}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(parseISO(duty.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{duty.day}</TableCell>
                        <TableCell>{duty.subject}</TableCell>
                        <TableCell>{duty.time}</TableCell>
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
        </Card>
      ) : (
         <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select an invigilator to view their duty summary.</p>
         </div>
      )}
    </div>
  );
}
