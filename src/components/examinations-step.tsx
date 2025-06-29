'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Calendar as CalendarIcon, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';

const formSchema = z.object({
  examinations: z.array(z.object({
    date: z.date().optional(),
    day: z.string().optional(),
    subject: z.string().min(1, 'Required'),
    timings: z.string().min(1, 'Required'),
    rooms: z.coerce.number().min(1).max(35),
    invigilators: z.coerce.number().min(1).max(35),
    relievers: z.coerce.number().min(0).max(10),
  })),
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
    defaultValues: { examinations: examinations.map(e => ({...e, rooms: e.rooms || 1, invigilators: e.invigilators || 1, relievers: e.relievers || 0 })) },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "examinations",
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    const validExams = data.examinations.filter(exam => exam.date && exam.subject);
    if(validExams.length === 0) {
      toast({
        title: "No Examinations Added",
        description: "Please add at least one examination with a date and subject.",
        variant: 'destructive',
      });
      setIsGenerating(false);
      return;
    }

    try {
      const formattedExams = validExams.map(exam => ({
        date: format(exam.date!, 'yyyy-MM-dd'),
        subject: exam.subject,
        time: exam.timings,
        rooms: exam.rooms,
        invigilatorsNeeded: exam.invigilators,
        relieversNeeded: exam.relievers,
      }));

      const aiInput = {
        invigilators: invigilators.map(({ name, designation }) => ({ name, designation, duties: [] })),
        examinations: formattedExams,
      };

      const result = await optimizeDutyAssignments(aiInput);
      setAssignments(result);
      setExaminations(data.examinations.map((e, i) => ({...e, id: i, day: e.date ? format(e.date, 'EEE') : '' })));
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sl.No</TableHead>
              <TableHead className="min-w-[180px]">Date</TableHead>
              <TableHead className="min-w-[80px]">Day</TableHead>
              <TableHead className="min-w-[150px]">Subject</TableHead>
              <TableHead className="min-w-[150px]">Timings</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Invigilators</TableHead>
              <TableHead>Relievers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !form.watch(`examinations.${index}.date`) && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch(`examinations.${index}.date`) ? format(form.watch(`examinations.${index}.date`)!, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.watch(`examinations.${index}.date`)}
                        onSelect={(date) => {
                           form.setValue(`examinations.${index}.date`, date);
                           form.setValue(`examinations.${index}.day`, date ? format(date, 'EEE') : '');
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Input readOnly value={form.watch(`examinations.${index}.day`) || ''} placeholder="Day" />
                </TableCell>
                <TableCell><Input placeholder="Subject Name" {...form.register(`examinations.${index}.subject`)} /></TableCell>
                <TableCell><Input placeholder="10 AM to 1 PM" {...form.register(`examinations.${index}.timings`)} /></TableCell>
                <TableCell><Input type="number" {...form.register(`examinations.${index}.rooms`)} /></TableCell>
                <TableCell><Input type="number" {...form.register(`examinations.${index}.invigilators`)} /></TableCell>
                <TableCell><Input type="number" {...form.register(`examinations.${index}.relievers`)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep} disabled={isGenerating}>
          <ArrowLeft className="mr-2" /> Back to Invigilators
        </Button>
        <Button type="submit" disabled={isGenerating}>
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
    </form>
  );
}
