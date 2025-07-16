
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useMemo } from 'react';
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
import 'jspdf-autotable';

// Extend jsPDF with the autoTable method
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


type ResultsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  initialAssignments: Assignment[];
  resetApp: () => void;
  prevStep: () => void;
  collegeName: string;
  examTitle: string;
  allotmentId: string | null;
  setAllotmentId: Dispatch<SetStateAction<string | null>>;
};

export function ResultsStep({ invigilators, examinations, initialAssignments, prevStep, collegeName, examTitle, allotmentId, setAllotmentId }: ResultsStepProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const { toast } = useToast();

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
    if (!allotmentId) {
      setAllotmentId(currentId);
    }
    
    const savedAllotment: SavedAllotment = {
      id: currentId,
      collegeName,
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
    
    const history = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
    const historyIndex = history.findIndex((item: SavedAllotment) => item.id === currentId);
     if (historyIndex > -1) {
      history[historyIndex] = savedAllotment;
    } else {
      history.unshift(savedAllotment);
    }
    localStorage.setItem('dutyHistory', JSON.stringify(history));


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
      let totalDuties = 0;
      const dutiesByExam: { [key: string]: number } = {};
      uniqueExamsForExport.forEach(exam => {
        const examKey = getExamKeyForExport(exam);
        const duty = exam.invigilators.includes(inv.name) ? 1 : 0;
        dutiesByExam[examKey] = duty;
        if(duty > 0) totalDuties++;
      });
      return { ...inv, duties: dutiesByExam, totalDuties };
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
    const doc = new jsPDF({
      orientation: 'landscape',
    }) as jsPDFWithAutoTable;
  
    const head = [
      [
        { content: 'Sl No', styles: { halign: 'center' } },
        { content: 'Invigilator’s Name', styles: { halign: 'left' } },
        { content: 'Designation', styles: { halign: 'left' } },
        ...uniqueExamsForExport.map(exam => ({
          content: `${format(parseISO(exam.date), 'dd-MMM-yy')}\n${exam.subject}\n${exam.time}`,
          styles: { halign: 'center', fontSize: 8 },
        })),
        { content: 'Total', styles: { halign: 'center' } },
      ],
    ];

    const body = dutyDataForExport.map((inv, index) => {
      const row = [
        { content: index + 1, styles: { halign: 'center' } },
        inv.name,
        inv.designation,
      ];
      uniqueExamsForExport.forEach(exam => {
        const examKey = getExamKeyForExport(exam);
        row.push({
          content: inv.duties[examKey] || '0',
          styles: { halign: 'center' },
        });
      });
      row.push({ content: inv.totalDuties, styles: { halign: 'center' } });
      return row;
    });
  
    const finalExamTitle = examTitle || 'Duty Allotment Sheet';
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    doc.autoTable({
      head: head,
      body: body,
      startY: 30, // Pushed down to make space for titles
      didDrawPage: function (data) {
        // Add headers only on the first page
        if (data.pageNumber === 1) {
          // College Name (H1)
          doc.setFontSize(20);
          doc.setTextColor(40);
          doc.text(collegeName || 'College Name', pageWidth / 2, 15, { align: 'center' });
          
          // Exam Title (H2)
          doc.setFontSize(16);
          doc.text(finalExamTitle, pageWidth / 2, 22, { align: 'center' });
        }
        
        // Add page numbers to the bottom right of every page
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth - 10,
            pageHeight - 10,
            { align: 'right' }
        );
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [22, 163, 74], 
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      theme: 'grid',
    });
  
    doc.save('duty-allotment-sheet.pdf');
  };


  return (
    <div className="space-y-6">
      <Tabs defaultValue="allotment-sheet">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allotment-sheet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Duty Allotment Sheet</TabsTrigger>
          <TabsTrigger value="individual-dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Individual Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="allotment-sheet" className="mt-4">
            <AllotmentSheet 
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
