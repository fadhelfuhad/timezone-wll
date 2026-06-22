import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../theme';

const STORAGE_KEY = 'timezone_color_mode_v2';

interface ColorModeContextValue {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  colorMode: 'dark',
  toggleColorMode: () => {},
});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as 'light' | 'dark') ?? 'dark';
  });

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(() => getTheme(colorMode), [colorMode]);

  const value = useMemo<ColorModeContextValue>(
    () => ({ colorMode, toggleColorMode }),
    [colorMode, toggleColorMode],
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}

export default ColorModeContext;
