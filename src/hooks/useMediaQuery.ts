import { useState, useEffect } from "react";

/**
 * Hook personalizado para detectar media queries no React.
 * Útil para renderização condicional baseada em breakpoints.
 * 
 * @param query A media query CSS a ser observada (ex: "(max-width: 768px)")
 * @returns true se a media query corresponder, false caso contrário
 * 
 * @example
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const isTablet = useMediaQuery("(max-width: 1024px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Verificar se estamos no ambiente do navegador
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    
    // Definir valor inicial
    setMatches(mediaQuery.matches);

    // Handler para mudanças na media query
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Adicionar listener
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
