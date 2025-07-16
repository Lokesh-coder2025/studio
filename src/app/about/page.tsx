
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Cpu, Database, FileDown, FileSpreadsheet, Bot, History as HistoryIcon, Save, Send, Table, Palette } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const FeatureCard = ({ title, description, icon: Icon }: { title: string; description: string; icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> }) => (
    <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary p-2 rounded-full">
            <Icon className="h-6 w-6" />
        </div>
        <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground mt-1">{description}</p>
        </div>
    </div>
);


export default function AboutPage() {
    const features = [
        {
            icon: FileSpreadsheet,
            title: "Multi-Step Workflow",
            description: "Guides you through a simple 3-step process: Add Invigilators, Add Examinations, and Generate & View Results."
        },
        {
            icon: Bot,
            title: "Intelligent Allotment",
            description: "Uses an AI-powered system to distribute duties fairly, considering staff availability and exam requirements."
        },
        {
            icon: Table,
            title: "Interactive Allotment Sheet",
            description: "View and manually edit the generated schedule. Totals update automatically as you make changes."
        },
        {
            icon: FileDown,
            title: "Individual Dashboards & Export",
            description: "See a personalized duty summary for any invigilator. Download it as a PDF or send it directly via email."
        },
        {
            icon: Save,
            title: "Saved Sessions & History",
            description: "Save an incomplete allotment to finish later, and access all previously generated schedules in the History section."
        },
         {
            icon: FileDown,
            title: "Multiple Export Options",
            description: "Export the final duty roster in two convenient formats: a fully-functional Excel spreadsheet or a printable PDF document."
        }
    ];

    const techStack = [
        {
            icon: Cpu,
            title: "Next.js & React",
            description: "For a fast, modern, and server-rendered user interface."
        },
        {
            icon: Palette,
            title: "ShadCN UI & Tailwind CSS",
            description: "Provides a beautiful and responsive component library."
        },
        {
            icon: Bot,
            title: "Genkit AI",
            description: "Powers the intelligent duty assignment and email features."
        },
        {
            icon: Database,
            title: "Browser LocalStorage",
            description: "For persisting saved sessions and history directly in your browser."
        }
    ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <div>
            <h1 className="text-4xl font-bold text-primary font-headline">About DutyFlow</h1>
            <p className="text-muted-foreground mt-2">
              An intelligent assistant for creating fair and optimized invigilation duty schedules.
            </p>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-accent">What it does</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">
              DutyFlow is a comprehensive tool designed to streamline the complex process of assigning invigilation duties for examinations. It takes lists of invigilators and exams as input and uses an AI-powered system to generate a fair and optimized duty schedule, saving you time and ensuring accuracy.
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-accent">Core Features</CardTitle>
            <CardDescription>Everything you need to manage invigilation duties efficiently.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
            {features.map(feature => (
                <FeatureCard key={feature.title} {...feature} />
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-accent">Technology Stack</CardTitle>
             <CardDescription>Built with modern and powerful technologies.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map(tech => (
                 <div key={tech.title} className="flex flex-col items-center text-center p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
                        <tech.icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold">{tech.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{tech.description}</p>
                </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
