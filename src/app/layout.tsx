import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AppLayout } from '@/components/app-layout';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'DutyFlow',
  description: 'Invigilation Duty Allotment App',
};

export default function RootLayout({
  dashboard,
  landing,
}: Readonly<{
  dashboard: React.ReactNode;
  landing: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@800&family=Inter:wght@400;500;600;700&family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full">
          <ThemeProvider attribute="class" defaultTheme="light">
            <AuthProvider>
              <AppLayout>
                {dashboard}
              </AppLayout>
              {landing}
            </AuthProvider>
          </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
