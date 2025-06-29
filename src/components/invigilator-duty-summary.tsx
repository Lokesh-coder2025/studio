'use client';

import { useState, useMemo } from 'react';
import type { Invigilator, Assignment } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Search } from 'lucide-react';

type InvigilatorDutySummaryProps = {
  invigilators: Invigilator[];
  assignments: Assignment[];
};

export function InvigilatorDutySummary({ invigilators, assignments }: InvigilatorDutySummaryProps) {
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(null);

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
        day: format(parseISO(a.date), 'EEE'),
      }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilator, assignments]);

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
        <Card>
          <CardHeader>
            <CardTitle>Invigilator's Duty Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <p><span className="font-semibold">Name:</span> {selectedInvigilator.name}</p>
                <p><span className="font-semibold">Designation:</span> {selectedInvigilator.designation}</p>
                <p><span className="font-semibold">No of Duties Allotted:</span> {invigilatorDuties.length.toString().padStart(2, '0')}</p>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Sl.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Timings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invigilatorDuties.length > 0 ? (
                    invigilatorDuties.map((duty, index) => (
                      <TableRow key={`${duty.date}-${duty.subject}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(parseISO(duty.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{duty.day}</TableCell>
                        <TableCell>{duty.subject}</TableCell>
                        <TableCell>{duty.time}</TableCell>
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
        </Card>
      ) : (
         <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Select an invigilator to view their duty summary.</p>
         </div>
      )}
    </div>
  );
}
