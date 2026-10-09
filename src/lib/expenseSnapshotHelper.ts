import { BillDisplayItem, Categoria, MonthlyExpenseSnapshot, ExpenseSnapshotCategory, ExpenseSnapshotItem } from "@/types/finance";
import { format } from "date-fns";

export const getBillCategoryLabel = (bill: any, categoriasV2: Categoria[]): string => {
  const categoryId = bill.suggestedCategoryId || bill.categoryId;
  if (categoryId) {
    const category = categoriasV2.find(c => c.id === categoryId);
    if (category) return category.label;
  }

  const desc = (bill.description || "").toLowerCase();
  if (desc.includes("academia")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("academia"));
    if (cat) return cat.label;
    return "Academia";
  }
  if (desc.includes("energia") || desc.includes("luz")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("energia") || c.label.toLowerCase().includes("luz"));
    if (cat) return cat.label;
    return "Energia Elétrica";
  }
  if (desc.includes("internet") || desc.includes("wifi")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("internet") || c.label.toLowerCase().includes("wifi"));
    if (cat) return cat.label;
    return "Internet";
  }
  if (desc.includes("seguro")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("seguro"));
    if (cat) return cat.label;
    return "Seguro";
  }
  if (desc.includes("cabelo") || desc.includes("remedio") || desc.includes("remédio") || desc.includes("vitamina") || desc.includes("manual")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("médic") || c.label.toLowerCase().includes("remedio") || c.label.toLowerCase().includes("saúde") || c.label.toLowerCase().includes("vitamin"));
    if (cat) return cat.label;
    return "Remédios e Vitaminas";
  }
  if (desc.includes("combustivel") || desc.includes("gasolina") || desc.includes("posto")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("combustiv"));
    if (cat) return cat.label;
    return "Combustivel";
  }
  if (desc.includes("barbeiro") || desc.includes("cabelereiro") || desc.includes("corte")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("barbeir") || c.label.toLowerCase().includes("cabel"));
    if (cat) return cat.label;
    return "Barbeiro / Cabelereiro";
  }
  if (desc.includes("empréstimo") || desc.includes("emprestimo") || desc.includes("financiamento")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("empréstimo") || c.label.toLowerCase().includes("emprestimo") || c.label.toLowerCase().includes("financiamento"));
    if (cat) return cat.label;
    return "Financiam.";
  }

  if (bill.sourceType === "card_invoice") return "Fatura";
  if (bill.sourceType === "loan_installment") return "Financiam.";
  if (bill.sourceType === "insurance_installment") return "Seguro";

  return "Compromissos Planejados";
};

export const buildSnapshotFromBills = (
  monthDate: Date,
  bills: BillDisplayItem[],
  categoriasV2: Categoria[],
  existingCreatedAt?: string
): MonthlyExpenseSnapshot => {
  const monthKey = format(monthDate, "yyyy-MM");
  const nowIso = new Date().toISOString();

  // Filtra as despesas válidas cadastradas para o mês (excluindo faturas sintéticas de cartão)
  const validBills = bills.filter(
    b => !b.isExcluded && b.expectedAmount > 0 && b.sourceType !== "card_invoice" && getBillCategoryLabel(b, categoriasV2) !== "Fatura"
  );

  const categoryTotals: Record<string, number> = {};
  const items: ExpenseSnapshotItem[] = [];

  validBills.forEach(bill => {
    const catLabel = getBillCategoryLabel(bill, categoriasV2);
    categoryTotals[catLabel] = (categoryTotals[catLabel] || 0) + bill.expectedAmount;

    items.push({
      id: bill.id,
      description: bill.description,
      expectedAmount: bill.expectedAmount,
      categoryName: catLabel,
      categoryId: bill.suggestedCategoryId || null,
      dueDate: bill.dueDate,
      sourceType: bill.sourceType,
    });
  });

  const categories: ExpenseSnapshotCategory[] = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalAmount = categories.reduce((sum, c) => sum + c.value, 0);

  return {
    monthKey,
    createdAt: existingCreatedAt || nowIso,
    updatedAt: nowIso,
    totalAmount,
    categories,
    items,
  };
};
