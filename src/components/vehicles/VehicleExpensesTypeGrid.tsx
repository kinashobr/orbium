"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Fuel, 
  Wrench, 
  Sparkles, 
  Receipt, 
  Trash2, 
  Pencil, 
  X, 
  Check 
} from "lucide-react";
import { formatCurrency, Veiculo, VehicleHistoryItem } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";

interface VehicleExpensesTypeGridProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleExpensesTypeGrid({ veiculo, onUpdateVeiculo }: VehicleExpensesTypeGridProps) {
  const { contasMovimento, setTransacoesV2 } = useFinance();

  // Estado do item em edição inline (reutilizando a tela de alocação)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Estados dos campos de edição
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros'>("outros");

  // Campos específicos
  const [editLitres, setEditLitres] = useState("");
  const [editPricePerLitre, setEditPricePerLitre] = useState("");
  const [editOdometer, setEditOdometer] = useState("");
  const [editFuelType, setEditFuelType] = useState<string>("gasolina_comum");

  const [editMaintPart, setEditMaintPart] = useState("");
  const [editMaintKm, setEditMaintKm] = useState("");
  const [editMaintEstablishment, setEditMaintEstablishment] = useState("");

  const [editCosmeticType, setEditCosmeticType] = useState("");
  const [editCosmeticBrand, setEditCosmeticBrand] = useState("");

