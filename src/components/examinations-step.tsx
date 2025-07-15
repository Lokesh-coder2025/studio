
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Calendar as CalendarIcon, Loader2, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';

const sessionSchema = z.object({
    subject: z.string(),
    startHour: z.string(),
    startMinute: z.string(),
    startPeriod: z.enum(['AM', 'PM']),
    endHour: z.string(),
    endMinute: z.string(),
    endPeriod: z.enum(['AM', 'PM']),
    roomsAllotted: z.string(),
  }).partial({ subject: true, roomsAllotted: true });

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  session1: sessionSchema,
  session2: sessionSchema,
}).refine(data => {
    // This allows the form to be valid if at least one subject is selected,
    // and that subject is not the placeholder 'none' value.
    const s1Subject = data.session1.subject && data.session1.subject !== 'none';
    const s2Subject = data.session2.subject && data.session2.subject !== 'none';
    return s1Subject || s2Subject;
}, {
  message: "At least one session's subject must be filled out.",
  path: ["session1.subject"],
});


const subjects = [
  "English", "Kannada", "Hindi", "Sanskrit", "Physics", "Chemistry",
  "Mathematics", "Biology", "Computer Science", "Electronics",
  "Basic Maths", "Economics", "Business Studies", "Accountancy",
  "Statistics", "Other"
];

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];
const periods = ['AM', 'PM'];
const roomNumbers = Array.from({ length: 50 }, (_, i) => (i + 1).toString());

type ExaminationsStepProps = {
  examTitle: string;
  setExamTitle: Dispatch<SetStateAction<string>>;
  invigilators: Invigilator[];
  examinations: Examination[];
  setExaminations: Dispatch<SetStateAction<Examination[]>>;
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
  setAllotmentId: Dispatch<SetStateAction<string | null>>;
  nextStep: () => void;
  prevStep: () => void;
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
};

