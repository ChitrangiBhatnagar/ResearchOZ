'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export const REDUCE_MOTION_KEY = 'researchos:reduce-motion';

export function applyReducedMotion(enabled: boolean) {
  document.documentElement.classList.toggle('reduce-motion', enabled);
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    applyReducedMotion(window.localStorage.getItem(REDUCE_MOTION_KEY) === '1');
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
