import { type Theme, createTheme, responsiveFontSizes } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    brand: Palette['primary'];
  }
  interface PaletteOptions {
    brand?: PaletteOptions['primary'];
  }
}

const FONT_FAMILY = '"Inter", "Helvetica Neue", Arial, sans-serif';
const BORDER_RADIUS = 8;

const BLACK       = '#0d0d0d';
const BLACK_LIGHT = '#1a1a1a';
const BLACK_DARK  = '#000000';
const RED         = '#e53935';
const RED_LIGHT   = '#ef5350';
const RED_DARK    = '#b71c1c';

const sharedComponents: Theme['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS,
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: 0.3,
        padding: '8px 20px',
      },
      containedPrimary: {
        boxShadow: 'none',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS * 1.5,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': { borderRadius: BORDER_RADIUS },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: BORDER_RADIUS, fontWeight: 500 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: { borderRadius: BORDER_RADIUS },
    },
  },
};

const typography = {
  fontFamily: FONT_FAMILY,
  h1: { fontWeight: 700, letterSpacing: -0.5 },
  h2: { fontWeight: 700, letterSpacing: -0.25 },
  h3: { fontWeight: 700 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500 },
  button: { fontWeight: 600, textTransform: 'none' as const },
  overline: { fontWeight: 600, letterSpacing: 1 },
};

function buildLightTheme(): Theme {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: BLACK,
        light: BLACK_LIGHT,
        dark: BLACK_DARK,
        contrastText: '#ffffff',
      },
      secondary: {
        main: RED,
        light: RED_LIGHT,
        dark: RED_DARK,
        contrastText: '#ffffff',
      },
      brand: {
        main: RED,
        light: RED_LIGHT,
        dark: RED_DARK,
        contrastText: '#ffffff',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#0d0d0d',
        secondary: '#555555',
      },
      divider: 'rgba(0,0,0,0.12)',
      error:   { main: '#d32f2f' },
      warning: { main: '#f57c00' },
      info:    { main: '#0288d1' },
      success: { main: '#2e7d32' },
    },
    typography,
    shape: { borderRadius: BORDER_RADIUS },
    components: {
      ...sharedComponents,
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: BLACK,
            color: '#ffffff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: BLACK,
            color: '#ffffff',
            borderRight: 'none',
          },
        },
      },
    },
  });
}

function buildDarkTheme(): Theme {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: RED,
        light: RED_LIGHT,
        dark: RED_DARK,
        contrastText: '#ffffff',
      },
      secondary: {
        main: BLACK_LIGHT,
        light: '#2a2a2a',
        dark: BLACK_DARK,
        contrastText: '#ffffff',
      },
      brand: {
        main: RED,
        light: RED_LIGHT,
        dark: RED_DARK,
        contrastText: '#ffffff',
      },
      background: {
        default: '#0a0a0a',
        paper:   '#141414',
      },
      text: {
        primary:   '#f0f0f0',
        secondary: '#909090',
      },
      divider: 'rgba(229,57,53,0.15)',
      error:   { main: '#f44336' },
      warning: { main: '#ffa726' },
      info:    { main: '#29b6f6' },
      success: { main: '#66bb6a' },
    },
    typography,
    shape: { borderRadius: BORDER_RADIUS },
    components: {
      ...sharedComponents,
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS * 1.5,
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            backgroundImage: 'none',
            border: '1px solid rgba(229,57,53,0.12)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#141414',
            color: '#ffffff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
            borderBottom: '1px solid rgba(229,57,53,0.2)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#141414',
            borderRight: '1px solid rgba(229,57,53,0.15)',
          },
        },
      },
    },
  });
}

export function getTheme(mode: 'light' | 'dark'): Theme {
  const base = mode === 'light' ? buildLightTheme() : buildDarkTheme();
  return responsiveFontSizes(base);
}

export default getTheme;
