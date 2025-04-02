'use client';

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="relative flex items-center justify-center w-10 h-10 rounded-full "
        aria-label="Toggle theme"
      >
        <div className="absolute inset-0.5 rounded-full bg-gray-100 dark:bg-black flex items-center justify-center transition-colors duration-300">
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6 text-orange-600 transition-all duration-300" />
          ) : (
            <MoonIcon className="h-6 w-6 text-yellow-400 transition-all duration-300" />
          )}
        </div>
      </button>
    </div>
  );
}