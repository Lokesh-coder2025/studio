
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useMemo, useRef } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { InvigilatorDutySummary } from '@/components/invigilator-duty-summary';
import { ArrowLeft, Save, Download, Send, Loader2, MessageSquare, Maximize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { exportToExcelWithFormulas } from '@/lib/excel-export';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { generateInvigilatorPdf } from '@/lib/pdf-generation';
import { sendBulkEmails } from '@/ai/flows/send-bulk-emails-flow';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Extend the jsPDF type to include the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}

type ResultsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  initialAssignments: Assignment[];
  resetApp: () => void;
  prevStep: () => void;
  collegeName: string;
  setCollegeName: Dispatch<SetStateAction<string>>;
  examTitle: string;
  setExamTitle: Dispatch<SetStateAction<string>>;
  allotmentId: string | null;
  setAllotmentId: Dispatch<SetStateAction<string | null>>;
};

export function ResultsStep({ invigilators, examinations, initialAssignments, prevStep, collegeName, setCollegeName, examTitle, setExamTitle, allotmentId, setAllotmentId }: ResultsStepProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [isSendingAllEmails, setIsSendingAllEmails] = useState(false);
  const [isEmailAllConfirmOpen, setIsEmailAllConfirmOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
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
      ...uniqueExamsForExport.map(exam => `${format(parseISO(exam.date), "dd-MMM-yy")}\n${exam.subject}\n${exam.time}`),
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
    
    const roomTotals = uniqueExamsForExport.map(exam => {
        const fullExam = examinations.find(e => e.subject === exam.subject && format(parseISO(e.date), 'yyyy-MM-dd') === exam.date && `${e.startTime} - ${e.endTime}` === exam.time);
        return fullExam?.roomsAllotted || 0;
    });

    const relieverTotals = uniqueExamsForExport.map(exam => {
        const fullExam = examinations.find(e => e.subject === exam.subject && format(parseISO(e.date), 'yyyy-MM-dd') === exam.date && `${e.startTime} - ${e.endTime}` === exam.time);
        return fullExam?.relieversRequired || 0;
    });

    const footerRows = [
        ['', '', 'No of Rooms', ...roomTotals],
        ['', '', 'No of Relievers', ...relieverTotals],
        ['', '', 'Total Duties Allotted'], // Label for sum, formulas will be added
    ];

    exportToExcelWithFormulas({
        headers, 
        dataRows, 
        footerRows, 
        collegeName,
        examTitle,
        sheetName: 'Duty Allotment', 
        fileName: 'duty-allotment-sheet'
    });
  };

  const handleDownloadPdf = () => {
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });
    try {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3',
        });

        const head = [
            [
                { content: 'Sl.No', styles: { halign: 'center' } },
                { content: 'Invigilator’s Name', styles: { minCellWidth: 35 } },
                { content: 'Designation', styles: { minCellWidth: 35 } },
                ...uniqueExamsForExport.map(exam => ({
                    content: `${format(parseISO(exam.date), 'dd-MMM-yy')}\n${exam.subject}\n${exam.time}`,
                    styles: { halign: 'center' }
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
            uniqueExamsForExport.forEach((exam) => {
                const examKey = getExamKeyForExport(exam);
                row.push({ content: inv.duties[examKey] || 0, styles: { halign: 'center' } });
            });
            row.push({ content: inv.totalDuties, styles: { halign: 'center', fontStyle: 'bold' } });
            return row;
        });
        
        const examDetailsMap = new Map<string, Examination>();
        examinations.forEach((exam) => {
            const examKey = getExamKeyForExport({
                date: format(parseISO(exam.date), 'yyyy-MM-dd'),
                subject: exam.subject,
                time: `${exam.startTime} - ${exam.endTime}`,
            });
            examDetailsMap.set(examKey, exam);
        });
        
        const allottedTotals = uniqueExamsForExport.map(exam => 
            dutyDataForExport.reduce((sum, inv) => sum + (inv.duties[getExamKeyForExport(exam)] || 0), 0)
        );

        const roomTotals = uniqueExamsForExport.map(exam => {
            const key = getExamKeyForExport(exam);
            return examDetailsMap.get(key)?.roomsAllotted || 0;
        });

        const relieverTotals = uniqueExamsForExport.map(exam => {
            const key = getExamKeyForExport(exam);
            return examDetailsMap.get(key)?.relieversRequired || 0;
        });
        
        const foot = [
             [
                { content: 'No of Rooms', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                ...roomTotals.map(t => ({ content: t, styles: { halign: 'center' } })),
                { content: roomTotals.reduce((a, b) => a + b, 0), styles: { halign: 'center', fontStyle: 'bold' } }
            ],
            [
                { content: 'No of Relievers', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                ...relieverTotals.map(t => ({ content: t, styles: { halign: 'center' } })),
                { content: relieverTotals.reduce((a, b) => a + b, 0), styles: { halign: 'center', fontStyle: 'bold' } }
            ],
            [
                { content: 'Total Duties Allotted', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                ...allottedTotals.map(t => ({ content: t, styles: { halign: 'center' } })),
                { content: allottedTotals.reduce((a, b) => a + b, 0), styles: { halign: 'center', fontStyle: 'bold' } }
            ],
        ];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(collegeName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(18);
        doc.text(examTitle, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        doc.setFontSize(16);
        doc.text('Invigilation Duty Allotment Sheet', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
        doc.setFont('helvetica', 'normal');


        doc.autoTable({
            startY: 32,
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            headStyles: {
                fillColor: [31, 69, 110], 
                textColor: 255,
                fontStyle: 'bold',
                valign: 'middle',
                fontSize: 7,
            },
            bodyStyles: {
                fontSize: 12,
                fontStyle: 'bold',
            },
            footStyles: {
                fillColor: [240, 240, 240],
                textColor: 0,
                fontSize: 7,
            },
            didParseCell: (data) => {
                if (data.row.section === 'body' && data.row.index % 2 === 0) {
                    data.cell.styles.fillColor = '#f9f9f9';
                }
            }
        });

        doc.save('duty-allotment-sheet.pdf');

    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast({ title: 'PDF Generation Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
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
        <div className="flex justify-between items-center">
            <TabsList style={{backgroundColor: '#FFF5EE'}}>
              <TabsTrigger value="allotment-sheet">Duty Allotment Sheet</TabsTrigger>
              <TabsTrigger value="individual-dashboard">Individual Dashboard</TabsTrigger>
            </TabsList>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsFullScreen(true)}>
                        <Maximize />
                        <span className="sr-only">Full Screen</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>View Full-Screen</p>
                </TooltipContent>
            </Tooltip>
        </div>
        <TabsContent value="allotment-sheet" className="mt-4">
            <div ref={allotmentSheetRef} className="bg-white p-4">
              <AllotmentSheet 
                invigilators={invigilators} 
                examinations={examinations}
                assignments={assignments} 
                setAssignments={setAssignments}
                collegeName={collegeName}
                setCollegeName={setCollegeName}
                examTitle={examTitle}
                setExamTitle={setExamTitle}
              />
            </div>
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
        <Button onClick={prevStep} disabled={isSendingAllEmails} variant="outline" size="sm">
          <ArrowLeft /> Back
        </Button>
        <div className="flex flex-wrap gap-2 justify-end">
           <Button onClick={handleSave} disabled={isSendingAllEmails} size="sm">
              <Save /> Save Allotment
            </Button>
           <Button onClick={() => setIsEmailAllConfirmOpen(true)} disabled={isSendingAllEmails} size="sm">
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
           <Button onClick={handleDownloadPdf} disabled={isSendingAllEmails} size="sm">
              <Download /> Download as PDF
            </Button>
            <Button onClick={handleExportExcel} disabled={isSendingAllEmails} size="sm">
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
      
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{examTitle || "Duty Allotment Sheet"}</DialogTitle>
                <DialogDescription>
                    Full-screen view. You can edit the allotments here.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-auto py-4">
                <AllotmentSheet
                    invigilators={invigilators}
                    examinations={examinations}
                    assignments={assignments}
                    setAssignments={setAssignments}
                    collegeName={collegeName}
                    setCollegeName={setCollegeName}
                    examTitle={examTitle}
                    setExamTitle={setExamTitle}
                />
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
