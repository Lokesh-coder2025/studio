
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
  { name: 'Default', hsl: '197 71% 53%' },
  { name: 'Green', hsl: '142.1 76.2% 36.3%' },
  { name: 'Violet', hsl: '262.1 83.3% 57.8%' },
  { name: 'Orange', hsl: '24.6 95% 53.1%' },
  { name: 'Red', hsl: '0 72.2% 50.6%' },
  { name: 'Slate', hsl: '215.2 27.9% 46.9%' },
];

export function ThemePicker() {
  const [currentTheme, setCurrentTheme] = React.useState('197 71% 53%');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('dutyflow-theme-hsl');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.body.style.setProperty('--primary', savedTheme);
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
