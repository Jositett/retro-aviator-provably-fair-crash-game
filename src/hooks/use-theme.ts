import { useState, useEffect } from 'react';

// simple hook that tracks dark/light mode with localStorage and the
// prefers-color-scheme media query.  It guards against running on the
// server (where `window`/`localStorage` are undefined) and defers the
// real initialization until after mount to avoid hydration mismatches.
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // initial value doesn't really matter; we'll overwrite it in
    // useEffect once we're running in the browser.
    return false;
  });

  // after mount we can safely access window/localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(saved ? saved === 'dark' : prefersDark);
    } catch {
      // if anything goes wrong assume light
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return { isDark, toggleTheme };
}
