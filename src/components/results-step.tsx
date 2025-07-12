
'use client';

import { useState } from 'react';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AllotmentSheet } from '@/components/allotment-sheet';
import { InvigilatorDutySummary } from '@/components/invigilator-duty-summary';
import { RefreshCcw, ArrowLeft } from 'lucide-react';

type ResultsStepProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  initialAssignments: Assignment[];
  resetApp: () => void;
  prevStep: () => void;
};

export function ResultsStep({ invigilators, examinations, initialAssignments, resetApp, prevStep }: ResultsStepProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);

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
        <Button variant="outline" onClick={resetApp}>
          <RefreshCcw className="mr-2" /> Start Over
        </Button>
      </div>
    </div>
  );
}
