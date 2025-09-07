
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
                <Link href="/" onClick={handleNewAllotmentClick} className="flex items-center gap-1 text-left cursor-pointer">
                  <UsersRound className="w-10 h-10 text-primary" />
                  <div>
                    <h1 className="text-[32px] font-headline text-primary">DutyFlow</h1>
                    <p className="text-xs text-muted-foreground -mt-1">AI-Powered Allotments</p>
                  </div>
                </Link>
              </div>
              <div className="flex-grow flex justify-center">
                {user && (
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
                            <Button asChild variant="default" size="sm" className={cn(pathname === '/saved-allotments' ? 'shadow-lg' : '')}>
                            <Link href="/saved-allotments">
                                <Save />
                                <span>Saved Allotments</span>
                            </Link>
                            </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                          <Button asChild variant="default" size="sm" className={cn(pathname === '/day-wise-schedule' ? 'shadow-lg' : '')}>
                            <Link href="/day-wise-schedule">
                                <CalendarDays />
                                <span>Day-wise Schedule</span>
                            </Link>
                          </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild variant="default" size="sm" className={cn(pathname === '/history' ? 'shadow-lg' : '')}>
                              <Link href="/history">
                                  <History />
                                  <span>History</span>
                              </Link>
                            </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild variant="default" size="sm" className={cn(pathname === '/about' ? 'shadow-lg' : '')}>
                            <Link href="/about">
                                <Info />
                                <span>About DutyFlow</span>
                            </Link>
                            </Button>
                        </NavigationMenuItem>
                    </NavigationMenu>
                )}
              </div>
              <div className="w-auto flex justify-end items-center gap-2">
                {user ? (
                   <Button onClick={logout} variant="outline" size="sm">
                        <LogOut />
                        <span>Log Out</span>
                   </Button>
                ) : (
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                          <Link href="/login">
                              <LogIn />
                              <span>Log In</span>
                          </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                          <Link href="/signup">
                              <UserPlus />
                              <span>Sign Up</span>
                          </Link>
                      </Button>
                    </div>
                )}
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
