
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
import { usePathname } from 'next/navigation';
import { FileSpreadsheet, History, Save, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNewAllotmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (pathname === '/') {
      // If we are on the homepage, we might need to trigger a reset
      // by navigating with a unique query param to force reload of state in useEffect
      const randomQuery = `reset=${new Date().getTime()}`;
      router.push(`/?${randomQuery}`);
    } else {
      router.push('/');
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
           <div className="p-2 text-center">
            <h1 className="text-3xl leading-[2.5rem] font-bold text-primary font-headline">DutyFlow</h1>
            <p className="text-xs text-primary">Developed by Lokesh D</p>
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
            <div className="text-center text-xs text-muted-foreground p-2">
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
  );
}
