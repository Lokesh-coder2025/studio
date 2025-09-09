
'use client';

import {
  Navigation,
  NavigationMenu,
  NavigationMenuItem,
  NavigationHeader,
  NavigationProvider,
  NavigationInset,
} from '@/components/ui/navigation-menu';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileSpreadsheet, History, Save, Info, UsersRound, LogIn, ShieldCheck, LogOut, UserPlus, Settings, Palette, Sun, Moon, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemePicker } from '@/components/theme-picker';
import { useAuth } from '@/hooks/use-auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleNewAllotmentClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push('/');
  };
  
  return (
      <NavigationProvider>
        <div className='flex flex-col min-h-svh'>
          <Navigation>
            <NavigationHeader>
              <div className="flex justify-start items-center">
                <Link href="/" onClick={handleNewAllotmentClick} className="flex items-center gap-1 text-left cursor-pointer">
                  <UsersRound className="w-10 h-10 text-primary" />
                  <div>
                    <h1 className="text-[28px] font-headline font-extrabold text-primary">DutyFlow</h1>
                    <p className="text-xs text-muted-foreground -mt-1">The AI-Powered Allotments</p>
                  </div>
                </Link>
              </div>
              <div className="flex-grow flex justify-center">
                    <NavigationMenu>
                        <NavigationMenuItem>
                          <Button asChild size="sm" className='shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'>
                            <Link href="/" onClick={handleNewAllotmentClick}>
                                <FileSpreadsheet />
                                <span>New Allotment</span>
                            </Link>
                          </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild size="sm" className={cn('shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700', pathname === '/saved-allotments' ? '' : 'opacity-80')}>
                            <Link href="/saved-allotments">
                                <Save />
                                <span>Saved Allotments</span>
                            </Link>
                            </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                          <Button asChild size="sm" className={cn('shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700', pathname === '/day-wise-schedule' ? '' : 'opacity-80')}>
                            <Link href="/day-wise-schedule">
                                <CalendarDays />
                                <span>Day-wise Schedule</span>
                            </Link>
                          </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild size="sm" className={cn('shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700', pathname === '/history' ? '' : 'opacity-80')}>
                              <Link href="/history">
                                  <History />
                                  <span>History</span>
                              </Link>
                            </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild size="sm" className={cn('shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700', pathname === '/about' ? '' : 'opacity-80')}>
                            <Link href="/about">
                                <Info />
                                <span>About DutyFlow</span>
                            </Link>
                            </Button>
                        </NavigationMenuItem>
                    </NavigationMenu>
              </div>
              <div className="w-auto flex justify-end items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/signup">
                            <UserPlus />
                            <span>Sign Up</span>
                        </Link>
                    </Button>
                  </div>
                <ThemePicker />
              </div>
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
