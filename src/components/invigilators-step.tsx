
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Invigilator } from '@/types';
import { UserPlus, Trash2, ArrowRight, Upload, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  mobileNo: z.string().regex(/^\d{10}$/, { message: 'Mobile number must be 10 digits.' }),
  designation: z.string().min(3, { message: 'Designation must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type AvailabilityDialogProps = {
  invigilator: Invigilator | null;
  onSave: (id: string, availableDays: string[]) => void;
  onClose: () => void;
};

function AvailabilityDialog({ invigilator, onSave, onClose }: AvailabilityDialogProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    // When a new invigilator is selected, initialize the dialog with their current availability
    if (invigilator) {
      setSelectedDays(invigilator.availableDays || []);
    }
  }, [invigilator]);

  if (!invigilator) return null;
  
  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave(invigilator.id, selectedDays);
    onClose();
  };

  return (
    <Dialog open={!!invigilator} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Availability for {invigilator.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid grid-cols-3 gap-4">
          {weekdays.map(day => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day}`}
                checked={selectedDays.includes(day)}
                onCheckedChange={() => handleDayToggle(day)}
              />
              <Label htmlFor={`day-${day}`} className="cursor-pointer">{day}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setSelectedDays([])}>Clear All</Button>
          <div className="flex-grow" />
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Availability</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


type InvigilatorsStepProps = {
  invigilators: Invigilator[];
  setInvigilators: Dispatch<SetStateAction<Invigilator[]>>;
  nextStep: () => void;
};

export function InvigilatorsStep({ invigilators, setInvigilators, nextStep }: InvigilatorsStepProps) {
  const { toast } = useToast();
  const [editingInvigilator, setEditingInvigilator] = useState<Invigilator | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', mobileNo: '', designation: '', email: '' },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newInvigilator: Invigilator = {
      id: new Date().getTime().toString(),
      ...values,
      availableDays: [], // Default to full-time
    };
    setInvigilators((prev) => [...prev, newInvigilator]);
    form.reset();
  }

  function deleteInvigilator(id: string) {
    setInvigilators((prev) => prev.filter((inv) => inv.id !== id));
  }

  const handleAvailabilitySave = (id: string, availableDays: string[]) => {
    setInvigilators(prev => 
      prev.map(inv => inv.id === id ? { ...inv, availableDays } : inv)
    );
  };
  
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
            const mobileKey = Object.keys(row).find((k) => k.toLowerCase().includes('mobile'));
            const emailKey = Object.keys(row).find((k) => k.toLowerCase().includes('mail'));

            if (!nameKey || !designationKey || !mobileKey || !emailKey || !row[nameKey] || !row[designationKey] || !row[mobileKey] || !row[emailKey]) {
              return null;
            }

            return {
              id: `${new Date().getTime()}-${index}`,
              name: String(row[nameKey]),
              designation: String(row[designationKey]),
              mobileNo: String(row[mobileKey]),
              email: String(row[emailKey]),
              availableDays: [],
            };
          })
          .filter((inv): inv is Invigilator => inv !== null);
        
        if (newInvigilators.length === 0) {
            toast({
                title: 'No valid invigilators found',
                description: "Ensure the Excel file has columns for 'Name', 'Designation', 'Mobile No', and 'E-Mail ID'.",
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
          description: `${addedCount} invigilators added. ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`,
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
  
  const handleEditClick = (invigilator: Invigilator) => {
    setEditingInvigilator(invigilator);
  };


  return (
    <>
      <div className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
              <FormField
                control={form.control}
                name="mobileNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile No</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g. 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Mail ID</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. lokesh@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button type="submit" size="sm">
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
                <Button type='button' size="sm" asChild className="bg-[#6666cc] text-white hover:bg-[#6666cc]/90">
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
                <TableHead>Availability</TableHead>
                <TableHead>E-Mail ID</TableHead>
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
                    <TableCell>
                      {invigilator.availableDays && invigilator.availableDays.length > 0 ? 
                        <div className="flex flex-wrap gap-1">
                          {invigilator.availableDays.map(day => <Badge key={day} variant="secondary">{day.substring(0,3)}</Badge>)}
                        </div>
                         : 
                        <Badge variant="outline">Full-Time</Badge>
                      }
                    </TableCell>
                    <TableCell>{invigilator.email}</TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end items-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="group hover:bg-purple-100" onClick={() => handleEditClick(invigilator)}>
                                    <Pencil className={cn("h-4 w-4 group-hover:text-purple-600", invigilator.availableDays && invigilator.availableDays.length > 0 ? 'text-purple-600' : 'text-primary')} />
                                    <span className="sr-only">Edit Availability</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Set Availability</p>
                            </TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon" className="group hover:bg-destructive" onClick={() => deleteInvigilator(invigilator.id)}>
                          <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No invigilators added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={nextStep} size="sm" disabled={invigilators.length === 0}>
            Continue to Examination Details <ArrowRight className="ml-2" />
          </Button>
        </div>
      </div>
      
      <AvailabilityDialog
        invigilator={editingInvigilator}
        onSave={handleAvailabilitySave}
        onClose={() => setEditingInvigilator(null)}
      />
    </>
  );
}
    

    




    
