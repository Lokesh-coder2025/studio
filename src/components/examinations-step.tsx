'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Calendar as CalendarIcon, Loader2, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  subject: z.string().min(1, 'Subject is required'),
  startHour: z.string({required_error: "Hour is required."}),
  startMinute: z.string({required_error: "Minute is required."}),
  startPeriod: z.enum(['AM', 'PM']),
  endHour: z.string({required_error: "Hour is required."}),
  endMinute: z.string({required_error: "Minute is required."}),
  endPeriod: z.enum(['AM', 'PM']),
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

type ExaminationsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  setExaminations: Dispatch<SetStateAction<Examination[]>>;
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
  nextStep: () => void;
  prevStep: () => void;
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
};

export function ExaminationsStep({ invigilators, examinations, setExaminations, setAssignments, nextStep, prevStep, isGenerating, setIsGenerating }: ExaminationsStepProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      startHour: '09',
      startMinute: '00',
      startPeriod: 'AM',
      endHour: '12',
      endMinute: '00',
      endPeriod: 'PM',
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    const startTime = `${values.startHour}:${values.startMinute} ${values.startPeriod}`;
    const endTime = `${values.endHour}:${values.endMinute} ${values.endPeriod}`;
    
    const newExamination: Examination = {
      id: new Date().getTime().toString(),
      date: values.date,
      subject: values.subject,
      day: format(values.date, 'EEE'),
      startTime,
      endTime,
    };

    setExaminations((prev) => [...prev, newExamination]);
    form.reset();
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
        date: format(exam.date, 'yyyy-MM-dd'),
        subject: exam.subject,
        time: `${exam.startTime} - ${exam.endTime}`,
        rooms: 1,
        invigilatorsNeeded: 1,
        relieversNeeded: 0,
      }));

      const aiInput = {
        invigilators: invigilators.map(({ name, designation }) => ({ name, designation, duties: [] })),
        examinations: formattedExams,
      };

      const result = await optimizeDutyAssignments(aiInput);
      setAssignments(result);
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

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
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
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <div className="flex gap-2">
                <FormField control={form.control} name="startHour" render={({ field }) => (
                    <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>{hours.map(h => <SelectItem key={`start-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="startMinute" render={({ field }) => (
                    <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{minutes.map(m => <SelectItem key={`start-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="startPeriod" render={({ field }) => (
                    <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{periods.map(p => <SelectItem key={`start-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
              </div>
            </FormItem>
             <FormItem>
              <FormLabel>End Time</FormLabel>
              <div className="flex gap-2">
                <FormField control={form.control} name="endHour" render={({ field }) => (
                    <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{hours.map(h => <SelectItem key={`end-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="endMinute" render={({ field }) => (
                    <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{minutes.map(m => <SelectItem key={`end-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="endPeriod" render={({ field }) => (
                    <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{periods.map(p => <SelectItem key={`end-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
              </div>
            </FormItem>
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
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {examinations.length > 0 ? (
              examinations.map((exam, index) => (
                <TableRow key={exam.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(exam.date, "dd-MMM-yyyy")}</TableCell>
                  <TableCell>{exam.day}</TableCell>
                  <TableCell className="font-medium">{exam.subject}</TableCell>
                  <TableCell>{exam.startTime}</TableCell>
                  <TableCell>{exam.endTime}</TableCell>
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
