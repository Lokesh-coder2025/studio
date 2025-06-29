'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Calendar as CalendarIcon, Loader2, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  subject: z.string().min(1, 'Subject is required'),
  timings: z.string().min(1, 'Timings are required'),
});

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
      timings: '',
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    const newExamination: Examination = {
      id: new Date().getTime().toString(),
      ...values,
      day: format(values.date, 'EEE'),
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
        time: exam.timings,
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start md:items-end">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
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
                <FormControl>
                  <Input placeholder="Subject Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timings</FormLabel>
                <FormControl>
                  <Input placeholder="10 AM to 1 PM" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
            <Plus className="mr-2" /> Add Examination
          </Button>
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
                  <TableCell>{exam.timings}</TableCell>
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
                <TableCell colSpan={6} className="h-24 text-center">
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
