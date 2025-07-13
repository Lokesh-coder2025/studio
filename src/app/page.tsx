
'use client';

import { useEffect, useState } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvigilatorsStep } from '@/components/invigilators-step';
import { ExaminationsStep } from '@/components/examinations-step';
import { ResultsStep } from '@/components/results-step';
import { Workflow, BookUser, FileSpreadsheet } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

const STEPS = [
  { step: 1, title: "Invigilators' Details", description: "Add all available invigilators.", icon: BookUser },
  { step: 2, title: "Examination Details", description: "Enter the details for all exams.", icon: Workflow },
  { step: 3, title: "Duty Allotment", description: "View and export the generated schedule.", icon: FileSpreadsheet },
];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [allotmentId, setAllotmentId] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const resetApp = () => {
    setCurrentStep(1);
    setInvigilators([]);
    setExaminations([]);
    setAssignments([]);
    setExamTitle('');
    setAllotmentId(null);
    router.push('/');
  };

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (loadId) {
      const savedAllotments = JSON.parse(localStorage.getItem('savedAllotments') || '[]');
      const allotmentToLoad = savedAllotments.find((item: any) => item.id === loadId);
      if (allotmentToLoad) {
        setInvigilators(allotmentToLoad.invigilators);
        setExaminations(allotmentToLoad.examinations);
        setAssignments(allotmentToLoad.assignments);
        setExamTitle(allotmentToLoad.examTitle);
        setAllotmentId(allotmentToLoad.id);
        setCurrentStep(3);
      }
    } else {
        // This ensures that navigating to '/' without a query param resets the state
        if (currentStep !== 1 || invigilators.length > 0 || examinations.length > 0) {
            resetApp();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => {
    if (searchParams.get('load')) {
        router.push('/saved-allotments');
    } else {
        setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <InvigilatorsStep invigilators={invigilators} setInvigilators={setInvigilators} nextStep={nextStep} />;
      case 2:
        return (
          <ExaminationsStep
            examTitle={examTitle}
            setExamTitle={setExamTitle}
            invigilators={invigilators}
            examinations={examinations}
            setExaminations={setExaminations}
            setAssignments={setAssignments}
            setAllotmentId={setAllotmentId}
            nextStep={nextStep}
            prevStep={prevStep}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        );
      case 3:
        return <ResultsStep 
                    invigilators={invigilators} 
                    examinations={examinations} 
                    initialAssignments={assignments} 
                    resetApp={resetApp} 
                    prevStep={prevStep} 
                    examTitle={examTitle}
                    allotmentId={allotmentId}
                    setAllotmentId={setAllotmentId}
                />;
      default:
        return <InvigilatorsStep invigilators={invigilators} setInvigilators={setInvigilators} nextStep={nextStep} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-4xl font-bold font-headline">New Allotment</h1>
            <p className="text-muted-foreground mt-2">Automated Invigilation Duty Allotment System</p>
        </header>

        <div className="w-full flex justify-center mb-8">
            <ol className="flex items-center w-3/5">
                {STEPS.map((item, index) => (
                    <li key={item.step} className={`flex w-full items-center ${index < STEPS.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block" : ""} ${currentStep > item.step ? 'after:border-primary' : ''}`}>
                        <span className={`flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 ${currentStep >= item.step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <item.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                        </span>
                    </li>
                ))}
            </ol>
        </div>

        <Card className="max-w-6xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
