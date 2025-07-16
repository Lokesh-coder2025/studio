
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <div>
            <h1 className="text-4xl font-bold text-primary font-headline">About DutyFlow</h1>
            <p className="text-muted-foreground mt-2">
              An intelligent assistant for creating optimized invigilation duty schedules.
            </p>
          </div>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-accent">Our Story</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none text-foreground/90 space-y-4">
              <p>
                DutyFlow is an intelligent, AI-powered platform designed to revolutionize how educational institutions assign and manage invigilation duties. With just a few simple steps, DutyFlow transforms the complex and time-consuming process of exam duty allotment into a streamlined, fair, and highly efficient experience. Whether you're handling large-scale exam schedules or a small set of tests, DutyFlow adapts with precision. 
              </p>
              <p>
                DutyFlow is the vision of Lokesh D—a seasoned educator and an aspiring web developer driven by a desire to create meaningful solutions for academic institutions. Combining his deep understanding of institutional needs with his expertise in modern web technologies, Lokesh has built DutyFlow not merely as a digital tool, but as a thoughtful solution to real, everyday challenges in examination planning and duty management.
              </p>
              <p>
                Behind the scenes, DutyFlow leverages modern technology: Next.js and React for speed and responsiveness, ShadCN UI with Tailwind CSS for elegant design, and Genkit AI powered by Google’s models for intelligent duty distribution and email automation. With support for Excel and PDF exports, and session persistence via browser local storage, DutyFlow is built not only for performance but also for reliability and ease of use.
              </p>
               <p>
                Whether you're an exam coordinator, principal, or educator, DutyFlow is thoughtfully designed with your needs in mind. Join the growing community of institutions transforming their exam management with ease, fairness, and intelligence.
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
      </div>
    </div>
  );
}
