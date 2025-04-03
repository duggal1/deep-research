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
        className="relative flex items-center justify-center w-8 h-8 rounded-full "
        aria-label="Toggle theme"
      >
        <div className="absolute inset-0.5  flex items-center justify-center transition-colors duration-300">
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6 text-orange-400 transition-all duration-300" />
          ) : (
            <MoonIcon className="h-6 w-6 text-gray-400 transition-all duration-300" />
          )}
        </div>
      </button>
    </div>
  );
}