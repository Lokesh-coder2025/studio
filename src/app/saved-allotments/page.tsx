
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedAllotment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
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

export default function SavedAllotmentsPage() {
  const [savedAllotments, setSavedAllotments] = useState<SavedAllotment[]>([]);
  const [allotmentToDeleteId, setAllotmentToDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedAllotments') || '[]');
    setSavedAllotments(saved);
  }, []);

  const handleLoad = (idToLoad: string) => {
    router.push(`/?load=${idToLoad}`);
  };

  const handleDelete = (idToDelete: string) => {
    const updatedAllotments = savedAllotments.filter((item) => item.id !== idToDelete);
    setSavedAllotments(updatedAllotments);
    localStorage.setItem('savedAllotments', JSON.stringify(updatedAllotments));
    setAllotmentToDeleteId(null);
    toast({
      title: "Allotment Deleted",
      description: "The saved allotment has been successfully removed.",
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary font-headline">Saved Allotments</h1>
            <p className="text-muted-foreground mt-2">Load a previously saved allotment to continue editing.</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Saved Sessions</CardTitle>
            <CardDescription>Click on an allotment to load it for editing and exporting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Sl No</TableHead>
                    <TableHead>Date of First Examination</TableHead>
                    <TableHead>Name of the Examination</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedAllotments.length > 0 ? (
                    savedAllotments.map((item, index) => (
                      <TableRow key={item.id} className="cursor-pointer">
                        <TableCell onClick={() => handleLoad(item.id)}>{index + 1}</TableCell>
                        <TableCell onClick={() => handleLoad(item.id)}>{format(parseISO(item.firstExamDate), 'd-MMM-yy')}</TableCell>
                        <TableCell className="font-medium" onClick={() => handleLoad(item.id)}>{item.examTitle}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleLoad(item.id)}>
                            <Edit className="h-4 w-4 text-primary" />
                            <span className="sr-only">Load</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setAllotmentToDeleteId(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No saved allotments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!allotmentToDeleteId} onOpenChange={(isOpen) => !isOpen && setAllotmentToDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this allotment.
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
      </div>
    </div>
  );
}
