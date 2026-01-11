import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeType =
  | "brown-light"
  | "dark-neon"
  | "system";

interface ThemeContextType {
  /** Valor escolhido pelo usuário (pode ser "system") */
  theme: ThemeType;
  /** Tema efetivamente aplicado nas cores (sempre light ou dark-neon) */
  resolvedTheme: "brown-light" | "dark-neon";
  setTheme: (theme: ThemeType) => void;
  themes: { id: ThemeType; name: string; icon: string }[];
}

const THEMES: { id: ThemeType; name: string; icon: string }[] = [
  { id: "brown-light", name: "Marrom Claro", icon: "☀️" },
  { id: "dark-neon", name: "Dark Neon", icon: "🌙" },
  { id: "system", name: "Sistema", icon: "🖥️" },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem("app-theme") as ThemeType | null;

    if (saved === "brown-light" || saved === "dark-neon" || saved === "system") {
      return saved;
    }

    // Fallback inicial: seguir preferência do sistema
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark-neon";
    }

    return "brown-light";
  });

  const resolvedTheme: "brown-light" | "dark-neon" = (() => {
    if (theme === "system") {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark-neon";
      }
      return "brown-light";
    }
    return theme;
  })();

  useEffect(() => {
    localStorage.setItem("app-theme", theme);

    const root = document.documentElement;

    // Remove all previous theme classes
    root.classList.remove("theme-brown-light", "theme-dark-neon", "dark");

    // Add current theme class + dark helper quando necessário
    root.classList.add(`theme-${resolvedTheme}`);
    if (resolvedTheme === "dark-neon") {
      root.classList.add("dark");
    }
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    // Fallback seguro para ambientes fora da árvore principal
    console.warn("useTheme chamado fora de um ThemeProvider. Aplicando tema padrão 'brown-light'.");
    return {
      theme: "brown-light" as ThemeType,
      resolvedTheme: "brown-light" as const,
      setTheme: () => {},
      themes: THEMES,
    };
  }

  return context;
}
