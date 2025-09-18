
'use client';

import { Suspense, useEffect, useState } from 'react';
import type { Invigilator, Examination, Assignment } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvigilatorsStep } from '@/components/invigilators-step';
import { ExaminationsStep } from '@/components/examinations-step';
import { ResultsStep } from '@/components/results-step';
import { Workflow, BookUser, FileSpreadsheet } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

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
  const { user } = useAuth();

  useEffect(() => {
    if (user?.institutionName) {
        setCollegeName(user.institutionName);
    }
  }, [user]);

  const resetApp = () => {
    setCurrentStep(1);
    setInvigilators([]);
    setExaminations([]);
    setAssignments([]);
    setExamTitle('');
    setCollegeName(user?.institutionName || '');
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
        setCollegeName(allotmentToLoad.collegeName || user?.institutionName || '');
        setAllotmentId(allotmentToLoad.id);
        setCurrentStep(3);
      }
    } else {
        // This ensures that navigating to '/' without a query param resets the state
        resetApp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

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
                    setCollegeName={setCollegeName}
                    examTitle={examTitle}
                    setExamTitle={setExamTitle}
                    allotmentId={allotmentId}
                    setAllotmentId={setAllotmentId}
                />;
      default:
        return <InvigilatorsStep invigilators={invigilators} setInvigilators={setInvigilators} nextStep={nextStep} />;
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8">
        <Card className={cn(
            "mx-auto shadow-lg",
            currentStep === 3 ? 'w-full max-w-none' : 'max-w-6xl'
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
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient />
    </Suspense>
  );
}
