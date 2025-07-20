
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useMemo, useRef } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { InvigilatorDutySummary } from '@/components/invigilator-duty-summary';
import { ArrowLeft, Save, Download, Send, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { exportToExcelWithFormulas } from '@/lib/excel-export';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { generateInvigilatorPdf } from '@/lib/pdf-generation';
import { sendBulkEmails } from '@/ai/flows/send-bulk-emails-flow';


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
  const [isSendingAllEmails, setIsSendingAllEmails] = useState(false);
  const [isEmailAllConfirmOpen, setIsEmailAllConfirmOpen] = useState(false);
  const allotmentSheetRef = useRef<HTMLDivElement>(null);
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
        { content: 'Total', styles: { halign: 'center', fontStyle: 'bold' } },
      ],
    ];

    const body = dutyDataForExport.map((inv, index) => {
      const row: any[] = [
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
      row.push({ content: inv.totalDuties, styles: { halign: 'center', fontStyle: 'bold' } });
      return row;
    });
  
    const finalExamTitle = examTitle || 'Duty Allotment Sheet';
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    doc.autoTable({
      head: head,
      body: body,
      startY: 30,
      didDrawPage: function (data) {
        if (data.pageNumber === 1) {
          doc.setFontSize(20);
          doc.setTextColor(40);
          doc.text(collegeName || 'College Name', pageWidth / 2, 15, { align: 'center' });
          
          doc.setFontSize(16);
          doc.text(finalExamTitle, pageWidth / 2, 22, { align: 'center' });
        }
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 71, 171], // Cobalt Blue
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      theme: 'grid',
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - 10,
            pageHeight - 10,
            { align: 'right' }
        );

        if (i === pageCount) {
             doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                'Generated by DutyFlow',
                pageWidth - 10,
                pageHeight - 5,
                { align: 'right' }
            );
        }
    }
  
    doc.save('duty-allotment-sheet.pdf');
  };

  const handleEmailAll = async () => {
    setIsSendingAllEmails(true);
    toast({ title: "Preparing emails...", description: "Generating PDFs for all invigilators. This may take a moment." });

    try {
      const invigilatorsWithDuties = invigilators.filter(inv => 
        assignments.some(a => a.invigilators.includes(inv.name))
      );

      if (invigilatorsWithDuties.length === 0) {
        toast({ title: "No one to email", description: "No invigilators have duties assigned.", variant: "destructive" });
        return;
      }

      const emailPayloads = await Promise.all(invigilatorsWithDuties.map(async (inv) => {
        const duties = assignments
          .filter(a => a.invigilators.includes(inv.name))
          .map(a => ({
            ...a,
            day: format(parseISO(a.date), 'EEEE'),
          }))
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const pdfBase64 = await generateInvigilatorPdf(
            inv, 
            duties,
            collegeName,
            examTitle
        );

        if (!pdfBase64) {
          console.error(`Failed to generate PDF for ${inv.name}`);
          return null;
        }

        return {
          to: inv.email,
          subject: 'Your Invigilation Duty Summary',
          htmlBody: `<p>Dear ${inv.name},</p><p>Please find your invigilation duty summary attached.</p><p>Thank you,<br/>DutyFlow</p>`,
          pdfBase64,
          pdfFileName: `${inv.name}-duty-summary.pdf`,
        };
      }));

      const validPayloads = emailPayloads.filter(p => p !== null);
      if (validPayloads.length === 0) {
        throw new Error("Could not generate any PDFs to send.");
      }

      toast({ title: "Sending emails...", description: `Sending emails to ${validPayloads.length} invigilators.` });
      
      const result = await sendBulkEmails(validPayloads as any[]);

      if (result.failedEmails > 0) {
        toast({
          title: "Partial Success",
          description: `Sent ${result.successfulEmails} emails. ${result.failedEmails} failed.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "All Emails Sent!",
          description: `Successfully sent duty summaries to ${result.successfulEmails} invigilators.`,
          className: "bg-accent text-accent-foreground"
        });
      }

    } catch (error) {
      console.error("Bulk email error:", error);
      toast({ title: "Bulk Email Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsSendingAllEmails(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="allotment-sheet">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allotment-sheet" className="border-2 border-primary/50 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Duty Allotment Sheet</TabsTrigger>
          <TabsTrigger value="individual-dashboard" className="border-2 border-primary/50 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Individual Dashboard</TabsTrigger>
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
              collegeName={collegeName}
              examTitle={examTitle}
            />
        </TabsContent>
      </Tabs>
      <div className="flex justify-between items-center pt-4 border-t mt-4">
        <Button variant="outline" onClick={prevStep} disabled={isSendingAllEmails}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex flex-wrap gap-2 justify-end">
           <Button onClick={handleSave} disabled={isSendingAllEmails}>
              <Save /> Save Allotment
            </Button>
           <Button onClick={() => setIsEmailAllConfirmOpen(true)} disabled={isSendingAllEmails}>
              {isSendingAllEmails ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send /> Email All Summaries
                </>
              )}
            </Button>
           <Button variant="outline" onClick={handleDownloadPdf} disabled={isSendingAllEmails}>
              <Download /> Download as PDF
            </Button>
            <Button onClick={handleExportExcel} disabled={isSendingAllEmails}>
              <Download /> Download as Excel
            </Button>
        </div>
      </div>
      <AlertDialog open={isEmailAllConfirmOpen} onOpenChange={setIsEmailAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Email</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a PDF summary and send an email to every invigilator who has at least one duty assigned. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIsEmailAllConfirmOpen(false);
              handleEmailAll();
            }}>
              Yes, Email All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    

    
