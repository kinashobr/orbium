import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Building2, Landmark, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, DollarSign, Coins, CreditCard 
} from "lucide-react";

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
  if (!dateString) {
    return new Date(NaN);
  }

  // Handle ISO strings by taking the date portion
  let targetString = dateString;
  if (dateString.includes('T')) {
    targetString = dateString.split('T')[0];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetString)) {
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
  }

  const [year, month, day] = targetString.split('-').map(Number);
  if (!year || !month || !day) return new Date(NaN);

  // Cria a data usando componentes, forçando a interpretação local
  // Nota: month - 1 é necessário porque o mês é 0-indexado
  return new Date(year, month - 1, day);
}

/**
 * Formata um objeto Date ou string de data em uma string YYYY-MM-DD usando o fuso horário local.
 * @param date O objeto Date, string ou undefined a ser formatado.
 * @returns String formatada YYYY-MM-DD ou undefined.
 */
export function formatDateLocal(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  if (isNaN(d.getTime())) return undefined;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  if (Number.isNaN(startDate.getTime())) return new Date(NaN);
  const dueDate = new Date(startDate);
  
  // Adjustment: If installmentNumber = 1, add 0 months.
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  
  return dueDate;
};

export function getAccountIcon(type: string, name: string = "") {
  const lowerName = name.toLowerCase();
  
  // Checks for crypto currencies and tokens
  if (type === 'cripto') {
    if (lowerName.includes('btc') || lowerName.includes('bitcoin')) {
      return Bitcoin;
    }
    if (lowerName.includes('usdt') || lowerName.includes('tether')) {
      return DollarSign;
    }
    return Coins;
  }
  
  switch (type) {
    case 'corrente':
      return Landmark;
    case 'poupanca':
      return PiggyBank;
    case 'renda_fixa':
      return TrendingUp;
    case 'reserva':
      return Shield;
    case 'objetivo':
      return Target;
    case 'cartao_credito':
      return CreditCard;
    default:
      return Wallet;
  }
}

export const getEstimatedIpvaAndDueDate = (
  placa: string,
  tipo: 'carro' | 'moto' | 'caminhao',
  valorFipe: number,
  anoAtual: number = new Date().getFullYear()
) => {
  if (!placa) return { valorIpva: 0, vencimentoIpva: "", valorLicenciamento: 0, vencimentoLicenciamento: "" };

  const cleanedPlaca = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleanedPlaca.length < 5) return { valorIpva: 0, vencimentoIpva: "", valorLicenciamento: 0, vencimentoLicenciamento: "" };

  const lastChar = cleanedPlaca.charAt(cleanedPlaca.length - 1);
  const lastDigit = parseInt(lastChar, 10);

  // IPVA rates standard reference (e.g. SP/RJ/MG): 4% for cars, 2% for bikes, 1.5% for trucks
  let rate = 0.04;
  if (tipo === 'moto') rate = 0.02;
  else if (tipo === 'caminhao') rate = 0.015;

  const valorIpva = Math.round(valorFipe * rate * 100) / 100;

  // IPVA Vencimento (Jan to Oct according to last digit)
  let ipvaMonth = 1;
  if (!isNaN(lastDigit)) {
    if (lastDigit === 0) ipvaMonth = 10;
    else ipvaMonth = lastDigit;
  }
  const vencimentoIpva = `${anoAtual}-${String(ipvaMonth).padStart(2, '0')}-15`;

  // Standard licensing fee reference (around R$ 160.00)
  const valorLicenciamento = 160.00;

  // Licensing Vencimento (Jul to Dec according to last digit)
  let licMonth = 7;
  if (!isNaN(lastDigit)) {
    if (lastDigit === 1 || lastDigit === 2) licMonth = 7;
    else if (lastDigit === 3 || lastDigit === 4) licMonth = 8;
    else if (lastDigit === 5 || lastDigit === 6) licMonth = 9;
    else if (lastDigit === 7 || lastDigit === 8) licMonth = 10;
    else if (lastDigit === 9) licMonth = 11;
    else if (lastDigit === 0) licMonth = 12;
  }
  const vencimentoLicenciamento = `${anoAtual}-${String(licMonth).padStart(2, '0')}-31`;

  return { valorIpva, vencimentoIpva, valorLicenciamento, vencimentoLicenciamento };
};