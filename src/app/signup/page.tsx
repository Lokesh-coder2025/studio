
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, UsersRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Image from 'next/image';

const formSchema = z.object({
  institutionName: z.string().min(3, { message: 'Institution name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function SignUpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { institutionName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    await signup(values.institutionName, values.email, values.password);
    setIsSubmitting(false);
  };
  
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
      <Image
        src="https://picsum.photos/seed/13/1920/1080"
        alt="DutyFlow Background"
        fill
        className="object-cover object-center"
        data-ai-hint="circuit patterns"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex w-full max-w-4xl rounded-xl">
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center text-white p-8">
            <UsersRound className="w-24 h-24 text-primary" />
            <h1 className="text-5xl font-headline font-extrabold text-primary mt-4">DutyFlow</h1>
        </div>
        <div className="w-full md:w-1/2 p-8">
            <Card className="w-full shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">Create an Account</CardTitle>
                <CardDescription>Get started with intelligent duty allotments.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="institutionName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Name of the Institution</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Seshadripuram College" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email ID</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="lokesh@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full shadow-lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign Up'}
                    </Button>
                    </form>
                </Form>
                <div className="mt-4 text-center text-sm">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                    Log in
                    </Link>
                </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
