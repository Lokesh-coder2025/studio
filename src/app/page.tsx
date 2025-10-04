
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

const techLogos = [
    {
        name: 'Next.js',
        logo: (
            <svg role="img" viewBox="0 0 128 128" className="h-8 w-auto">
                <path
                d="M38.25 113.563V53.25h-11.5V39.625h29.313v13.625h-11.5v60.313h-6.313Zm24-53.25h-11.5V39.625h29.313v13.625h-11.5v60.313h-6.313V60.313Zm24.563-22.563h13.625v75.938h-13.625V37.75Z"
                fill="currentColor"
                />
            </svg>
        )
    },
    {
        name: 'React',
        logo: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23174 23 20.46348" className="h-10 w-auto">
                <circle cx="0" cy="0" r="2.05" fill="currentColor"></circle>
                <g stroke="currentColor" strokeWidth="1" fill="none">
                    <ellipse rx="11" ry="4.2"></ellipse>
                    <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
                    <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
                </g>
            </svg>
        )
    },
    {
        name: 'Firebase',
        logo: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-10 w-auto">
                <path d="M3.463 19.345L12 2l8.537 17.345-3.52-6.527-5.017 3.345-5.017-3.345-3.52 6.527zM12 11.23l5.017-3.345-1.5-2.885-3.517 2.345L12 11.23zm-5.017-3.345L12 11.23l-3.517-2.345-1.5 2.885z" fill="currentColor"/>
            </svg>
        )
    },
    {
        name: 'Google Cloud Platform',
        logo: (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-10 w-auto">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.12 15.12c-2.88 0-5.45-1.63-6.58-4.12h13.16c-1.13 2.49-3.7 4.12-6.58 4.12zM12 9c-1.38 0-2.5-1.12-2.5-2.5S10.62 4 12 4s2.5 1.12 2.5 2.5S13.38 9 12 9z" fill="currentColor"/>
            </svg>
        )
    },
    {
        name: 'Gemini',
        logo: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-9 w-auto">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.27 15.73L12 13.46l-4.27 4.27-1.41-1.41L10.59 12 6.32 7.73l1.41-1.41L12 10.59l4.27-4.27 1.41 1.41L13.41 12l4.27 4.27-1.41 1.46z" fill="currentColor"/>
            </svg>
        )
    },
     {
        name: 'MSG91',
        logo: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-10 w-auto">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
            </svg>
        )
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
            <section className="relative w-full h-[70vh] md:h-[80vh] flex flex-col text-white">
                 <Image
                    src="https://picsum.photos/seed/5/1920/1080"
                    alt="Abstract background"
                    layout="fill"
                    objectFit="cover"
                    className="absolute inset-0 z-0"
                    data-ai-hint="data visualization"
                />
                <div className="absolute inset-0 bg-black/60 z-10" />
                
                <div className="relative z-20 container mx-auto px-4 md:px-6 flex items-center justify-between py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <UsersRound className="w-10 h-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-headline font-extrabold text-primary">DutyFlow</h1>
                        </div>
                    </Link>
                    <Button
                        variant="outline"
                        className="bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={handleGetStarted}
                        disabled={loading}
                    >
                        {user ? 'Go to Dashboard' : 'Get Started'}
                    </Button>
                </div>
                
                <div className="relative z-20 flex-1 flex items-center justify-center text-center">
                    <div className="container px-4 md:px-6">
                        <div className="space-y-4 max-w-3xl mx-auto">
                            <h2 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl">
                                Revolutionize Examination Duties with AI
                            </h2>
                            <p className="text-lg md:text-xl text-white/80">
                                DutyFlow is an AI-powered examination duty allocation platform for modern educational institutions.
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
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full py-12 md:py-24 lg:py-32">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center justify-center space-y-8 text-center mb-12">
                        <div className="text-sm text-muted-foreground">POWERED BY THE BEST IN THE INDUSTRY</div>
                         <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
                            {techLogos.map((tech, index) => (
                                <div key={index} title={tech.name} className="grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all text-foreground">
                                    {tech.logo}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12 mt-24">
                        <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary">Built for Academic Excellence</h2>
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

    

    