
'use client';

import * as React from 'react';
import { Palette, Check, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';

const themes = [
  { name: 'Forest', hsl: '120 61% 34%' },
  { name: 'Crimson', hsl: '347 77% 49%' },
  { name: 'Azure', hsl: '215 80% 55%' },
  { name: 'Amber', hsl: '35 92% 55%' },
  { name: 'Violet', hsl: '262 74% 57%' },
  { name: 'Slate', hsl: '215 30% 50%' },
];

export function ThemePicker() {
  const { setTheme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = React.useState('197 71% 53%');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('dutyflow-theme-hsl');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.body.style.setProperty('--primary', savedTheme);
    } else {
      const defaultTheme = themes[0].hsl;
      setCurrentTheme(defaultTheme);
      document.body.style.setProperty('--primary', defaultTheme);
    }
  }, []);

  const handleThemeChange = (hsl: string) => {
    setCurrentTheme(hsl);
    document.body.style.setProperty('--primary', hsl);
    localStorage.setItem('dutyflow-theme-hsl', hsl);
  };
  
  if (!mounted) {
    return (
        <Button variant="outline" size="icon" disabled>
            <Settings className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    )
  }

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => setTheme('system')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" />
              <span>Color Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {themes.map((theme) => (
                <DropdownMenuItem
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.hsl)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: `hsl(${theme.hsl})` }}
                    />
                    <span>{theme.name}</span>
                  </div>
                  {currentTheme === theme.hsl && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
