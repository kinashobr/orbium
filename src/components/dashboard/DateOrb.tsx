"use client";

import { motion, AnimatePresence } from "motion/react";
import { format, isSameMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { Sparkles, Flame, AlertTriangle, HelpCircle } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { parseDateLocal, cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { getBillCategoryLabel } from "@/lib/expenseSnapshotHelper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// Easing Curve Material Design 3 para transições orgânicas de aceleração
const md3Easing: [number, number, number, number] = [0.2, 0, 0, 1];

// =========================================================================
// FASE 1: ESTADO DE EQUILÍBRIO (0% a 69.9% do Orçamento)
// REGRA CRÍTICA: NÃO ALTERAR A ANIMAÇÃO ATUAL - MANTER A ATUAL INTEGRALMENTE
// =========================================================================
export const Phase1Orb = () => (
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
        background: "radial-gradient(circle, #D97706 0%, #B45309 60%, transparent 100%)",
      }}
    />

    {/* Órbita Externa (Tracejada) */}
    <motion.div
      className="absolute inset-0 rounded-full border border-dashed border-amber-500/30 dark:border-amber-400/40"
      animate={{ rotate: 360 }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: "linear",
      }}
    />

    {/* Órbita Interna (Pontilhada) */}
    <motion.div
      className="absolute inset-3.5 rounded-full border border-dotted border-orange-500/40 dark:border-orange-400/50"
      animate={{ rotate: -360 }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "linear",
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
        ease: "linear",
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
        ease: "linear",
      }}
    />
  </div>
);

