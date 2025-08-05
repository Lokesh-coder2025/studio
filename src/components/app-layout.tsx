
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
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNewAllotmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
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
              <div className="flex justify-start items-center">
                <Link href="/" onClick={handleNewAllotmentClick} className="text-left cursor-pointer">
                  <h1 className="text-[1.65rem] font-bold text-primary font-headline">DutyFlow</h1>
                  <p className="text-[0.5rem] font-bold text-muted-foreground w-full -mt-1 tracking-widest">The AI-Assisted Allotments</p>
                </Link>
              </div>
              <div className="flex-grow flex justify-center">
                <NavigationMenu>
                    <NavigationMenuItem>
                      <Button asChild variant="default" size="sm" className='shadow-lg'>
                        <Link href="/" onClick={handleNewAllotmentClick}>
                            <FileSpreadsheet />
                            <span>New Allotment</span>
                        </Link>
                      </Button>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuButton asChild isActive={pathname === '/saved-allotments'} size="sm">
                        <Link href="/saved-allotments">
                            <Save />
                            <span>Saved Allotments</span>
                        </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuButton asChild isActive={pathname === '/history'} size="sm">
                          <Link href="/history">
                              <History />
                              <span>History</span>
                          </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuButton asChild isActive={pathname === '/about'} size="sm">
                        <Link href="/about">
                            <Info />
                            <span>About DutyFlow</span>
                        </Link>
                        </NavigationMenuButton>
                    </NavigationMenuItem>
                </NavigationMenu>
              </div>
              <div className="w-[180px]"></div>
            </NavigationHeader>
          </Navigation>
          <NavigationInset>
              <div className="flex-1">
                  {children}
              </div>
              <footer className="text-center text-xs text-muted-foreground p-4 border-t">
                  &copy; 2025 DutyFlow
              </footer>
          </NavigationInset>
        </div>
      </NavigationProvider>
  );
}
