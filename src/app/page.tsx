
'use client';

import { Suspense, useEffect, useState } from 'react';
import type { Invigilator, Examination, Assignment, SavedAllotment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvigilatorsStep } from '@/components/invigilators-step';
import { ExaminationsStep } from '@/components/examinations-step';
import { ResultsStep } from '@/components/results-step';
import { Workflow, BookUser, FileSpreadsheet } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const STEPS = [
  { step: 1, title: "Invigilators' Details", description: "Add all available invigilators.", icon: BookUser },
  { step: 2, title: "Examination Details", description: "Enter the details for all exams.", icon: Workflow },
  { step: 3, title: "Duty Allotment", description: "View and export the generated schedule.", icon: FileSpreadsheet },
];

function HomeClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [allotmentId, setAllotmentId] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const resetApp = () => {
    setCurrentStep(1);
    setInvigilators([]);
    setExaminations([]);
    setAssignments([]);
    setExamTitle('');
    setCollegeName('');
    setAllotmentId(null);
    // Remove query params to prevent re-loading data
    if (searchParams.toString()) {
        router.push(pathname);
    }
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
        setCollegeName(allotmentToLoad.collegeName || '');
        setAllotmentId(allotmentToLoad.id);
        setCurrentStep(3);
      }
    } else {
        // This ensures that navigating to '/' without a query param resets the state
        resetApp();
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
            collegeName={collegeName}
            setCollegeName={setCollegeName}
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
                    collegeName={collegeName}
                    examTitle={examTitle}
                    allotmentId={allotmentId}
                    setAllotmentId={setAllotmentId}
                />;
      default:
        return <InvigilatorsStep invigilators={invigilators} setInvigilators={setInvigilators} nextStep={nextStep} />;
    }
  };

  return (
    <>
      <div className="sticky top-[146px] bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm">
        <div className="p-1 flex justify-center">
            <ol className="flex items-center w-full max-w-2xl justify-center ml-[5rem]">
                {STEPS.map((item, index) => (
                    <li key={item.step} className={`flex w-full items-center ${index < STEPS.length - 1 ? "after:content-[''] after:w-full after:h-px after:border-b after:border-border after:border-1 after:inline-block" : ""} ${currentStep > item.step ? 'after:border-primary' : ''}`}>
                        <div className="flex flex-col items-center">
                            <span className={`flex items-center justify-center w-[40px] h-[40px] rounded-full shrink-0 ${currentStep >= item.step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <item.icon className="w-5 h-5" />
                            </span>
                            <p className={`mt-1 text-[10px] font-medium whitespace-nowrap ${currentStep >= item.step ? 'text-primary' : 'text-muted-foreground'}`}>{item.title}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <Card className={cn(
            "mx-auto shadow-lg",
            currentStep === 3 ? 'w-full' : 'max-w-6xl'
          )}>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 md:p-8"><Skeleton className="h-[400px] w-full" /></div>}>
      <HomeClient />
    </Suspense>
  );
}