export function ExaminationsStep({ examTitle, setExamTitle, invigilators, examinations, setExaminations, setAssignments, setAllotmentId, nextStep, prevStep, isGenerating, setIsGenerating }: ExaminationsStepProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session1: {
        subject: 'none',
        startHour: '09',
        startMinute: '00',
        startPeriod: 'AM',
        endHour: '12',
        endMinute: '00',
        endPeriod: 'PM',
        roomsAllotted: '1',
      },
      session2: {
        subject: 'none',
        startHour: '02',
        startMinute: '00',
        startPeriod: 'PM',
        endHour: '05',
        endMinute: '00',
        endPeriod: 'PM',
        roomsAllotted: '1',
      },
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    const newExams: Examination[] = [];

    const processSession = (session: z.infer<typeof sessionSchema>) => {
      if (session.subject && session.subject !== 'none' && session.roomsAllotted) {
        const startTime = `${session.startHour}:${session.startMinute} ${session.startPeriod}`;
        const endTime = `${session.endHour}:${session.endMinute} ${session.endPeriod}`;
        
        return {
          id: `${new Date().getTime()}-${session.subject}`,
          date: values.date.toISOString(),
          subject: session.subject,
          day: format(values.date, 'EEE'),
          startTime,
          endTime,
          roomsAllotted: parseInt(session.roomsAllotted, 10),
        };
      }
      return null;
    }

    const exam1 = processSession(values.session1);
    if (exam1) newExams.push(exam1);

    const exam2 = processSession(values.session2);
    if (exam2) newExams.push(exam2);

    if (newExams.length > 0) {
        setExaminations((prev) => [...prev, ...newExams].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        form.reset({
            ...values,
            date: undefined,
            session1: {...form.getValues('session1'), subject: 'none'},
            session2: {...form.getValues('session2'), subject: 'none'},
        });
    } else {
        toast({
            title: "No subject selected",
            description: "Please select a subject for at least one session.",
            variant: "destructive"
        })
    }
  }

  function deleteExamination(id: string) {
    setExaminations((prev) => prev.filter((exam) => exam.id !== id));
  }
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    if (examinations.length === 0) {
      toast({
        title: "No Examinations Added",
        description: "Please add at least one examination.",
        variant: 'destructive',
      });
      setIsGenerating(false);
      return;
    }

    try {
      const formattedExams = examinations.map(exam => ({
        date: format(parseISO(exam.date), 'yyyy-MM-dd'),
        subject: exam.subject,
        time: `${exam.startTime} - ${exam.endTime}`,
        rooms: exam.roomsAllotted,
        invigilatorsNeeded: exam.roomsAllotted,
      }));

      // For the AI, we only need name, designation, and any pre-existing duties.
      // We will create a simplified version of the invigilator list.
      const invigilatorsForAI = invigilators.map(({ name, designation }) => ({ 
        name, 
        designation, 
        duties: [] // Assuming no pre-existing duties from this UI for now
      }));

      const aiInput = {
        invigilators: invigilatorsForAI,
        examinations: formattedExams,
      };

      const result = await optimizeDutyAssignments(aiInput);
      setAssignments(result);
      
      const newAllotmentId = new Date().toISOString();
      setAllotmentId(newAllotmentId);
      
      if (result.length > 0) {
        const firstExamDate = examinations[0].date;
        const savedAllotment: SavedAllotment = {
          id: newAllotmentId,
          examTitle: examTitle || `Examination from ${format(parseISO(firstExamDate), 'd-MMM-yy')}`,
          firstExamDate: firstExamDate,
          invigilators,
          examinations,
          assignments: result,
        };
        const history = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
        history.unshift(savedAllotment);
        localStorage.setItem('dutyHistory', JSON.stringify(history));
      }

      toast({
        title: "Success!",
        description: "Duty allotment generated successfully.",
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
      nextStep();
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate the duty allotment. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTimeFields = (sessionName: 'session1' | 'session2', label: string) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex gap-2">
            <Controller control={form.control} name={`${sessionName}.startHour`} render={({ field }) => (
                <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{hours.map(h => <SelectItem key={`start-h-${sessionName}-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
            <Controller control={form.control} name={`${sessionName}.startMinute`} render={({ field }) => (
                <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{minutes.map(m => <SelectItem key={`start-m-${sessionName}-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
            <Controller control={form.control} name={`${sessionName}.startPeriod`} render={({ field }) => (
                <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{periods.map(p => <SelectItem key={`start-p-${sessionName}-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
        </div>
        <div className="flex gap-2">
            <Controller control={form.control} name={`${sessionName}.endHour`} render={({ field }) => (
                <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{hours.map(h => <SelectItem key={`end-h-${sessionName}-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
            <Controller control={form.control} name={`${sessionName}.endMinute`} render={({ field }) => (
                <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{minutes.map(m => <SelectItem key={`end-m-${sessionName}-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
            <Controller control={form.control} name={`${sessionName}.endPeriod`} render={({ field }) => (
                <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{periods.map(p => <SelectItem key={`end-p-${sessionName}-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )} />
        </div>
    </FormItem>
  )

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="w-full max-w-sm">
          <Label htmlFor="exam-title" className="text-sm font-medium">Name of the Examination</Label>
          <Input
            id="exam-title"
            placeholder="e.g. Final Examinations, June 2024"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 border p-4 rounded-md">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className='max-w-xs'>
                <FormLabel>Date for Sessions</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Select a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Session 1 */}
              <div className='space-y-4 p-4 border rounded-md'>
                  <h3 className="font-semibold text-lg text-primary">Session 1 (e.g. Morning)</h3>
                   <FormField
                      control={form.control}
                      name="session1.subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {subjects.map((subject) => (
                                <SelectItem key={`s1-${subject}`} value={subject}>
                                  {subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {renderTimeFields('session1', 'Time')}
                    <FormField
                      control={form.control}
                      name="session1.roomsAllotted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>No of Rooms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rooms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roomNumbers.map((num) => (
                                <SelectItem key={`s1-room-${num}`} value={num}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>

              {/* Session 2 */}
              <div className='space-y-4 p-4 border rounded-md'>
                  <h3 className="font-semibold text-lg text-primary">Session 2 (e.g. Afternoon)</h3>
                  <FormField
                      control={form.control}
                      name="session2.subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {subjects.map((subject) => (
                                <SelectItem key={`s2-${subject}`} value={subject}>
                                  {subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {renderTimeFields('session2', 'Time')}
                     <FormField
                      control={form.control}
                      name="session2.roomsAllotted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>No of Rooms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rooms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roomNumbers.map((num) => (
                                <SelectItem key={`s2-room-${num}`} value={num}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>
          </div>

          <div className='flex justify-end'>
            <Button type="submit">
              <Plus className="mr-2" /> Add Examination
            </Button>
          </div>
        </form>
      </Form>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sl.No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Timings</TableHead>
              <TableHead>No of Rooms</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {examinations.length > 0 ? (
              examinations.map((exam, index) => (
                <TableRow key={exam.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(parseISO(exam.date), "dd-MMM-yyyy")}</TableCell>
                  <TableCell>{exam.day}</TableCell>
                  <TableCell className="font-medium">{exam.subject}</TableCell>
                  <TableCell>{exam.startTime} - {exam.endTime}</TableCell>
                  <TableCell className="text-center">{exam.roomsAllotted}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteExamination(exam.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No examinations added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep} disabled={isGenerating}>
          <ArrowLeft className="mr-2" /> Back to Invigilators
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating || examinations.length === 0}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              Generate Duty Allotment <ArrowRight className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
