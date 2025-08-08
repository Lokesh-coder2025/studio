
'use client';

import * as React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const themes = [
  { name: 'Sky', hsl: '197 71% 53%' },
  { name: 'Mint', hsl: '158 64% 52%' },
  { name: 'Lavender', hsl: '250 65% 78%' },
  { name: 'Periwinkle', hsl: '221 83% 70%' },
  { name: 'Aqua', hsl: '180 70% 45%' },
  { name: 'Rose', hsl: '346 89% 70%' },
];

export function ThemePicker() {
  const [currentTheme, setCurrentTheme] = React.useState('197 71% 53%');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('dutyflow-theme-hsl');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.body.style.setProperty('--primary', savedTheme);
    } else {
       // Set default theme if nothing is saved
      document.body.style.setProperty('--primary', '197 71% 53%');
    }
  }, []);

  const handleThemeChange = (hsl: string) => {
    setCurrentTheme(hsl);
    document.body.style.setProperty('--primary', hsl);
    localStorage.setItem('dutyflow-theme-hsl', hsl);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shadow-lg">
            <Palette className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Select Theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
