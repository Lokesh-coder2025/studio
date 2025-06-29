'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Invigilator } from '@/types';
import { UserPlus, Trash2, ArrowRight, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast({ title: 'No file selected', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error('File could not be read.');

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const newInvigilators = json
          .map((row, index) => {
            const nameKey = Object.keys(row).find((k) => k.toLowerCase().includes('name'));
            const designationKey = Object.keys(row).find((k) => k.toLowerCase().includes('designation'));

            if (!nameKey || !designationKey || !row[nameKey] || !row[designationKey]) {
              return null;
            }

            return {
              id: `${new Date().getTime()}-${index}`,
              name: String(row[nameKey]),
              designation: String(row[designationKey]),
            };
          })
          .filter((inv): inv is Invigilator => inv !== null);
        
        if (newInvigilators.length === 0) {
            toast({
                title: 'No valid invigilators found',
                description: "Ensure the Excel file has columns for 'Invigilator's Name' and 'Designation'.",
                variant: 'destructive',
            });
            return;
        }

        const existingNames = new Set(invigilators.map((i) => i.name));
        const uniqueNewInvigilators = newInvigilators.filter((i) => !existingNames.has(i.name));
        
        const addedCount = uniqueNewInvigilators.length;
        const skippedCount = newInvigilators.length - addedCount;

        setInvigilators((prev) => [...prev, ...uniqueNewInvigilators]);
        
        toast({
          title: 'Import Successful',
          description: `${addedCount} invigilators added. ${skippedCount > 0 ? `${skippedCount} duplicates skipped.` : ''}`,
          className: 'bg-accent text-accent-foreground',
        });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast({
          title: 'Import Failed',
          description: 'Could not parse the Excel file. Please check the format.',
          variant: 'destructive',
        });
      } finally {
        if (e.target) {
            e.target.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'An error occurred while reading the file.',
        variant: 'destructive',
      });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invigilator’s Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Lokesh D" {...field} />
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
                    <Input placeholder="e.g. Lecturer in English" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit">
              <UserPlus className="mr-2" /> Add Invigilator
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">or</span>
              <Input
                id="excel-upload"
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <Button asChild variant="outline">
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload className="mr-2" /> Import from Excel
                </label>
              </Button>
            </div>
          </div>
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
