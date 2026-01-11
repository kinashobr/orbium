import { useMemo } from "react";

const getHslValue = (variable: string): string | null => {
  if (typeof document === 'undefined') return null;
  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(variable).trim();
  
  // Converte componentes HSL (ex: "220 20% 18%") para a string completa (ex: "hsl(220 20% 18%)")
  if (value.includes(' ')) {
    const parts = value.split('/');
    const hslComponents = parts[0].trim();
    return `hsl(${hslComponents})`;
  }
  
  return value;
};

export function useChartColors() {
  const colors = useMemo(() => {
    const primary = getHslValue('--primary');
    const accent = getHslValue('--accent');
    const success = getHslValue('--success');
    const destructive = getHslValue('--destructive');
    const warning = getHslValue('--warning');
    const border = getHslValue('--border');
    const mutedForeground = getHslValue('--muted-foreground');
    const card = getHslValue('--card');

    return {
      primary: primary || 'hsl(199 89% 48%)',
      accent: accent || 'hsl(270 80% 60%)',
      success: success || 'hsl(142 76% 36%)',
      destructive: destructive || 'hsl(0 72% 51%)',
      warning: warning || 'hsl(38 92% 50%)',
      border: border || 'hsl(220 20% 18%)',
      mutedForeground: mutedForeground || 'hsl(215 20% 55%)',
      card: card || 'hsl(220 20% 8%)',
    };
  }, []);
  
  return colors;
}