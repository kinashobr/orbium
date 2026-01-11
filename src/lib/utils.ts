import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma string YYYY-MM-DD em um objeto Date, forçando a interpretação no fuso horário local.
 * Isso evita o problema de deslocamento de 1 dia que ocorre quando o JS interpreta YYYY-MM-DD como UTC.
 * @param dateString A string da data no formato YYYY-MM-DD.
 * @returns Objeto Date representando o início do dia local.
 */
export function parseDateLocal(dateString: string): Date {
  if (!dateString || dateString.length < 10) {
    // Retorna a data atual ou uma data inválida se a string for inválida
    return new Date(dateString);
  }
  const [year, month, day] = dateString.split('-').map(Number);
  // Cria a data usando componentes, forçando a interpretação local
  // Nota: month - 1 é necessário porque o mês é 0-indexado
  return new Date(year, month - 1, day);
}

/**
 * Calcula a taxa de juros mensal (i) usando o método de Newton-Raphson para a fórmula PRICE.
 * P = PMT * [ (1 - (1 + i)^-n) / i ]
 * @param principal Valor principal (P)
 * @param payment Parcela mensal (PMT)
 * @param periods Número de períodos (n)
 * @returns Taxa de juros mensal em percentual (ex: 1.5 para 1.5%) ou null se não convergir.
 */
export function calculateInterestRate(principal: number, payment: number, periods: number): number | null {
  if (principal <= 0 || payment <= 0 || periods <= 0) return null;
  if (payment * periods < principal) return null; // Pagamento total menor que o principal

  // Função para calcular o valor presente líquido (VPL) dado uma taxa 'i'
  const npv = (i: number) => {
    if (i === 0) return payment * periods - principal;
    return payment * ((1 - Math.pow(1 + i, -periods)) / i) - principal;
  };

  // Derivada da função VPL (para Newton-Raphson)
  const npvDerivative = (i: number) => {
    if (i === 0) return 0; // Não deve acontecer na prática
    const term1 = payment * (periods * Math.pow(1 + i, -periods - 1) * i - (1 - Math.pow(1 + i, -periods))) / (i * i);
    return term1;
  };

  let rate = 0.01; // Chute inicial de 1%
  const maxIterations = 100;
  const tolerance = 0.0000001;

  for (let i = 0; i < maxIterations; i++) {
    const npvValue = npv(rate);
    if (Math.abs(npvValue) < tolerance) {
      return rate * 100; // Retorna em percentual
    }

    const derivative = npvDerivative(rate);
    if (Math.abs(derivative) < tolerance) {
      // Derivada muito próxima de zero, falha na convergência
      return null;
    }

    rate = rate - npvValue / derivative;

    if (rate < 0) {
      // Se a taxa for negativa, tenta um chute menor
      rate = 0.001;
    }
  }

  return null; // Não convergiu
}

/**
 * Helper function to calculate the due date of an installment.
 * Assumes the start date is the due date of the first installment.
 * @param startDateStr The start date string (YYYY-MM-DD).
 * @param installmentNumber The installment number (1-indexed).
 * @returns Date object representing the due date.
 */
export const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  const startDate = parseDateLocal(startDateStr);
  const dueDate = new Date(startDate);
  
  // Adjustment: If installmentNumber = 1, add 0 months.
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  
  return dueDate;
};