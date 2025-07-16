
'use client';

import { useState, useMemo, useRef } from 'react';
import type { Invigilator, Assignment } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Search, Download, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/ai/flows/send-email-flow';

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
  const [isEmailConfirmationOpen, setIsEmailConfirmationOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        day: format(parseISO(a.date), 'EEEE'),
      }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilator, assignments]);

  const generatePdfBlob = async (): Promise<string | null> => {
    const input = summaryCardRef.current;
    if (!input) return null;

    let pdfButton, emailButton, signature;
    input.classList.add('pdf-render');
    
    pdfButton = input.querySelector('#download-pdf-btn');
    if (pdfButton) (pdfButton as HTMLElement).style.display = 'none';
    
    emailButton = input.querySelector('#send-email-btn');
    if (emailButton) (emailButton as HTMLElement).style.display = 'none';

    signature = input.querySelector('#pdf-signature');
    if (signature) (signature as HTMLElement).style.visibility = 'visible';

    try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        let imgWidth = pdfWidth - 20; // Add some margin
        let imgHeight = imgWidth / ratio;
        
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = 10; // Top margin

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        return pdf.output('datauristring').split(',')[1];
    } finally {
        input.classList.remove('pdf-render');
        if (pdfButton) (pdfButton as HTMLElement).style.display = 'flex';
        if (emailButton) (emailButton as HTMLElement).style.display = 'flex';
        if (signature) (signature as HTMLElement).style.visibility = 'hidden';
    }
  };

  const handleDownloadPdf = async () => {
    const pdfBase64 = await generatePdfBlob();
    if (pdfBase64 && selectedInvigilator) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `${selectedInvigilator.name}-duty-summary.pdf`;
      link.click();
    }
  };
  
  const handleSendEmail = async () => {
    if (!selectedInvigilator) return;
    setIsSendingEmail(true);

    try {
      const pdfBase64 = await generatePdfBlob();
      if (!pdfBase64) {
        throw new Error('Failed to generate PDF for emailing.');
      }
      
      const emailBody = `
        <p>Dear ${selectedInvigilator.name},</p>
        <p>Please find your invigilation duty summary attached to this email.</p>
        <p>Thank you,</p>
        <p>DutyFlow</p>
      `;

      const result = await sendEmail({
        to: selectedInvigilator.email,
        subject: 'Your Invigilation Duty Summary',
        htmlBody: emailBody,
        pdfBase64,
        pdfFileName: `${selectedInvigilator.name}-duty-summary.pdf`,
      });

      if (result.success) {
        toast({
          title: 'Email Sent!',
          description: `An email has been sent to ${selectedInvigilator.email}. Preview: ${result.message.split(' ').pop()}`,
          className: 'bg-accent text-accent-foreground',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: 'Email Failed',
        description: `Could not send email. ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
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
                font-family: "Century Gothic", sans-serif !important;
                font-size: 14px !important;
              }
              .pdf-render .table {
                table-layout: fixed;
                width: 100%;
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
                <div className="p-6 pb-4 space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-x-8">
                        <div><span className="font-semibold">Name:</span> {selectedInvigilator.name}</div>
                        <div><span className="font-semibold">Designation:</span> {selectedInvigilator.designation}</div>
                        <div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-8">
                        <div><span className="font-semibold">Mobile No:</span> {selectedInvigilator.mobileNo}</div>
                        <div><span className="font-semibold">E-Mail ID:</span> {selectedInvigilator.email}</div>
                        <div className="text-right"><span className="font-semibold">No of Duties Allotted:</span> {invigilatorDuties.length.toString().padStart(2, '0')}</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="rounded-md border">
                <Table className="table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-bold">Sl.No</TableHead>
                      <TableHead className="text-center font-bold">Date</TableHead>
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
                          <TableCell className="text-center">{format(parseISO(duty.date), 'dd.MM.yyyy')}</TableCell>
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
            <CardFooter className="flex justify-between items-center p-6">
                <div>
                   <p id="pdf-signature" className="text-xs text-muted-foreground invisible">Generated by DutyFlow</p>
                </div>
                <div className="flex gap-2">
                   <Button id="send-email-btn" onClick={() => setIsEmailConfirmationOpen(true)} variant="outline" size="sm" disabled={isSendingEmail}>
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Send Email
                        </>
                      )}
                   </Button>
                   <Button id="download-pdf-btn" onClick={handleDownloadPdf} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                </div>
            </CardFooter>
          </Card>
           <AlertDialog open={isEmailConfirmationOpen} onOpenChange={setIsEmailConfirmationOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Email</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to send the duty summary to {selectedInvigilator.name} at {selectedInvigilator.email}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setIsEmailConfirmationOpen(false);
                  handleSendEmail();
                }}>
                  Send
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
         <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select an invigilator to view their duty summary.</p>
         </div>
      )}
    </div>
  );
}
