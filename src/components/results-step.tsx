
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useRef, useMemo } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { InvigilatorDutySummary } from '@/components/invigilator-duty-summary';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { exportToExcelWithFormulas } from '@/lib/excel-export';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ResultsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  initialAssignments: Assignment[];
  resetApp: () => void;
  prevStep: () => void;
  examTitle: string;
  allotmentId: string | null;
  setAllotmentId: Dispatch<SetStateAction<string | null>>;
};

export function ResultsStep({ invigilators, examinations, initialAssignments, resetApp, prevStep, examTitle, allotmentId, setAllotmentId }: ResultsStepProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const { toast } = useToast();
  const allotmentSheetRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    if (examinations.length === 0) {
      toast({
        title: "Cannot Save",
        description: "There are no examinations in this allotment.",
        variant: 'destructive',
      });
      return;
    }

    const currentId = allotmentId || new Date().toISOString();
    setAllotmentId(currentId);

    const savedAllotment: SavedAllotment = {
      id: currentId,
      examTitle: examTitle || `Examination from ${format(parseISO(examinations[0].date), 'd-MMM-yy')}`,
      firstExamDate: examinations[0].date,
      invigilators,
      examinations,
      assignments,
    };

    const savedAllotments: SavedAllotment[] = JSON.parse(localStorage.getItem('savedAllotments') || '[]');
    const existingIndex = savedAllotments.findIndex(item => item.id === currentId);

    if (existingIndex > -1) {
      savedAllotments[existingIndex] = savedAllotment; // Update existing
    } else {
      savedAllotments.unshift(savedAllotment); // Add new
    }
    
    localStorage.setItem('savedAllotments', JSON.stringify(savedAllotments));

    toast({
      title: "Allotment Saved",
      description: "Your duty allotment has been successfully saved.",
      className: "bg-accent text-accent-foreground"
    });
  };

  const uniqueExamsForExport = useMemo(() => {
    return [...assignments].sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.time.localeCompare(b.time);
    });
  }, [assignments]);

  const getExamKeyForExport = (exam: {date: string, subject: string, time: string}) => `${exam.date}|${exam.subject}|${exam.time}`;

  const dutyDataForExport = useMemo(() => {
    return invigilators.map(inv => {
      const dutiesByExam: { [key: string]: number } = {};
      uniqueExamsForExport.forEach(exam => {
        const examKey = getExamKeyForExport(exam);
        dutiesByExam[examKey] = exam.invigilators.includes(inv.name) ? 1 : 0;
      });
      return { ...inv, duties: dutiesByExam };
    });
  }, [invigilators, uniqueExamsForExport]);

  const handleExportExcel = () => {
    const headers = [
      'Sl No',
      'Invigilator’s Name',
      'Designation',
      ...uniqueExamsForExport.map(exam => `${format(parseISO(exam.date), "dd-MMM")}\n${exam.subject}`),
      'Total'
    ];
    const dataRows = dutyDataForExport.map((inv, index) => {
      const row: (string | number)[] = [
        index + 1,
        inv.name,
        inv.designation,
      ];
      uniqueExamsForExport.forEach(exam => {
        const examKey = getExamKeyForExport(exam);
        row.push(inv.duties[examKey] || 0);
      });
      return row;
    });
    exportToExcelWithFormulas(headers, dataRows, 'Duty Allotment', 'duty-allotment-sheet');
  };

  const handleDownloadPdf = () => {
    const tableEl = allotmentSheetRef.current;
    if (tableEl) {
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
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="allotment-sheet">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allotment-sheet">Duty Allotment Sheet</TabsTrigger>
          <TabsTrigger value="individual-dashboard">Individual Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="allotment-sheet" className="mt-4">
            <AllotmentSheet 
              ref={allotmentSheetRef}
              invigilators={invigilators} 
              examinations={examinations}
              assignments={assignments} 
              setAssignments={setAssignments}
            />
        </TabsContent>
        <TabsContent value="individual-dashboard" className="mt-4">
            <InvigilatorDutySummary 
              invigilators={invigilators} 
              assignments={assignments} 
            />
        </TabsContent>
      </Tabs>
      <div className="flex justify-between items-center pt-4 border-t mt-4">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleSave}>
              <Save /> Save Allotment
            </Button>
           <Button onClick={handleDownloadPdf} variant="outline">
              <Download /> Download as PDF
            </Button>
            <Button onClick={handleExportExcel}>
              <Download /> Download as Excel
            </Button>
        </div>
      </div>
    </div>
  );
}
