// src/ThemeContext.tsx
import { createContext, useState, useMemo, useContext, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { CssBaseline, GlobalStyles } from '@mui/material';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// --- Types ---
interface ColorModeContextType {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

// --- Context ---
export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  mode: 'light'
});

// --- Hook ---
export const useColorMode = () => useContext(ColorModeContext);

// --- Provider ---
export const ColorModeProvider = ({ children }: { children: ReactNode }) => {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved === 'light' || saved === 'dark') ? saved : (systemPrefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#6366f1', // Indigo-500
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#ec4899', // Pink-500 (Accent)
      },
      ...(mode === 'light'
        ? {
            // --- Light Mode (Slate-50 base) ---
            background: {
              default: '#f8fafc', // Slate-50
              paper: '#ffffff',
            },
            text: {
              primary: '#1e293b', // Slate-800
              secondary: '#64748b', // Slate-500
            },
            divider: '#e2e8f0', // Slate-200
            action: {
                active: '#64748b',
                hover: '#f1f5f9',
            }
          }
        : {
            // --- Dark Mode (Slate-900 base) ---
            background: {
              default: '#0f172a', // Slate-900
              paper: '#1e293b',   // Slate-800
            },
            text: {
              primary: '#f1f5f9', // Slate-100
              secondary: '#94a3b8', // Slate-400
            },
            divider: '#334155', // Slate-700
            action: {
                active: '#94a3b8',
                hover: '#334155',
            }
          }
      ),
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      body1: { lineHeight: 1.6 },
    },
    shape: {
        borderRadius: 12
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            // Dynamic background based on palette
            backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
            color: mode === 'light' ? '#1e293b' : '#f1f5f9',
            borderBottom: `1px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
            boxShadow: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remove MUI default dark overlay
          },
        },
      },
      MuiTooltip: {
          styleOverrides: {
              tooltip: {
                  backgroundColor: mode === 'light' ? '#1e293b' : '#f8fafc',
                  color: mode === 'light' ? '#ffffff' : '#0f172a',
                  fontSize: '0.75rem'
              }
          }
      }
    },
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {/* Global Scrollbar Styles for cleaner look */}
        <GlobalStyles styles={{
            '*::-webkit-scrollbar': { width: '6px', height: '6px' },
            '*::-webkit-scrollbar-thumb': {
                backgroundColor: mode === 'light' ? '#cbd5e1' : '#475569',
                borderRadius: '3px'
            },
            '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
        }} />
        {children}
      </MUIThemeProvider>
    </ColorModeContext.Provider>
  );
};