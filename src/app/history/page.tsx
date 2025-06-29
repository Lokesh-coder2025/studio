
'use client';

import { useEffect, useState } from 'react';
import type { Examination, SavedAllotment } from '@/types';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedAllotment[]>([]);
  const [selectedAllotment, setSelectedAllotment] = useState<SavedAllotment | null>(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary font-headline">History</h1>
            <p className="text-muted-foreground mt-2">Previously generated duty allotments.</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Saved Allotments</CardTitle>
            <CardDescription>Click on an examination to view its duty allotment details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Sl No</TableHead>
                    <TableHead>Date of First Examination</TableHead>
                    <TableHead>Name of the Examination</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length > 0 ? (
                    history.map((item, index) => (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelectedAllotment(item)}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(parseISO(item.firstExamDate), 'd-MMM-yy')}</TableCell>
                        <TableCell className="font-medium">{item.examTitle}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedAllotment} onOpenChange={(isOpen) => !isOpen && setSelectedAllotment(null)}>
          {selectedAllotment && (
            <DialogContent className="max-w-7xl w-full h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedAllotment.examTitle}</DialogTitle>
                <DialogDescription>Duty Allotment Sheet</DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-auto py-4">
                <AllotmentSheet
                  invigilators={selectedAllotment.invigilators}
                  examinations={selectedAllotment.examinations as Examination[]}
                  assignments={selectedAllotment.assignments}
                />
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
