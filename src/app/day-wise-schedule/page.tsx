
'use client';

import { useEffect, useState } from 'react';
import type { SavedAllotment, Invigilator, Assignment } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { sendBulkEmails } from '@/ai/flows/send-bulk-emails-flow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { generateInvigilatorPdf } from '@/lib/pdf-generation';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface DaySchedule {
  collegeName: string;
  examTitle: string;
  date: Date;
  sessions: {
    subject: string;
    time: string;
    invigilators: Invigilator[];
  }[];
}

export default function DayWiseSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [schedule, setSchedule] = useState<DaySchedule | null>(null);
  const [history, setHistory] = useState<SavedAllotment[]>([]);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isEmailAllConfirmOpen, setIsEmailAllConfirmOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState<{ invigilator: Invigilator, session: DaySchedule['sessions'][0] } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSchedule(null);
      return;
    }

    let foundSchedule: DaySchedule | null = null;

    // Search through all saved allotments
    for (const allotment of history) {
      const dailyAssignments = allotment.assignments.filter(a => isSameDay(parseISO(a.date), selectedDate));

      if (dailyAssignments.length > 0) {
        foundSchedule = {
          collegeName: allotment.collegeName,
          examTitle: allotment.examTitle,
          date: selectedDate,
          sessions: dailyAssignments.map(session => {
            const invigilators = allotment.invigilators.filter(inv => session.invigilators.includes(inv.name));
            return {
              subject: session.subject,
              time: session.time,
              invigilators: invigilators,
            };
          }).sort((a,b) => a.time.localeCompare(b.time)), // Sort sessions by time
        };
        break; // Stop after finding the first matching allotment for the day
      }
    }
    
    if (foundSchedule) {
      setSchedule(foundSchedule);
    } else {
      setSchedule(null);
      toast({
        variant: 'destructive',
        title: 'No Allotment Found',
        description: `No duty allotments are saved for ${format(selectedDate, 'PPP')}.`,
      });
    }

  }, [selectedDate, history, toast]);
  
  const handleDownloadPdf = () => {
    if (!schedule) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 15;

    const addHeader = () => {
        doc.setFontSize(18);
        doc.text(schedule.collegeName, doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(16);
        doc.text(schedule.examTitle, doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(14);
        doc.text('Invigilation Duty', doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(12);
        doc.text(format(schedule.date, 'PPP (EEEE)'), doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += 10;
    };
    
    addHeader();
    
    schedule.sessions.forEach((session, index) => {
        if (index > 0) {
            y += 15; // Add space between sessions
            if (y > pageHeight - 40) { // check for page break
                doc.addPage();
                y = 15;
                addHeader();
            }
        }

        doc.setFontSize(12);
        doc.text(`Subject: ${session.subject}`, 14, y);
        y += 8;

        const head = [['Sl No', 'Name of the Invigilators', 'Examination Timings']];
        const body = session.invigilators.map((inv, i) => [i + 1, inv.name, session.time]);

        doc.autoTable({
            head,
            body,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [31, 70, 110] },
        });

        y = (doc as any).lastAutoTable.finalY;
    });

    doc.save(`Duty_Allotment_${format(schedule.date, 'yyyy-MM-dd')}.pdf`);
  };
  
  const handleSendEmail = async () => {
    if (!emailToSend || !schedule) return;
    const { invigilator, session } = emailToSend;

    setIsEmailing(true);
    toast({ title: "Preparing email...", description: `Generating PDF for ${invigilator.name}.` });
    
    try {
        const duties: (Assignment & { day: string })[] = schedule.sessions
            .filter(s => s.invigilators.some(i => i.id === invigilator.id))
            .map(s => ({
                date: schedule.date.toISOString(),
                day: format(schedule.date, 'EEEE'),
                subject: s.subject,
                time: s.time,
                invigilators: [invigilator.name]
            }));

        const pdfBase64 = await generateInvigilatorPdf(invigilator, duties, schedule.collegeName, schedule.examTitle);

        if (!pdfBase64) {
          throw new Error('Failed to generate PDF.');
        }

        const emailBody = `<p>Dear ${invigilator.name},</p><p>Please find your invigilation duty summary for ${format(schedule.date, 'PPP')} attached.</p><p>Thank you,</p><p>DutyFlow</p>`;

        const result = await sendEmail({
            to: invigilator.email,
            subject: `Invigilation Duty on ${format(schedule.date, 'PPP')}`,
            htmlBody: emailBody,
            pdfBase64,
            pdfFileName: `${invigilator.name}-duty.pdf`,
        });

        if (result.success) {
            const previewUrl = result.message.split(' ').pop();
            toast({
                title: 'Email Sent!',
                description: (<span>Email sent to {invigilator.email}. Preview: <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">View</a></span>),
                className: 'bg-accent text-accent-foreground',
                duration: 10000,
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: 'Email Failed', description: errorMessage, variant: 'destructive' });
    } finally {
        setIsEmailing(false);
        setEmailToSend(null);
    }
  };

  const handleEmailAll = async () => {
    if (!schedule) return;
    setIsEmailing(true);
    toast({ title: "Preparing emails...", description: "This may take a moment." });

    try {
        const uniqueInvigilators = Array.from(new Set(schedule.sessions.flatMap(s => s.invigilators)));
        
        if (uniqueInvigilators.length === 0) {
            toast({ title: "No one to email", description: "No invigilators have duties on this day.", variant: "destructive" });
            return;
        }

        const emailPayloads = await Promise.all(uniqueInvigilators.map(async (inv) => {
            const duties = schedule.sessions
                .filter(s => s.invigilators.some(i => i.id === inv.id))
                .map(s => ({
                    date: schedule.date.toISOString(),
                    day: format(schedule.date, 'EEEE'),
                    subject: s.subject,
                    time: s.time,
                    invigilators: [inv.name]
                }));

            const pdfBase64 = await generateInvigilatorPdf(inv, duties, schedule.collegeName, schedule.examTitle);

            if (!pdfBase64) return null;
            
            return {
                to: inv.email,
                subject: `Invigilation Duty on ${format(schedule.date, 'PPP')}`,
                htmlBody: `<p>Dear ${inv.name},</p><p>Please find your duty summary for ${format(schedule.date, 'PPP')} attached.</p>`,
                pdfBase64,
                pdfFileName: `${inv.name}-duty.pdf`,
            };
        }));
        
        const validPayloads = emailPayloads.filter(p => p !== null);
        if(validPayloads.length === 0) throw new Error("Could not generate any PDFs.");

        const result = await sendBulkEmails(validPayloads as any[]);
        toast({ title: "Bulk Email Task Complete", description: `Sent: ${result.successfulEmails}, Failed: ${result.failedEmails}`, duration: 8000 });

    } catch (error) {
        toast({ title: 'Bulk Email Failed', description: error instanceof Error ? error.message : "An unknown error occurred.", variant: 'destructive' });
    } finally {
        setIsEmailing(false);
    }
  };


  const renderSchedule = () => {
    if (!schedule) {
      return (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Select a date to view the duty schedule.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-2xl font-bold text-primary">{schedule.collegeName}</h2>
            <p className="text-lg text-muted-foreground">{schedule.examTitle}</p>
            <p className="text-xl font-semibold">Invigilation Duty</p>
            <p className="font-bold pt-2">{format(schedule.date, 'PPP (EEEE)')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {schedule.sessions.map((session, sessionIndex) => (
              <div key={sessionIndex} className="border p-4 rounded-lg">
                <h4 className="font-bold text-center mb-4">{session.subject}</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left w-1/12">Sl No</th>
                      <th className="p-2 text-left w-7/12">Name of the Invigilators</th>
                      <th className="p-2 text-center w-4/12">Examination Timings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.invigilators.map((invigilator, invIndex) => (
                      <tr key={invigilator.id} className="border-b">
                        <td className="p-2 text-center">{invIndex + 1}</td>
                        <td className="p-2">{invigilator.name}</td>
                        <td className="p-2 text-center">{session.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleDownloadPdf} size="sm" disabled={isEmailing}><Download /> Download PDF</Button>
            <Button onClick={() => setIsEmailAllConfirmOpen(true)} size="sm" disabled={isEmailing}>
                {isEmailing ? <Loader2 className="animate-spin" /> : <Send />}
                Email to All
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };


  return (
    <>
      <div className="sticky top-[70px] bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm">
        <div className="flex h-[52px] items-center justify-center">
            <header className="text-center">
              <div>
                <h1 className="text-xl font-bold text-primary">Day-wise Schedule</h1>
                <p className="text-xs text-muted-foreground mt-1">Select a date to view the allotment for that day</p>
              </div>
            </header>
        </div>
      </div>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                    <CardDescription>Pick a day from the calendar.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border p-0"
                    />
                </CardContent>
             </Card>
          </div>
          <div className="md:col-span-2">
            {renderSchedule()}
          </div>
        </div>
      </div>

       <AlertDialog open={isEmailAllConfirmOpen} onOpenChange={setIsEmailAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email to All</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a duty summary to every invigilator scheduled on {selectedDate ? format(selectedDate, 'PPP') : ''}. Are you sure?
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
    </>
  );
}
