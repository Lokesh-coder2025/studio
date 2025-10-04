'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ArrowRight, Bot, FileSpreadsheet, Save, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const features = [
    {
        icon: Bot,
        title: "Intelligent Allotment",
        description: "Our AI-powered system distributes duties fairly, considering seniority, availability, and exam requirements to create an optimal schedule."
    },
    {
        icon: FileSpreadsheet,
        title: "Simple 3-Step Process",
        description: "Just add your invigilators, input examination details, and let DutyFlow generate the complete allotment sheet for you."
    },
    {
        icon: Save,
        title: "Save & Continue Later",
        description: "Never lose your work. Save your allotment sessions at any stage and pick up right where you left off."
    }
];

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleGetStarted = () => {
        if (user) {
            router.push('/dashboard');
        } else {
            router.push('/signup');
        }
    };

  return (
    <div className="flex-1 w-full">
        <main className="flex-1">
            {/* Hero Section */}
            <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center text-center">
                 <Image
                    src="https://picsum.photos/seed/52/1920/1080"
                    alt="Abstract background"
                    layout="fill"
                    objectFit="cover"
                    className="absolute inset-0 z-0"
                    data-ai-hint="abstract gradient"
                />
                <div className="absolute inset-0 bg-black/60 z-10" />
                <div className="relative z-20 container px-4 md:px-6 text-white">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        <div className="flex justify-center items-center gap-4 mb-4">
                           <UsersRound className="w-24 h-24 text-primary" />
                           <div>
                            <h1 className="text-5xl font-headline font-extrabold text-primary">DutyFlow</h1>
                            <p className="text-lg text-white/80 mt-2">The AI-Powered Allotments</p>
                           </div>
                        </div>
                        <h2 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl">
                            Revolutionize Examination Duties with AI
                        </h2>
                        <p className="text-lg md:text-xl text-white/80">
                            Welcome to DutyFlow, the AI-powered solution that transforms the complex task of assigning exam duties into a simple, fair, and efficient process.
                        </p>
                        <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center">
                            <Button
                                size="lg"
                                className="shadow-lg"
                                onClick={handleGetStarted}
                                disabled={loading}
                            >
                                Get Started <ArrowRight className="ml-2" />
                            </Button>
                            {!user && (
                                <Button asChild variant="secondary" size="lg" className="shadow-lg" disabled={loading}>
                                    <Link href="/login">
                                        Log In
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full py-12 md:py-24 lg:py-32">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                        <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary">Why Choose DutyFlow?</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            DutyFlow is designed to save you time, ensure fairness, and eliminate the headaches of manual duty allotment.
                        </p>
                    </div>
                    <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
                        {features.map(feature => (
                            <div key={feature.title} className="grid gap-2 text-center">
                                <div className="flex justify-center">
                                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-2">
                                        <feature.icon className="h-8 w-8" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* How It Works Section */}
            <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
                <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-primary">Get Your Allotment in 3 Simple Steps</h2>
                        <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Our intuitive workflow guides you through the process, making it faster than ever to create a balanced duty roster.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">1</div>
                            <div className="grid gap-1">
                                <h3 className="text-lg font-bold">Add Invigilators</h3>
                                <p className="text-sm text-muted-foreground">Quickly add your staff members manually or import them from an Excel file.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">2</div>
                            <div className="grid gap-1">
                                <h3 className="text-lg font-bold">Enter Exam Details</h3>
                                <p className="text-sm text-muted-foreground">Input the schedule of examinations, including dates, subjects, and requirements.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">3</div>
                            <div className="grid gap-1">
                                <h3 className="text-lg font-bold">Generate & Export</h3>
                                <p className="text-sm text-muted-foreground">Let the AI generate the allotment, then review, edit, and export it as a PDF or Excel file.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>
  );
}
