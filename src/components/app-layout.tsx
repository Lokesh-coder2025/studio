
'use client';

import {
  Navigation,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuButton,
  NavigationHeader,
  NavigationProvider,
  NavigationInset,
} from '@/components/ui/navigation-menu';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileSpreadsheet, History, Save, Info } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNewAllotmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // This logic ensures that navigating to the home page always triggers a state reset,
    // avoiding hydration issues with client-side-only values.
    if (pathname === '/') {
        window.location.reload();
    } else {
        router.push('/');
    }
  };
  
  return (
      <NavigationProvider>
        <div className='flex flex-col min-h-svh'>
          <Navigation>
            <NavigationHeader>
              <div className="flex justify-start w-full">
                <div className="text-left">
                  <h1 className="text-[2.7rem] font-bold text-primary font-headline">DutyFlow</h1>
                  <p className="text-xs font-bold text-muted-foreground w-full -mt-2 tracking-widest">The AI-Assisted Allotments</p>
                </div>
              </div>
            </NavigationHeader>
            <nav className="border-b bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <NavigationMenu className="grid grid-cols-4">
                    <NavigationMenuItem className="col-start-1 flex justify-center">
                        <NavigationMenuButton asChild isActive={pathname === '/'} tooltip="New Allotment">
                        <Link href="/" onClick={handleNewAllotmentClick}>
                            <FileSpreadsheet />
                            <span>New Allotment</span>
                        </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="flex justify-center">
                        <NavigationMenuButton asChild isActive={pathname === '/saved-allotments'} tooltip="Saved Allotments">
                        <Link href="/saved-allotments">
                            <Save />
                            <span>Saved Allotments</span>
                        </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="flex justify-center">
                        <NavigationMenuButton asChild isActive={pathname === '/history'} tooltip="History">
                          <Link href="/history">
                              <History />
                              <span>History</span>
                          </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="col-start-4 flex justify-end">
                        <NavigationMenuButton asChild isActive={pathname === '/about'} tooltip="About DutyFlow">
                        <Link href="/about">
                            <Info />
                            <span>About DutyFlow</span>
                        </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    </NavigationMenu>
                </div>
            </nav>
          </Navigation>
          <NavigationInset>
              <div className="flex-1">
                  {children}
              </div>
              <footer className="text-center text-xs text-muted-foreground p-4 border-t">
                  &copy; {new Date().getFullYear()} DutyFlow
              </footer>
          </NavigationInset>
        </div>
      </NavigationProvider>
  );
}
