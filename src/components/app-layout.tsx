
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileSpreadsheet, History, Save, Info, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { AuthWrapper } from '@/context/AuthContext';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleNewAllotmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (pathname === '/') {
      const randomQuery = `reset=${new Date().getTime()}`;
      router.push(`/?${randomQuery}`);
    } else {
      router.push('/');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AuthWrapper>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
             <div className="p-2 text-center">
              <h1 className="text-4xl font-bold text-primary font-headline">DutyFlow</h1>
              <p className="text-sm text-muted-foreground mt-1">Your Smart Exam Partner</p>
             </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="New Allotment">
                  <Link href="/" onClick={handleNewAllotmentClick}>
                    <FileSpreadsheet />
                    <span>New Allotment</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/saved-allotments'} tooltip="Saved Allotments">
                  <Link href="/saved-allotments">
                    <Save />
                    <span>Saved Allotments</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/history'} tooltip="History">
                  <Link href="/history">
                    <History />
                    <span>History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/about'} tooltip="About DutyFlow">
                  <Link href="/about">
                    <Info />
                    <span>About DutyFlow</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
              {user && (
                <div className="p-2">
                  <p className="text-xs text-center text-muted-foreground truncate mb-2">{user.email}</p>
                  <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
              <div className="text-center text-xs text-muted-foreground p-2 border-t">
                  &copy; {new Date().getFullYear()} DutyFlow
              </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-start p-2 border-b md:hidden">
              <SidebarTrigger />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthWrapper>
  );
}
