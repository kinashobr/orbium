"use client";

import { motion } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { Sparkles, Clock } from "lucide-react";

export const DateOrb = () => {
  // Relógio dinâmico atualizado em tempo real a cada segundo
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(format(new Date(), "HH:mm:ss"));
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Formatar partes estáticas da data por extenso de forma super estilizada
  const dateInfo = useMemo(() => {
    const now = new Date();
    const day = format(now, "dd");
    const month = format(now, "MMMM", { locale: ptBR });
    const weekday = format(now, "EEEE", { locale: ptBR }).toUpperCase();
    const year = format(now, "yyyy");

    return {
      dayNumeric: day,
      monthLong: month.toUpperCase(),
      weekday: weekday,
      year: year,
    };
  }, []);

  // MD3 Easing Curve para transições orgânicas de aceleração
  const md3Easing = [0.2, 0, 0, 1];

  return (
    <div className="flex flex-col items-center md:items-end gap-2 select-none bg-transparent py-0 px-0 animate-fade-in text-right">
      
      {/* Linha Superior: Horário de tamanho grande e o Orb 2D ao lado */}
      <div className="flex items-center gap-6">
        
        {/* Horário atual do usuário em tamanho grande */}
        <div className="flex flex-col items-center md:items-end justify-center">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase text-amber-600 dark:text-amber-400">
            {dateInfo.weekday}
          </span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-black text-amber-950 dark:text-amber-100 tracking-tight leading-none mt-1">
            {currentTime || "00:00:00"}
          </span>
        </div>

        {/* Animação do Orb 2D em tamanho aumentado (+50%) */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center overflow-visible">
          
          {/* Aura de brilho dinâmico (no mesmo tom coerente do sistema) */}
          <motion.div
            className="absolute inset-1 rounded-full blur-2xl opacity-40 dark:opacity-25 pointer-events-none"
            animate={{
              scale: [1, 1.25, 0.9, 1.15, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: md3Easing,
            }}
            style={{
              background: "radial-gradient(circle, #D97706 0%, #B45309 60%, transparent 100%)"
            }}
          />

          {/* Órbita Externa (Tracejada) */}
          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-amber-500/30 dark:border-amber-400/40"
            animate={{ rotate: 360 }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Órbita Interna (Pontilhada) */}
          <motion.div
            className="absolute inset-3.5 rounded-full border border-dotted border-orange-500/40 dark:border-orange-400/50"
            animate={{ rotate: -360 }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Núcleo Central do Orbium */}
          <motion.div
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.65)] border border-white/20 dark:border-white/10"
            animate={{
              scale: [1, 1.18, 0.92, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: md3Easing,
            }}
          />

          {/* Satélite Orbitante Principal */}
          <motion.div
            className="absolute w-3.5 h-3.5 rounded-full bg-amber-600 dark:bg-amber-400 shadow-md border border-white/20"
            animate={{
              x: [38, 0, -38, 0, 38],
              y: [0, -38, 0, 38, 0],
              scale: [1, 1.25, 0.8, 1.15, 1],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Satélite Interno veloz */}
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-orange-500 dark:bg-orange-400 shadow-sm"
            animate={{
              x: [0, -26, 0, 26, 0],
              y: [-26, 0, 26, 0, -26],
              scale: [0.85, 1.2, 0.85, 1.2, 0.85],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />

        </div>

      </div>

      {/* Linha Inferior: Data por Extenso sem quebra de linha */}
      <div className="flex flex-col items-center md:items-end gap-1.5 border-t border-amber-500/10 dark:border-amber-400/10 pt-2 w-full">
        <h2 className="text-base sm:text-lg md:text-xl font-display font-black tracking-tight text-amber-950 dark:text-amber-100 uppercase whitespace-nowrap">
          DIA {dateInfo.dayNumeric} DE {dateInfo.monthLong} DE {dateInfo.year}
        </h2>
        
        {/* Mensagem curta amigável de até 5 palavras */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Sparkles className="w-3 h-3 text-amber-500/60" />
          <p className="text-[10px] sm:text-xs font-bold tracking-tight text-amber-900/60 dark:text-amber-400/60">
            Suas finanças em órbita
          </p>
        </div>
      </div>

    </div>
  );
};
