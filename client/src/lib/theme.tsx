import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Minimal theme provider (replaces next-themes in the Vite React build).
 * Applies the `dark` class on <html> and persists the choice in localStorage.
 * Exposes the same `useTheme()` surface the components expect:
 * { theme, resolvedTheme, setTheme }
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "supportflow-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // Keep the browser tab favicon in sync with the site theme.
    const icon = document.getElementById("favicon-dynamic") as HTMLLinkElement | null;
    if (icon) icon.href = theme === "dark" ? "/favicon-dark.png" : "/favicon-light.png";
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme: theme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
