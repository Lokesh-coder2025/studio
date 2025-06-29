'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Invigilator } from '@/types';
import { UserPlus, Trash2, ArrowRight } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  designation: z.string().min(3, { message: 'Designation must be at least 3 characters.' }),
});

type InvigilatorsStepProps = {
  invigilators: Invigilator[];
  setInvigilators: Dispatch<SetStateAction<Invigilator[]>>;
  nextStep: () => void;
};

export function InvigilatorsStep({ invigilators, setInvigilators, nextStep }: InvigilatorsStepProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', designation: '' },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newInvigilator: Invigilator = {
      id: new Date().getTime().toString(),
      ...values,
    };
    setInvigilators((prev) => [...prev, newInvigilator]);
    form.reset();
  }

  function deleteInvigilator(id: string) {
    setInvigilators((prev) => prev.filter((inv) => inv.id !== id));
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invigilator’s Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Lecturer in Physics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
            <UserPlus className="mr-2" /> Add Invigilator
          </Button>
        </form>
      </Form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sl. No</TableHead>
              <TableHead>Invigilator's Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invigilators.length > 0 ? (
              invigilators.map((invigilator, index) => (
                <TableRow key={invigilator.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{invigilator.name}</TableCell>
                  <TableCell>{invigilator.designation}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteInvigilator(invigilator.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No invigilators added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={invigilators.length === 0}>
          Continue to Examination Details <ArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
