
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
import { FileSpreadsheet, History, Save, Info, UsersRound, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemePicker } from '@/components/theme-picker';
import { useAuth } from '@/hooks/use-auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

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
                <Link href="/" onClick={handleNewAllotmentClick} className="flex items-center gap-3 text-left cursor-pointer">
                  <UsersRound className="w-10 h-10 text-primary" />
                  <div>
                    <h1 className="text-[1.72rem] font-bold text-primary font-headline">DutyFlow</h1>
                    <p className="text-[0.5rem] font-bold text-muted-foreground w-full -mt-1 tracking-widest">The AI Powered Allotments</p>
                  </div>
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
                        <Button asChild variant="default" size="sm" className={cn(pathname === '/saved-allotments' ? 'shadow-lg' : '')}>
                        <Link href="/saved-allotments">
                            <Save />
                            <span>Saved Allotments</span>
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
                    {user && (
                         <NavigationMenuItem>
                            <Button asChild variant="default" size="sm" className={cn(pathname === '/admin' ? 'shadow-lg' : '')}>
                            <Link href="/admin">
                                <ShieldCheck />
                                <span>Admin</span>
                            </Link>
                            </Button>
                        </NavigationMenuItem>
                    )}
                </NavigationMenu>
              </div>
              <div className="w-[180px] flex justify-end">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/login">
                        <LogIn />
                        <span>Sign Up / Log In</span>
                    </Link>
                 </Button>
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
          <ThemePicker />
        </div>
      </NavigationProvider>
  );
}
