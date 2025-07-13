
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { InvigilatorDutySummary } from '@/components/invigilator-duty-summary';
import { RefreshCcw, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

type ResultsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  initialAssignments: Assignment[];
  resetApp: () => void;
  prevStep: () => void;
  examTitle: string;
  allotmentId: string | null;
  setAllotmentId: Dispatch<SetStateAction<string | null>>;
};

export function ResultsStep({ invigilators, examinations, initialAssignments, resetApp, prevStep, examTitle, allotmentId, setAllotmentId }: ResultsStepProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const { toast } = useToast();

  const handleSave = () => {
    if (examinations.length === 0) {
      toast({
        title: "Cannot Save",
        description: "There are no examinations in this allotment.",
        variant: 'destructive',
      });
      return;
    }

    const currentId = allotmentId || new Date().toISOString();

    const savedAllotment: SavedAllotment = {
      id: currentId,
      examTitle: examTitle || `Examination from ${format(parseISO(examinations[0].date), 'd-MMM-yy')}`,
      firstExamDate: examinations[0].date,
      invigilators,
      examinations,
      assignments,
    };

    const savedAllotments: SavedAllotment[] = JSON.parse(localStorage.getItem('savedAllotments') || '[]');
    const existingIndex = savedAllotments.findIndex(item => item.id === currentId);

    if (existingIndex > -1) {
      savedAllotments[existingIndex] = savedAllotment; // Update existing
    } else {
      savedAllotments.unshift(savedAllotment); // Add new
    }
    
    localStorage.setItem('savedAllotments', JSON.stringify(savedAllotments));
    setAllotmentId(currentId);

    toast({
      title: "Allotment Saved",
      description: "Your duty allotment has been successfully saved.",
      className: "bg-accent text-accent-foreground"
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="allotment-sheet">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allotment-sheet">Duty Allotment Sheet</TabsTrigger>
          <TabsTrigger value="individual-dashboard">Individual Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="allotment-sheet" className="mt-4">
            <AllotmentSheet 
              invigilators={invigilators} 
              examinations={examinations}
              assignments={assignments} 
              setAssignments={setAssignments}
            />
        </TabsContent>
        <TabsContent value="individual-dashboard" className="mt-4">
            <InvigilatorDutySummary 
              invigilators={invigilators} 
              assignments={assignments} 
            />
        </TabsContent>
      </Tabs>
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2" /> Back
        </Button>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleSave}>
              <Save className="mr-2" /> Save Allotment
            </Button>
            <Button variant="outline" onClick={resetApp}>
              <RefreshCcw className="mr-2" /> Start Over
            </Button>
        </div>
      </div>
    </div>
  );
}