  // Processamento e agrupamento dos gastos por tipo
  const groups = useMemo(() => {
    const list: Record<string, { key: string; label: string; icon: any; color: string; chartColor: string; items: VehicleHistoryItem[]; total: number }> = {
      combustivel: { key: "combustivel", label: "Combustível", icon: Fuel, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", chartColor: "#F59E0B", items: [], total: 0 },
      manutencao_periodica: { key: "manutencao_periodica", label: "Manutenção Periódica", icon: Wrench, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", chartColor: "#3B82F6", items: [], total: 0 },
      cosmetico: { key: "cosmetico", label: "Cosméticos & Cuidados", icon: Sparkles, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", chartColor: "#A855F7", items: [], total: 0 },
      outros: { key: "outros", label: "Outros Gastos / Taxas", icon: Receipt, color: "text-slate-500 bg-slate-500/10 border-slate-500/20", chartColor: "#64748B", items: [], total: 0 },
    };

    if (!veiculo || !veiculo.historico) return list;

    veiculo.historico.forEach(item => {
      if (item.type === "fipe") return;

      let tipo = "outros";
      if (item.meta?.gastoTipo) {
        tipo = item.meta.gastoTipo as string;
      } else {
        const text = `${item.title} ${item.description || ""}`.toLowerCase();
        if (text.includes("combust") || text.includes("gasol") || text.includes("abastec") || text.includes("etanol") || text.includes("diesel")) {
          tipo = "combustivel";
        } else if (text.includes("cosmet") || text.includes("protet") || text.includes("cera") || text.includes("limpeza") || text.includes("lavagem")) {
          tipo = "cosmetico";
        } else if (text.includes("oleo") || text.includes("filtro") || text.includes("pneu") || text.includes("freio") || item.type === "manutencao") {
          tipo = "manutencao_periodica";
        }
      }

      if (list[tipo]) {
        list[tipo].items.push(item);
        list[tipo].total += item.amount || 0;
      } else {
        list.outros.items.push(item);
        list.outros.total += item.amount || 0;
      }
    });

    Object.keys(list).forEach(key => {
      list[key].items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return list;
  }, [veiculo]);

  // Total geral
  const grandTotal = useMemo(() => {
    return Object.values(groups).reduce((acc, g) => acc + g.total, 0);
  }, [groups]);

  // Handler para iniciar a edição do item (preenche formulário de alocação)
  const handleStartEdit = (item: VehicleHistoryItem) => {
    if (editingItemId === item.id) {
      setEditingItemId(null);
      return;
    }

    setEditingItemId(item.id);
    setEditTitle(item.title || "");
    setEditAmount(item.amount?.toString() || "");
    setEditDate(item.date ? item.date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"));

    let detectedType: 'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros' = "outros";
    if (item.meta?.gastoTipo) {
      detectedType = item.meta.gastoTipo as any;
    } else if (item.type === "manutencao") {
      detectedType = "manutencao_periodica";
    }

    setEditType(detectedType);
    setEditLitres(item.meta?.litros?.toString() || "");
    setEditPricePerLitre(item.meta?.precoLitro?.toString() || "");
    setEditOdometer((item.meta?.odometro || item.meta?.kmAtual)?.toString() || "");
    setEditFuelType((item.meta?.tipoCombustivel as string) || "gasolina_comum");

    setEditMaintPart((item.meta?.pecaServico as string) || "");
    setEditMaintKm((item.meta?.kmAtual as string) || "");
    setEditMaintEstablishment((item.meta?.estabelecimento as string) || "");

    setEditCosmeticType((item.meta?.protecaoTipo as string) || "");
    setEditCosmeticBrand((item.meta?.marca as string) || "");
  };

  // Handler para salvar as alterações do item
  const handleSaveEdit = (itemId: string) => {
    const amount = parseFloat(editAmount.replace(",", "."));
    if (!editTitle.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Por favor, preencha os dados do lançamento corretamente.");
      return;
    }

    if (!veiculo || !veiculo.historico) return;

    let targetTxId: string | undefined;

    const updatedHistory = veiculo.historico.map(item => {
      if (item.id === itemId) {
        targetTxId = item.meta?.transactionId as string | undefined;

        const newMeta: Record<string, unknown> = {
          ...item.meta,
          gastoTipo: editType,
        };

        if (editType === "combustivel") {
          newMeta.litros = editLitres ? parseFloat(editLitres.replace(",", ".")) : undefined;
          newMeta.precoLitro = editPricePerLitre ? parseFloat(editPricePerLitre.replace(",", ".")) : undefined;
          newMeta.odometro = editOdometer ? parseFloat(editOdometer.replace(",", ".")) : undefined;
          newMeta.kmAtual = editOdometer ? parseFloat(editOdometer.replace(",", ".")) : undefined;
          newMeta.tipoCombustivel = editFuelType;
        } else if (editType === "manutencao_periodica") {
          newMeta.pecaServico = editMaintPart || undefined;
          newMeta.kmAtual = editMaintKm ? parseInt(editMaintKm, 10) : undefined;
          newMeta.estabelecimento = editMaintEstablishment || undefined;
        } else if (editType === "cosmetico") {
          newMeta.protecaoTipo = editCosmeticType || undefined;
          newMeta.marca = editCosmeticBrand || undefined;
        }

        return {
          ...item,
          title: editTitle,
          amount: amount,
          date: editDate,
          type: editType === 'manutencao_periodica' ? ('manutencao' as const) : ('despesa' as const),
          meta: newMeta
        };
      }
      return item;
    });

    // Atualiza a transação vinculada no financeiro se houver
    if (targetTxId && setTransacoesV2) {
      setTransacoesV2(prev => prev.map(tx => {
        if (tx.id === targetTxId) {
          return {
            ...tx,
            amount: amount,
            date: editDate,
            description: editTitle
          };
        }
        return tx;
      }));
    }

    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });
    toast.success("Lançamento atualizado com sucesso!");
    setEditingItemId(null);
  };

  // Excluir item
  const handleDeleteItem = (itemId: string) => {
    const updatedHistory = (veiculo.historico || []).filter(h => h.id !== itemId);
    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });
    toast.success("Registro removido do histórico.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-black text-xl text-foreground">Tipos de Gasto & Edição de Lançamentos</h3>
          <p className="text-xs text-muted-foreground font-medium">
            Gerencie as categorias de custos e edite lançamentos reutilizando a estrutura da alocação.
          </p>
        </div>

        <Badge variant="outline" className="font-mono font-black text-xs px-3 py-1 rounded-xl">
          Total: {formatCurrency(grandTotal)}
        </Badge>
      </div>

      {/* GRID DE CARDS DEDICADOS COM ÍCONES WATERMARK E AVATARES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(groups).map(group => {
          const IconComp = group.icon;
          const percentage = grandTotal > 0 ? ((group.total / grandTotal) * 100).toFixed(1) : "0";

          const donutData = [
            { name: group.label, value: group.total || 1 },
            { name: "Outros", value: Math.max(0, grandTotal - group.total) },
          ];

          return (
            <div 
              key={group.key} 
              className="bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 rounded-[2.5rem] p-6 shadow-soft space-y-4 hover:shadow-soft-lg transition-all relative overflow-hidden group"
            >
              {/* ÍCONE DE FUNDO WATERMARK */}
              <IconComp className="absolute -right-6 -bottom-6 w-48 h-48 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 pointer-events-none group-hover:scale-105 transition-transform duration-500" />

              <div className="flex items-center justify-between pb-4 border-b border-border/40 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm border", group.color)}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-foreground">{group.label}</h4>
                    <p className="text-xs text-muted-foreground font-bold">{group.items.length} registro(s)</p>
                  </div>
                </div>

                {/* Donut Chart Mini */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} innerRadius={14} outerRadius={22} paddingAngle={2} dataKey="value">
                          <Cell fill={group.chartColor} />
                          <Cell fill="rgba(255,255,255,0.08)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{percentage}% do Total</span>
                    <span className="font-black text-lg text-foreground tabular-nums">{formatCurrency(group.total)}</span>
                  </div>
                </div>
              </div>

              {/* LISTAGEM RICA DOS ITENS COM EDIÇÃO INLINE */}
              {group.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-medium relative z-10">
                  Nenhum gasto registrado nesta categoria.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 relative z-10">
                  {group.items.map(item => {
                    const isEditing = editingItemId === item.id;

                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-3.5 rounded-2xl transition-all border shadow-sm group/row",
                          isEditing ? "bg-card border-primary ring-1 ring-primary/30" : "bg-card hover:bg-muted/30 border-border/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0", group.color)}>
                              <IconComp className="w-5 h-5" />
                            </div>

                            <div>
                              <p className="font-black text-xs text-foreground leading-tight">{item.title}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0">
                                  {item.date ? format(parseDateLocal(item.date), "dd/MM/yy") : "S/D"}
                                </Badge>
                                {item.meta?.litros && (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-bold px-1.5 py-0">
                                    ⛽ {item.meta.litros} L
                                  </Badge>
                                )}
                                {(item.meta?.odometro || item.meta?.kmAtual) && (
                                  <Badge className="bg-blue-500/10 text-blue-600 border-none text-[9px] font-bold px-1.5 py-0">
                                    🚗 {Number(item.meta?.odometro || item.meta?.kmAtual).toLocaleString('pt-BR')} KM
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-foreground tabular-nums mr-2">{formatCurrency(item.amount)}</span>

                            {/* BOTÃO EDITAR ITEM (REUTILIZA ESTRUTURA DA TELA DE ALOCAÇÃO) */}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className={cn(
                                "w-8 h-8 rounded-xl transition-colors",
                                isEditing ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                              title="Editar Lançamento"
                              onClick={() => handleStartEdit(item)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="w-8 h-8 rounded-xl text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity" 
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* FORMULÁRIO DE EDIÇÃO INLINE REUTILIZANDO O ESTILO DA TELA DE ALOCAÇÃO */}
                        {isEditing && (
                          <div className="p-4 mt-3 rounded-2xl bg-muted/30 border border-primary/20 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-primary">Editar Lançamento</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => setEditingItemId(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título / Descrição</Label>
                                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-9 rounded-xl font-bold text-xs" />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
                                <Input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="h-9 rounded-xl font-bold text-xs tabular-nums" />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data</Label>
                                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-9 rounded-xl font-bold text-xs" />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Gasto</Label>
                                <Select value={editType} onValueChange={(v: any) => setEditType(v)}>
                                  <SelectTrigger className="h-9 rounded-xl font-bold text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent className="rounded-xl font-bold text-xs">
                                    <SelectItem value="combustivel">⛽ Combustível</SelectItem>
                                    <SelectItem value="manutencao_periodica">🔧 Manutenção</SelectItem>
                                    <SelectItem value="cosmetico">✨ Cosméticos/Cuidados</SelectItem>
                                    <SelectItem value="outros">📝 Outros</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* CAMPOS ESPECÍFICOS POR TIPO */}
                            {editType === 'combustivel' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-xl bg-card border border-border/40">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Litros (L)</Label>
                                  <Input placeholder="Ex: 10" value={editLitres} onChange={e => setEditLitres(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço/Litro (R$)</Label>
                                  <Input placeholder="Ex: 5.00" value={editPricePerLitre} onChange={e => setEditPricePerLitre(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Odômetro (KM)</Label>
                                  <Input placeholder="Ex: 10300" value={editOdometer} onChange={e => setEditOdometer(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Combustível</Label>
                                  <Select value={editFuelType} onValueChange={setEditFuelType}>
                                    <SelectTrigger className="h-8 rounded-lg font-bold text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gasolina_comum">Gasolina Comum</SelectItem>
                                      <SelectItem value="gasolina_aditivada">Gasolina Aditivada</SelectItem>
                                      <SelectItem value="etanol">Etanol</SelectItem>
                                      <SelectItem value="diesel">Diesel</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {editType === 'manutencao_periodica' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-card border border-border/40">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peça ou Serviço</Label>
                                  <Input placeholder="Ex: Troca de Óleo" value={editMaintPart} onChange={e => setEditMaintPart(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quilometragem (KM)</Label>
                                  <Input placeholder="Ex: 45000" value={editMaintKm} onChange={e => setEditMaintKm(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Oficina / Estabelecimento</Label>
                                  <Input placeholder="Ex: Auto Center" value={editMaintEstablishment} onChange={e => setEditMaintEstablishment(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                              </div>
                            )}

                            {editType === 'cosmetico' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border/40">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proteção / Cuidado</Label>
                                  <Input placeholder="Ex: Lavagem completa" value={editCosmeticType} onChange={e => setEditCosmeticType(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marca / Produto</Label>
                                  <Input placeholder="Ex: Vonixx" value={editCosmeticBrand} onChange={e => setEditCosmeticBrand(e.target.value)} className="h-8 rounded-lg font-bold text-xs" />
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                              <Button size="sm" variant="ghost" className="h-8 rounded-xl font-bold text-xs" onClick={() => setEditingItemId(null)}>
                                Cancelar
                              </Button>
                              <Button size="sm" className="h-8 rounded-xl font-black uppercase text-xs px-5 bg-primary text-primary-foreground hover:bg-primary/90 gap-1" onClick={() => handleSaveEdit(item.id)}>
                                <Check className="w-3.5 h-3.5" /> Salvar Alterações
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
