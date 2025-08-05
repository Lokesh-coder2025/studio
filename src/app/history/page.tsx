
'use client';

import { useEffect, useState } from 'react';
import type { Examination, SavedAllotment } from '@/types';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedAllotment[]>([]);
  const [selectedAllotment, setSelectedAllotment] = useState<SavedAllotment | null>(null);
  const [allotmentToDeleteId, setAllotmentToDeleteId] = useState<string | null>(null);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('dutyHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  const handleDelete = (idToDelete: string) => {
    const updatedHistory = history.filter((item) => item.id !== idToDelete);
    setHistory(updatedHistory);
    localStorage.setItem('dutyHistory', JSON.stringify(updatedHistory));
    setAllotmentToDeleteId(null);
    toast({
      title: "Allotment Deleted",
      description: "The saved allotment has been successfully removed from history.",
    });
  };

  const handleDeleteAll = () => {
    setHistory([]);
    localStorage.removeItem('dutyHistory');
    setIsDeleteAllAlertOpen(false);
    toast({
      title: "History Cleared",
      description: "All previously generated allotments have been deleted from history.",
      variant: "destructive",
    });
  };

  return (
    <>
      <div className="sticky top-[112px] bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm">
        <div className="flex h-[52px] items-center justify-center">
            <header className="text-center">
              <div>
                <h1 className="text-xl font-bold text-primary">History</h1>
                <p className="text-xs text-muted-foreground mt-1">Previously generated duty allotments</p>
              </div>
            </header>
        </div>
      </div>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Saved Allotments</CardTitle>
                  <CardDescription>Click on a row to view allotment details. Use the delete icon to remove an entry.</CardDescription>
                </div>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteAllAlertOpen(true)}
                  disabled={history.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Sl No</TableHead>
                      <TableHead>Date of First Examination</TableHead>
                      <TableHead>Name of the Examination</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length > 0 ? (
                      history.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="cursor-pointer" onClick={() => setSelectedAllotment(item)}>{index + 1}</TableCell>
                          <TableCell className="cursor-pointer" onClick={() => setSelectedAllotment(item)}>{format(parseISO(item.firstExamDate), 'd-MMM-yy')}</TableCell>
                          <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedAllotment(item)}>{item.examTitle}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="group hover:bg-destructive" onClick={() => setAllotmentToDeleteId(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
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
              <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{selectedAllotment.examTitle}</DialogTitle>
                  <DialogDescription>Duty Allotment Sheet</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-auto py-4">
                  <AllotmentSheet
                    invigilators={selectedAllotment.invigilators}
                    examinations={selectedAllotment.examinations as Examination[]}
                    assignments={selectedAllotment.assignments}
                    setAssignments={() => {}}
                  />
                </div>
              </DialogContent>
            )}
          </Dialog>

          <AlertDialog open={!!allotmentToDeleteId} onOpenChange={(isOpen) => !isOpen && setAllotmentToDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this allotment from your history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (allotmentToDeleteId) {
                      handleDelete(allotmentToDeleteId);
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete ALL previously generated allotments from your history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAll}
                >
                  Yes, Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
