// ============================================
// HELPER: Cálculos Financeiros de Cartão de Crédito
// Inspirado na lógica real de faturas bancárias
// ============================================

export interface MinimumPaymentResult {
  minimumAmount: number;
  remainingBalance: number;
}

export interface RevolvingImpact {
  interest: number;
  nextMonthEstimate: number; // saldo restante + juros
}

export interface InstallmentPlan {
  months: number;
  monthlyPayment: number;
  totalAmount: number;
  totalInterest: number;
  monthlyRate: number;
}

/**
 * Calcula o pagamento mínimo da fatura.
 * Fórmula simplificada: % do valor total de compras em aberto.
 * Base real: 15% das compras em aberto (mês atual) + 100% de outros lançamentos
 */
export function calculateMinimumPayment(
  invoiceAmount: number,
  minimumPercent = 0.15,
  absoluteMinimum = 10
): MinimumPaymentResult {
  const minimumAmount = Math.min(
    invoiceAmount,
    Math.max(invoiceAmount * minimumPercent, absoluteMinimum)
  );
  const remainingBalance = invoiceAmount - minimumAmount;
  return { minimumAmount, remainingBalance };
}

/**
 * Calcula o impacto de entrar no rotativo (juros sobre saldo restante).
 * Fórmula: saldoRestante × taxaMensal = juros do próximo ciclo
 */
export function calculateRevolvingImpact(
  remainingBalance: number,
  monthlyRate: number // ex: 0.161 = 16,1% ao mês
): RevolvingImpact {
  if (monthlyRate <= 0 || remainingBalance <= 0) {
    return { interest: 0, nextMonthEstimate: remainingBalance };
  }
  const interest = remainingBalance * monthlyRate;
  return {
    interest: Math.round(interest * 100) / 100,
    nextMonthEstimate: Math.round((remainingBalance + interest) * 100) / 100,
  };
}

/**
 * Simula parcelamento de fatura usando Tabela Price.
 * PMT = PV × [i × (1+i)^n] / [(1+i)^n - 1]
 */
export function simulateInstallmentPlan(
  invoiceAmount: number,
  months: number,
  monthlyRate: number // ex: 0.1286 = 12,86% ao mês
): InstallmentPlan {
  if (monthlyRate <= 0) {
    const monthlyPayment = invoiceAmount / months;
    return {
      months,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalAmount: Math.round(invoiceAmount * 100) / 100,
      totalInterest: 0,
      monthlyRate,
    };
  }

  const i = monthlyRate;
  const n = months;
  const factor = Math.pow(1 + i, n);
  const pmt = invoiceAmount * (i * factor) / (factor - 1);
  const total = pmt * n;
  const totalInterest = total - invoiceAmount;

  return {
    months,
    monthlyPayment: Math.round(pmt * 100) / 100,
    totalAmount: Math.round(total * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyRate,
  };
}

/**
 * Gera simulações para múltiplos prazos de parcelamento.
 */
export function generateInstallmentOptions(
  invoiceAmount: number,
  monthlyRate: number,
  options = [3, 6, 12]
): InstallmentPlan[] {
  return options.map(months => simulateInstallmentPlan(invoiceAmount, months, monthlyRate));
}

/**
 * Formata taxa mensal como porcentagem legível: 0.161 → "16,10%"
 */
export function formatMonthlyRate(rate: number): string {
  return (rate * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}