// =========================================================================
// FASE 2: TRANSIÇÃO DE ALERTA E INSTABILIDADE (70% a 99.9% do Orçamento)
// Consistência visual estrita com a Fase 1: mesmos elementos geométricos limpos,
// porém expressando a expansão da Gigante Vermelha, flares solares, órbitas
// elípticas instáveis e vórtice espiral de distorção espaço-temporal.
// =========================================================================
export const Phase2Orb = () => (
  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center overflow-visible">
    {/* 1. Aura Solar Vermelha Pulsante (no mesmo estilo de aura da Fase 1) */}
    <motion.div
      className="absolute inset-0 rounded-full blur-2xl opacity-55 dark:opacity-35 pointer-events-none"
      animate={{
        scale: [1, 1.3, 0.92, 1.22, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: md3Easing,
      }}
      style={{
        background: "radial-gradient(circle, #EF4444 0%, #DC2626 50%, #991B1B 80%, transparent 100%)",
      }}
    />

    {/* 2. Vórtice Espiral de Distorção Espaço-Temporal (Anel tracejado concêntrico puxando para o centro) */}
    <motion.div
      className="absolute inset-5 rounded-full border border-dashed border-rose-600/30 dark:border-rose-500/30 pointer-events-none"
      animate={{
        rotate: -720,
        scale: [1.15, 0.8, 1.15],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        ease: "linear",
      }}
    />

    {/* 3. Órbita Externa Elíptica e Instável (Tracejada - evolução direta da órbita da Fase 1) */}
    <motion.div
      className="absolute w-[105px] h-[82px] sm:w-[120px] sm:h-[94px] rounded-[50%] border border-dashed border-rose-500/45 dark:border-rose-400/55 pointer-events-none"
      animate={{
        rotate: [0, 360],
        scale: [1, 1.06, 0.94, 1.04, 1],
      }}
      transition={{
        rotate: { duration: 9, repeat: Infinity, ease: "linear" },
        scale: { duration: 3.5, repeat: Infinity, ease: md3Easing },
      }}
    />

    {/* 4. Órbita Interna Elíptica Acelerada (Pontilhada - evolução da interna da Fase 1) */}
    <motion.div
      className="absolute w-[76px] h-[60px] sm:w-[88px] sm:h-[70px] rounded-[50%] border border-dotted border-red-500/55 dark:border-orange-400/60 pointer-events-none"
      animate={{
        rotate: [0, -360],
        scale: [1, 0.92, 1.08, 0.96, 1],
      }}
      transition={{
        rotate: { duration: 6, repeat: Infinity, ease: "linear" },
        scale: { duration: 2.8, repeat: Infinity, ease: md3Easing },
      }}
    />

    {/* 5. Flares Solares / Corona Ejetada (Anéis concêntricos pulsantes de plasma) */}
    <motion.div
      className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-dashed border-rose-400/70 dark:border-rose-300/80 pointer-events-none"
      animate={{
        scale: [1, 1.5, 1],
        rotate: [0, 180, 360],
        opacity: [0.75, 0.15, 0.75],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="absolute w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-dotted border-amber-300/80 dark:border-amber-200/80 pointer-events-none"
      animate={{
        scale: [1, 1.38, 1],
        rotate: [0, -180, -360],
        opacity: [0.85, 0.2, 0.85],
      }}
      transition={{
        duration: 1.9,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* 6. Núcleo Central: Estrela Gigante Vermelha Expandida Pulsante */}
    <motion.div
      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 shadow-[0_0_25px_rgba(239,68,68,0.85)] border border-white/25 dark:border-white/20 z-10"
      animate={{
        scale: [1, 1.2, 0.94, 1.16, 1],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: md3Easing,
      }}
    />

    {/* 7. Satélite Orbitante Principal (Planeta 1 Acelerado em Órbita Elíptica Instável) */}
    <motion.div
      className="absolute w-3.5 h-3.5 rounded-full bg-rose-500 dark:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.85)] border border-white/30 z-20"
      animate={{
        x: [44, 12, -44, -12, 44],
        y: [-14, 26, 14, -26, -14],
        scale: [1.25, 0.8, 1.2, 0.85, 1.25],
      }}
      transition={{
        duration: 3.4,
        repeat: Infinity,
        ease: "linear",
      }}
    />

    {/* 8. Satélite Interno Veloz (Planeta 2 Acelerado em Órbita Oscilante) */}
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-amber-400 dark:bg-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-20"
      animate={{
        x: [0, -30, 0, 30, 0],
        y: [-18, 0, 18, 0, -18],
        scale: [0.85, 1.3, 0.85, 1.3, 0.85],
      }}
      transition={{
        duration: 2.1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </div>
);

// =========================================================================
// FASE 3: ESTADO DE COLAPSO (100%+ do Orçamento Gasto)
// O Buraco Negro devorou o sistema solar por completo.
// Lógica de Lenteamento Gravitacional Dinâmico por Tema:
// - O Buraco Negro não emite luz e é praticamente invisível no centro.
// - A distorção da luz utiliza dinamicamente a cor do background atual do app:
//   * Modo Claro (brown-light): O background cremoso/mocha (#F8F5F0) é curvado
//     em torno do horizonte de eventos com tons de caramelo, bronze e chocolate.
//   * Modo Escuro (dark-neon): O background escuro espresso (#161312) é curvado
//     com feixes de cisalhamento e fótons em bronze, âmbar e ouro.
// - Anéis concêntricos de lenteamento com perfeita consistência com a Fase 1.
// =========================================================================
export const Phase3Orb = ({ isDark: isDarkProp }: { isDark?: boolean }) => {
  const { resolvedTheme } = useTheme();
  const isDark = isDarkProp ?? resolvedTheme === "dark-neon";

  // Configurações cromáticas e óticas ajustadas dinamicamente ao tema ativo
  const lensingConfig = useMemo(() => {
    if (isDark) {
      return {
        // Fundo escuro (Espresso #161312)
        gradStops: {
          s0: "#1E0C04",
          s18: "#451A03",
          s38: "#78350F",
          s64: "#B45309",
          s84: "#D97706",
          s100: "#FDE68A",
        },
        shearBeam: {
          start: "#241005",
          mid1: "#78350F",
          center: "#FEF3C7",
          mid2: "#B45309",
          end: "#1E0C04",
        },
        rimLight: "#D97706",
        rimSecondary: "#B45309",
        particle: "#FEF3C7",
        auraStyle: {
          background: "radial-gradient(circle, rgba(12, 6, 3, 0.95) 0%, rgba(55, 23, 8, 0.75) 45%, rgba(180, 83, 9, 0.28) 75%, transparent 100%)",
        },
        auraOpacity: "opacity-75",
        dashedRing: "border-amber-400/40",
        dottedRing: "border-orange-400/50",
        svgShadow: "drop-shadow-[0_0_20px_rgba(217,119,6,0.8)]",
      };
    }

    // Fundo claro (Warm Cream / Mocha #F8F5F0 - Tema Marrom Claro)
    // As linhas internas usam tons marrom bronze (#92400E / #B45309) perfeitamente integrados ao tema
    return {
      gradStops: {
        s0: "#2D1305",   // Absorção total
        s18: "#5C2809",  // Chocolate escuro
        s38: "#92400E",  // Marrom bronze
        s64: "#C26725",  // Caramelo quente
        s84: "#E8B688",  // Mocha cremoso refratado
        s100: "#F8F5F0", // Luz do background
      },
      shearBeam: {
        start: "#5C2809",
        mid1: "#92400E",
        center: "#92400E", // Feixe sutil no tom marrom bronze
        mid2: "#C26725",
        end: "#2D1305",
      },
      rimLight: "#92400E",     // Marrom bronze quente (100% consistente com o tema marrom claro)
      rimSecondary: "#B45309", // Âmbar caramelo profundo (100% consistente com o tema marrom claro)
      particle: "#C26725",
      auraStyle: {
        background: "radial-gradient(circle, rgba(146, 64, 14, 0.22) 0%, rgba(194, 103, 37, 0.12) 45%, rgba(248, 245, 240, 0.05) 75%, transparent 100%)",
      },
      auraOpacity: "opacity-55",
      dashedRing: "border-amber-600/35",
      dottedRing: "border-amber-700/40",
      svgShadow: "drop-shadow-[0_6px_18px_rgba(92,40,9,0.32)]",
    };
  }, [isDark]);

  return (
    <div className="relative w-[100px] h-[100px] sm:w-[124px] sm:h-[124px] md:w-[134px] md:h-[134px] flex items-center justify-center overflow-visible">
      {/* 1. Aura de Lenteamento Gravitacional Adaptativa */}
      <motion.div
        className={cn("absolute inset-[-7px] rounded-full blur-xl pointer-events-none transition-opacity duration-500", lensingConfig.auraOpacity)}
        animate={{
          scale: [1, 1.2, 0.95, 1.15, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: md3Easing,
        }}
        style={lensingConfig.auraStyle}
      />

      {/* 2. Anel Tracejado de Lenteamento Gravitacional (30% mais pequeno) */}
      <motion.div
        className={cn("absolute w-[90px] h-[90px] sm:w-[112px] sm:h-[112px] md:w-[124px] md:h-[124px] rounded-full border border-dashed pointer-events-none transition-colors duration-500", lensingConfig.dashedRing)}
        animate={{
          rotate: 360,
          scale: [1, 1.04, 0.96, 1.03, 1],
        }}
        transition={{
          rotate: { duration: 18, repeat: Infinity, ease: "linear" },
          scale: { duration: 4.5, repeat: Infinity, ease: md3Easing },
        }}
      />

      {/* 3. Anel Pontilhado de Lenteamento Gravitacional (30% mais pequeno) */}
      <motion.div
        className={cn("absolute w-[67px] h-[67px] sm:w-[84px] sm:h-[84px] md:w-[95px] md:h-[95px] rounded-full border border-dotted pointer-events-none transition-colors duration-500", lensingConfig.dottedRing)}
        animate={{
          rotate: -360,
          scale: [1, 0.95, 1.05, 0.97, 1],
        }}
        transition={{
          rotate: { duration: 12, repeat: Infinity, ease: "linear" },
          scale: { duration: 3.8, repeat: Infinity, ease: md3Easing },
        }}
      />

      {/* 4. O Buraco Negro: A Luz de Fundo Refratada ao Redor do Vazio (30% mais pequeno) */}
      <motion.div
        className="relative w-[78px] h-[78px] sm:w-[101px] sm:h-[101px] md:w-[112px] md:h-[112px] flex items-center justify-center z-20 cursor-pointer"
        animate={{
          scale: [1, 1.06, 0.96, 1.04, 1],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: md3Easing,
        }}
      >
        <svg
          viewBox="0 0 34 33"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("w-full h-full overflow-visible transition-all duration-500", lensingConfig.svgShadow)}
        >
          <defs>
            {/* Gradiente da Distorção da Luz do Background */}
            <linearGradient id="dynamic-bh-lens-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lensingConfig.gradStops.s0} />
              <stop offset="18%" stopColor={lensingConfig.gradStops.s18} />
              <stop offset="38%" stopColor={lensingConfig.gradStops.s38} />
              <stop offset="64%" stopColor={lensingConfig.gradStops.s64} />
              <stop offset="84%" stopColor={lensingConfig.gradStops.s84} />
              <stop offset="100%" stopColor={lensingConfig.gradStops.s100} />
            </linearGradient>

            {/* Feixe de Cisalhamento Gravitacional (Gravitational Shear) */}
            <linearGradient id="dynamic-bh-shear-beam" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lensingConfig.shearBeam.start} stopOpacity="0" />
              <stop offset="30%" stopColor={lensingConfig.shearBeam.mid1} stopOpacity="0.85" />
              <stop offset="50%" stopColor={lensingConfig.shearBeam.center} stopOpacity="0.95" />
              <stop offset="70%" stopColor={lensingConfig.shearBeam.mid2} stopOpacity="0.85" />
              <stop offset="100%" stopColor={lensingConfig.shearBeam.end} stopOpacity="0" />
            </linearGradient>

            {/* Filtro de Lenteamento Atmosférico */}
            <filter id="dynamic-bh-lensing-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Arco Superior-Direito de Luz Refratada */}
          <motion.path
            d="M13.2371 21.0407L24.3186 12.8506C24.8619 12.4491 25.6384 12.6057 25.8973 13.2294C27.2597 16.5185 26.651 20.4712 23.9403 23.1851C21.2297 25.8989 17.4581 26.4941 14.0108 25.1386L10.2449 26.8843C15.6463 30.5806 22.2053 29.6665 26.304 25.5601C29.5551 22.3051 30.562 17.8683 29.6205 13.8673L29.629 13.8758C28.2637 7.99809 29.9647 5.64871 33.449 0.844576C33.5314 0.730667 33.6139 0.616757 33.6964 0.5L29.1113 5.09055V5.07631L13.2343 21.0436"
            fill="url(#dynamic-bh-lens-grad)"
            filter="url(#dynamic-bh-lensing-glow)"
          />

          {/* Arco Inferior-Esquerdo de Luz Refratada */}
          <motion.path
            d="M10.9503 23.0313C7.07343 19.3235 7.74185 13.5853 11.0498 10.2763C13.4959 7.82722 17.5036 6.82767 21.0021 8.2971L24.7595 6.55998C24.0826 6.07017 23.215 5.54334 22.2195 5.17313C17.7198 3.31926 12.3326 4.24192 8.67479 7.90126C5.15635 11.4239 4.0499 16.8403 5.94992 21.4622C7.36924 24.9165 5.04257 27.3598 2.69884 29.826C1.86829 30.7002 1.0349 31.5745 0.36364 32.5L10.9474 23.0341"
            fill="url(#dynamic-bh-lens-grad)"
            filter="url(#dynamic-bh-lensing-glow)"
          />

          {/* Micro-partículas em Trânsito na Lente Gravitacional */}
          <motion.circle
            cx="20"
            cy="14"
            r="0.85"
            fill={lensingConfig.particle}
            animate={{
              cx: [13, 27],
              cy: [21, 7],
              opacity: [0, 0.95, 0],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>
    </div>
  );
};

// =========================================================================
// COMPONENTE PRINCIPAL: DATEORB COM GESTÃO DE ESTADOS ORÇAMENTÁRIOS
// =========================================================================
interface DateOrbProps {
  onPhaseChange?: (phase: 1 | 2 | 3) => void;
}

export const DateOrb = ({ onPhaseChange }: DateOrbProps) => {
  const {
    transacoesV2,
    getExpenseSnapshot,
    getBillsForMonth,
    getOtherPaidExpensesForMonth,
    generateInvoiceBills,
    categoriasV2,
  } = useFinance();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark-neon";

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

  // =========================================================================
  // CÁLCULO ORÇAMENTÁRIO: SNAPSHOT vs REALIZADO DO MÊS ATUAL
  // =========================================================================
  const now = useMemo(() => new Date(), []);
  const currMonthKey = useMemo(() => format(now, "yyyy-MM"), [now]);
  const currMonthSnapshot = useMemo(() => getExpenseSnapshot(currMonthKey), [getExpenseSnapshot, currMonthKey]);

  // 1. Orçamento Total Planejado (Snapshot Congelado ou Fallback do Mês)
  const budgetTotal = useMemo(() => {
    if (currMonthSnapshot && currMonthSnapshot.totalAmount > 0) {
      return currMonthSnapshot.totalAmount;
    }
    // Fallback: soma dos compromissos programados do mês
    try {
      const trackerBills = getBillsForMonth(now);
      const otherPaid = getOtherPaidExpensesForMonth(now);
      const invoiceBills = generateInvoiceBills(now);
      const trackerBillIds = new Set(trackerBills.map(b => b.id));
      const newInvoiceBills = invoiceBills.filter(b => !trackerBillIds.has(b.id));
      const combined = [...trackerBills, ...newInvoiceBills, ...otherPaid]
        .filter(b => b.sourceType !== 'card_invoice' && getBillCategoryLabel(b, categoriasV2) !== 'Fatura');
      const sum = combined.reduce((acc, b) => acc + (b.expectedAmount || 0), 0);
      return sum;
    } catch {
      return 0;
    }
  }, [currMonthSnapshot, getBillsForMonth, getOtherPaidExpensesForMonth, generateInvoiceBills, categoriasV2, now]);

  // 2. Despesas Realizadas no Mês Atual
  const realizedTotal = useMemo(() => {
    return transacoesV2.reduce((acc, tx) => {
      try {
        const txDate = parseDateLocal(tx.date);
        if (isSameMonth(txDate, now) && isSameYear(txDate, now)) {
          if (tx.operationType === 'despesa' || tx.operationType === 'pagamento_emprestimo') {
            return acc + tx.amount;
          }
        }
      } catch {
        // ignore
      }
      return acc;
    }, 0);
  }, [transacoesV2, now]);

  // 3. Percentual do Orçamento Gasto
  const spentPercentage = useMemo(() => {
    if (budgetTotal > 0) {
      return (realizedTotal / budgetTotal) * 100;
    }
    return realizedTotal > 0 ? 100 : 0;
  }, [budgetTotal, realizedTotal]);

  // 4. Determinação Automática da Fase
  // Fase 1: 0% a 69.9%
  // Fase 2: 70% a 99.9%
  // Fase 3: 100%+
  const autoPhase: 1 | 2 | 3 = useMemo(() => {
    if (spentPercentage >= 100) return 3;
    if (spentPercentage >= 70) return 2;
    return 1;
  }, [spentPercentage]);

  // Modo de visualização: 'auto' (calculado real) ou override manual (1, 2, 3) para inspeção/demonstração
  const [overridePhase, setOverridePhase] = useState<1 | 2 | 3 | null>(null);
  const currentPhase: 1 | 2 | 3 = overridePhase ?? autoPhase;

  // Notificar página pai (Visão Geral) para ajuste fino do tom da interface
  useEffect(() => {
    onPhaseChange?.(currentPhase);
  }, [currentPhase, onPhaseChange]);

  return (
    <div
      className={cn(
        "flex flex-col items-center md:items-end gap-2 select-none py-1 px-2 rounded-3xl transition-all duration-700 animate-fade-in text-right relative",
        currentPhase === 2 && "bg-rose-500/[0.03] shadow-[0_0_35px_rgba(244,63,94,0.06)]",
        currentPhase === 3 && "bg-amber-950/[0.02] dark:bg-amber-400/[0.02] shadow-[0_0_35px_rgba(180,83,9,0.05)]"
      )}
    >
      {/* Linha Superior: Horário e Orb Estelar */}
      <div className="flex items-center gap-5 sm:gap-6">
        {/* Horário atual do usuário em tamanho grande */}
        <div className="flex flex-col items-center md:items-end justify-center">
          <span
            className={cn(
              "text-[10px] font-black tracking-[0.25em] uppercase transition-colors duration-500",
              currentPhase === 1 && "text-amber-600 dark:text-amber-400",
              currentPhase === 2 && "text-rose-600 dark:text-rose-400 animate-pulse",
              currentPhase === 3 && "text-amber-600 dark:text-amber-400"
            )}
          >
            {dateInfo.weekday}
          </span>
          <span
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl font-mono font-black tracking-tight leading-none mt-1 transition-colors duration-500",
              currentPhase === 1 && "text-amber-950 dark:text-amber-100",
              currentPhase === 2 && "text-rose-950 dark:text-rose-100",
              currentPhase === 3 && "text-amber-950 dark:text-amber-100"
            )}
          >
            {currentTime || "14:54:59"}
          </span>
        </div>

        {/* Animação do Orb com transição suave entre fases */}
        <div className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
          <AnimatePresence mode="wait">
            {currentPhase === 1 && (
              <motion.div
                key="phase-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
              >
                <Phase1Orb />
              </motion.div>
            )}

            {currentPhase === 2 && (
              <motion.div
                key="phase-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.35,
                  transition: { duration: 0.45, ease: "easeIn" },
                }}
                transition={{ duration: 0.4 }}
              >
                <Phase2Orb />
              </motion.div>
            )}

            {currentPhase === 3 && (
              <motion.div
                key="phase-3"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <Phase3Orb isDark={isDark} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Linha Inferior: Data por Extenso e Contexto de UI */}
      <div
        className={cn(
          "flex flex-col items-center md:items-end gap-1.5 border-t pt-2 w-full transition-colors duration-500",
          currentPhase === 1 && "border-amber-500/10 dark:border-amber-400/10",
          currentPhase === 2 && "border-rose-500/20 dark:border-rose-400/20",
          currentPhase === 3 && "border-amber-500/10 dark:border-amber-400/10"
        )}
      >
        <h2
          className={cn(
            "text-base sm:text-lg md:text-xl font-display font-black tracking-tight uppercase whitespace-nowrap transition-colors duration-500",
            currentPhase === 1 && "text-amber-950 dark:text-amber-100",
            currentPhase === 2 && "text-rose-950 dark:text-rose-100",
            currentPhase === 3 && "text-amber-950 dark:text-amber-100"
          )}
        >
          DIA {dateInfo.dayNumeric} DE {dateInfo.monthLong} DE {dateInfo.year}
        </h2>

        {/* Mensagem e Contexto da UI de acordo com a fase */}
        <div className="flex items-center gap-2">
          {currentPhase === 1 && (
            <div className="flex items-center gap-1 text-muted-foreground animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-amber-500/80" />
              <p className="text-[10px] sm:text-xs font-bold tracking-tight text-amber-900/70 dark:text-amber-400/80 uppercase">
                SUAS FINANÇAS EM ÓRBITA
              </p>
            </div>
          )}

          {currentPhase === 2 && (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 animate-fade-in">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <p className="text-[10px] sm:text-xs font-black tracking-tight text-rose-600 dark:text-rose-400 uppercase">
                ATENÇÃO: ÓRBITA SOB PRESSÃO (70%+ GASTOS)
              </p>
            </div>
          )}

          {currentPhase === 3 && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 animate-fade-in">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <p className="text-[10px] sm:text-xs font-bold tracking-tight text-amber-900/80 dark:text-amber-400/90 uppercase">
                ALERTA: ORÇAMENTO FORA DE ÓRBITA
              </p>
            </div>
          )}

          {/* Seletor Discreto de Simulação / Detalhes Orçamentários */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="Informações de Órbita e Simulação"
                className={cn(
                  "p-0.5 rounded-full transition-colors opacity-60 hover:opacity-100",
                  currentPhase === 1 && "text-amber-600 hover:bg-amber-500/10",
                  currentPhase === 2 && "text-rose-600 hover:bg-rose-500/10",
                  currentPhase === 3 && "text-amber-600 hover:bg-amber-500/10"
                )}
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-3.5 rounded-2xl shadow-xl border border-border/60 bg-popover/95 backdrop-blur-md text-left"
            >
              <div className="space-y-2.5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Sistema Estelar Financeiro
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    A órbita progride visualmente com base no limite de gastos orçamentários mantendo o mesmo estilo visual da interface.
                  </p>
                </div>

                {/* Métricas Reais do Snapshot */}
                <div className="bg-muted/40 rounded-xl p-2.5 space-y-1 text-[11px] font-medium border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orçamento (Snapshot):</span>
                    <span className="font-bold text-foreground">
                      {budgetTotal > 0 ? formatCurrency(budgetTotal) : "Não fixado"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Realizado do Mês:</span>
                    <span className="font-bold text-foreground">{formatCurrency(realizedTotal)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/30">
                    <span className="text-muted-foreground font-semibold">Percentual Gasto:</span>
                    <span
                      className={cn(
                        "font-black",
                        autoPhase === 1 && "text-amber-600 dark:text-amber-400",
                        autoPhase === 2 && "text-rose-600 dark:text-rose-400",
                        autoPhase === 3 && "text-red-500"
                      )}
                    >
                      {spentPercentage.toFixed(1)}% (Fase {autoPhase})
                    </span>
                  </div>
                </div>

                {/* Alternador / Teste de Fases */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Visualizar Animações
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    <Button
                      variant={overridePhase === null ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] font-bold px-1 rounded-lg"
                      onClick={() => setOverridePhase(null)}
                    >
                      Auto
                    </Button>
                    <Button
                      variant={overridePhase === 1 ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] font-bold px-1 rounded-lg"
                      onClick={() => setOverridePhase(1)}
                    >
                      Fase 1
                    </Button>
                    <Button
                      variant={overridePhase === 2 ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] font-bold px-1 rounded-lg"
                      onClick={() => setOverridePhase(2)}
                    >
                      Fase 2
                    </Button>
                    <Button
                      variant={overridePhase === 3 ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] font-bold px-1 rounded-lg"
                      onClick={() => setOverridePhase(3)}
                    >
                      Fase 3
                    </Button>
                  </div>
                  {overridePhase !== null && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold italic">
                      Modo simulação ativo. Clique em "Auto" para retornar ao cálculo real.
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
