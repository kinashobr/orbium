import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tags, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Repeat, 
  ArrowLeft, Search, X, FolderOpen, Layers, Check, Sparkles
} from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS, generateCategoryId, getCategoryTypeFromNature } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface CategoryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Categoria[];
  onAddCategory?: () => void;
  onEditCategory?: (category: Categoria) => void;
  onSaveCategory?: (category: Categoria) => void;
  onDeleteCategory: (categoryId: string) => void;
  transactionCountByCategory: Record<string, number>;
  onSelectCategory?: (category: Categoria) => void;
}

interface IconSearchItem {
  emoji: string;
  keywords: string[];
}

// Complete rich icon database with Portuguese search keywords
const ICONS_DATABASE: Record<CategoryNature, IconSearchItem[]> = {
  receita: [
    { emoji: "💰", keywords: ["dinheiro", "saco", "salario", "receita", "renda", "lucro", "money", "pagamento"] },
    { emoji: "💳", keywords: ["cartao", "credito", "debito", "banco", "pix"] },
    { emoji: "🏦", keywords: ["banco", "agencia", "deposito", "transferencia"] },
    { emoji: "📈", keywords: ["investimento", "grafico", "acoes", "rendimento", "alta"] },
    { emoji: "💼", keywords: ["trabalho", "maleta", "emprego", "freelance", "salario"] },
    { emoji: "🧑‍💻", keywords: ["tech", "programador", "servico", "home office"] },
    { emoji: "🎯", keywords: ["meta", "alvo", "comissao", "bonus"] },
    { emoji: "🛠️", keywords: ["servico", "manutencao", "prestacao", "obra"] },
    { emoji: "📝", keywords: ["nota", "fatura", "contrato"] },
    { emoji: "💵", keywords: ["dolar", "nota", "dinheiro", "cash"] },
    { emoji: "🪙", keywords: ["moeda", "troco", "cripto"] },
    { emoji: "💎", keywords: ["patrimonio", "luxo", "joia"] },
    { emoji: "📊", keywords: ["relatorio", "balanco", "faturamento"] },
    { emoji: "🏆", keywords: ["premio", "conquista", "bonus"] },
    { emoji: "🧧", keywords: ["envelope", "presente", "pix"] },
    { emoji: "💸", keywords: ["transferencia", "envio", "renda"] },
    { emoji: "🏢", keywords: ["empresa", "cnpj", "sociedade"] },
    { emoji: "✨", keywords: ["extra", "bicos", "outros"] },
  ],
  despesa_fixa: [
    { emoji: "🦷", keywords: ["dente", "dentista", "odontologia", "aparelho", "saude"] },
    { emoji: "👓", keywords: ["oculos", "otica", "visao", "lentes", "saude"] },
    { emoji: "🩺", keywords: ["medico", "consulta", "estetoscopio", "exame", "saude"] },
    { emoji: "🏥", keywords: ["hospital", "clinica", "pronto socorro", "convenio"] },
    { emoji: "💊", keywords: ["farmacia", "remedio", "plano de saude", "medicamento"] },
    { emoji: "🏠", keywords: ["casa", "aluguel", "moradia", "home", "imovel"] },
    { emoji: "🏢", keywords: ["apartamento", "condominio", "predio"] },
    { emoji: "🔑", keywords: ["chave", "aluguel", "prestacao"] },
    { emoji: "⚡", keywords: ["energia", "luz", "eletricidade", "conta"] },
    { emoji: "🔌", keywords: ["tomada", "eletronicos", "equipamentos"] },
    { emoji: "💧", keywords: ["agua", "saneamento", "hidraulica"] },
    { emoji: "🔥", keywords: ["gas", "botijao", "aquecimento"] },
    { emoji: "📶", keywords: ["wifi", "internet", "fibra", "banda larga"] },
    { emoji: "📱", keywords: ["celular", "plano", "operadora", "telefone"] },
    { emoji: "🚗", keywords: ["carro", "ipva", "seguro", "financiamento"] },
    { emoji: "🎓", keywords: ["faculdade", "escola", "mensalidade", "curso"] },
    { emoji: "📚", keywords: ["material", "livros", "estudo"] },
    { emoji: "🍼", keywords: ["filhos", "bebe", "creche"] },
    { emoji: "🐶", keywords: ["pet", "cachorro", "plano de saude pet"] },
    { emoji: "🐱", keywords: ["gato", "pet", "racao"] },
    { emoji: "🏋️", keywords: ["academia", "personal", "mensalidade", "treino"] },
    { emoji: "🧾", keywords: ["iptu", "imposto", "taxa", "boleto"] },
    { emoji: "🔒", keywords: ["seguranca", "alarme", "monitoramento"] },
  ],
  despesa_variavel: [
    { emoji: "🍽️", keywords: ["restaurante", "almoco", "jantar", "comida"] },
    { emoji: "🍕", keywords: ["pizza", "delivery", "ifood", "lanche"] },
    { emoji: "🍔", keywords: ["hamburguer", "fastfood", "lanche"] },
    { emoji: "☕", keywords: ["cafe", "expresso", "padaria"] },
    { emoji: "🛒", keywords: ["mercado", "supermercado", "compras", "feira"] },
    { emoji: "🥩", keywords: ["carne", "churrasco", "acougue"] },
    { emoji: "🍣", keywords: ["sushi", "japones", "comida"] },
    { emoji: "🛍️", keywords: ["shopping", "compras", "loja"] },
    { emoji: "👕", keywords: ["roupa", "vestuario", "moda"] },
    { emoji: "👟", keywords: ["tenis", "sapato", "calcado"] },
    { emoji: "💇", keywords: ["cabeleireiro", "barbeiro", "corte", "cabelo"] },
    { emoji: "💅", keywords: ["manicure", "unha", "beleza", "estetica"] },
    { emoji: "🍦", keywords: ["sorvete", "sobremesa", "doce"] },
    { emoji: "🍷", keywords: ["vinho", "bebida", "jantar"] },
    { emoji: "🍺", keywords: ["cerveja", "bar", "happy hour", "chopp"] },
    { emoji: "🎮", keywords: ["games", "jogos", "steam", "playstation"] },
    { emoji: "🎬", keywords: ["cinema", "filmes", "teatro", "netflix"] },
    { emoji: "🍿", keywords: ["pipoca", "snack", "lazer", "cinema"] },
    { emoji: "🎧", keywords: ["musica", "spotify", "fone"] },
    { emoji: "🎟️", keywords: ["ingresso", "show", "evento", "festa"] },
    { emoji: "✈️", keywords: ["viagem", "passagem", "ferias", "hotel"] },
    { emoji: "⛽", keywords: ["combustivel", "gasolina", "etanol", "posto"] },
    { emoji: "🧰", keywords: ["mecanico", "oficina", "reparo"] },
    { emoji: "🚕", keywords: ["uber", "taxi", "99", "corrida"] },
    { emoji: "🚲", keywords: ["bike", "bicicleta", "transporte"] },
    { emoji: "⚽", keywords: ["futebol", "esporte", "jogo"] },
    { emoji: "🎁", keywords: ["presente", "aniversario"] },
    { emoji: "🧹", keywords: ["faxina", "diarista", "limpeza"] },
  ]
};

const getNatureMeta = (nature: CategoryNature) => {
  switch (nature) {
    case 'receita':
      return {
        icon: TrendingUp,
        label: CATEGORY_NATURE_LABELS.receita,
        color: "text-emerald-500",
        borderHighlight: "border-emerald-500/40 hover:border-emerald-500/70",
        cardBg: "from-emerald-500/[0.08] to-transparent",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
      };
    case 'despesa_fixa':
      return {
        icon: Repeat,
        label: CATEGORY_NATURE_LABELS.despesa_fixa,
        color: "text-purple-500",
        borderHighlight: "border-purple-500/40 hover:border-purple-500/70",
        cardBg: "from-purple-500/[0.08] to-transparent",
        badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25"
      };
    case 'despesa_variavel':
      return {
        icon: TrendingDown,
        label: CATEGORY_NATURE_LABELS.despesa_variavel,
        color: "text-rose-500",
        borderHighlight: "border-rose-500/40 hover:border-rose-500/70",
        cardBg: "from-rose-500/[0.08] to-transparent",
        badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
      };
    default:
      return {
        icon: Layers,
        label: "Outros",
        color: "text-muted-foreground",
        borderHighlight: "border-border/40",
        cardBg: "from-muted/20 to-transparent",
        badgeBg: "bg-muted text-muted-foreground"
      };
  }
};

export function CategoryListModal({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onEditCategory,
  onSaveCategory,
  onDeleteCategory,
  transactionCountByCategory,
  onSelectCategory
}: CategoryListModalProps) {
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNature, setSelectedNature] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Floating side-modal state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Dynamic In-Modal Form State: Editing or Creating
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formIcon, setFormIcon] = useState("📦");
  const [formNature, setFormNature] = useState<CategoryNature>("despesa_variavel");
  const [iconSearch, setIconSearch] = useState("");

  // Lock body scroll for mobile
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setIsSearchExpanded(false);
      setEditingId(null);
      setFormLabel("");
      setFormIcon("📦");
      setFormNature("despesa_variavel");
      setIconSearch("");
      setIsPanelOpen(false);
    }
  }, [open]);

  // Open side-modal in "New Category" mode
  const handleOpenNewCategory = () => {
    setEditingId(null);
    setFormLabel("");
    setFormIcon("📦");
    setFormNature("despesa_variavel");
    setIconSearch("");
    setIsPanelOpen(true);
  };

  // Open side-modal in "Edit Category" mode
  const handleStartEdit = (category: Categoria) => {
    setEditingId(category.id);
    setFormLabel(category.label);
    setFormIcon(category.icon || "📦");
    setFormNature(category.nature);
    setIconSearch("");
    setIsPanelOpen(true);
  };

  // Close floating side-modal
  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setEditingId(null);
  };

  // Submit category (Create or Update)
  const handleFormSubmit = () => {
    if (!formLabel.trim()) {
      toast.error("Preencha o nome da categoria no cartão");
      return;
    }

    const updatedCategory: Categoria = {
      id: editingId || generateCategoryId(),
      label: formLabel.trim(),
      icon: formIcon,
      nature: formNature,
      type: getCategoryTypeFromNature(formNature)
    };

    if (onSaveCategory) {
      onSaveCategory(updatedCategory);
    } else if (editingId && onEditCategory) {
      onEditCategory(updatedCategory);
    } else if (onAddCategory) {
      onAddCategory();
    }

    toast.success(editingId ? "Categoria atualizada!" : "Categoria cadastrada!");

    // Close or ready for next
    handleClosePanel();
  };

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      total: categories.length,
      receita: categories.filter(c => c.nature === 'receita').length,
      despesa_fixa: categories.filter(c => c.nature === 'despesa_fixa').length,
      despesa_variavel: categories.filter(c => c.nature === 'despesa_variavel').length,
    };
  }, [categories]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return categories.filter(cat => {
      const matchesNature = !selectedNature || cat.nature === selectedNature;
      const matchesSearch = !term || cat.label.toLowerCase().includes(term) || (cat.icon && cat.icon.includes(term));
      return matchesNature && matchesSearch;
    });
  }, [categories, selectedNature, searchTerm]);

  // Group by nature for section rendering
  const groupedFiltered = useMemo(() => {
    return {
      receita: filteredCategories.filter(c => c.nature === 'receita'),
      despesa_fixa: filteredCategories.filter(c => c.nature === 'despesa_fixa'),
      despesa_variavel: filteredCategories.filter(c => c.nature === 'despesa_variavel'),
    };
  }, [filteredCategories]);

  // Filter icons list
  const filteredIcons = useMemo(() => {
    const term = iconSearch.trim().toLowerCase();
    if (!term) {
      return (ICONS_DATABASE[formNature] || ICONS_DATABASE.despesa_variavel).map(item => item.emoji);
    }

    const results: string[] = [];
    Object.values(ICONS_DATABASE).forEach(list => {
      list.forEach(item => {
        if (
          item.emoji.includes(term) ||
          item.keywords.some(k => k.toLowerCase().includes(term))
        ) {
          if (!results.includes(item.emoji)) {
            results.push(item.emoji);
          }
        }
      });
    });

    return results;
  }, [formNature, iconSearch]);

  const handleDelete = (category: Categoria) => {
    const count = transactionCountByCategory[category.id] || 0;
    if (count > 0) {
      toast.error(`A categoria "${category.label}" possui ${count} transação(ões) vinculada(s).`);
      return;
    }
    if (confirm(`Excluir a categoria "${category.label}"?`)) {
      onDeleteCategory(category.id);
      if (editingId === category.id) {
        handleClosePanel();
      }
      toast.success("Categoria removida.");
    }
  };

  const previewMeta = getNatureMeta(formNature);
  const editingCategoryTxCount = editingId ? (transactionCountByCategory[editingId] || 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Outer transparent container holding both floating side-by-side modals */}
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 border-none bg-transparent shadow-none max-w-none w-auto flex items-center justify-center outline-none transition-all duration-300",
          isMobile && "bg-background"
        )}
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-center gap-3.5 sm:gap-4 max-h-[90vh] pointer-events-auto">
          
          {/* ========================================================= */}
          {/* MODAL 1: Category List (Left Floating Window)            */}
          {/* ========================================================= */}
          <div className={cn(
            "bg-card border border-border/50 shadow-2xl rounded-[2rem] flex flex-col overflow-hidden transition-all duration-300",
            isMobile 
              ? "w-full h-full rounded-none border-none" 
              : cn(
                  "h-[86vh]",
                  isPanelOpen ? "w-[560px] xl:w-[620px]" : "w-[760px] xl:w-[820px]"
                ),
            isMobile && isPanelOpen && "hidden"
          )}>
            {/* Header: Title, Add (+ Button w-10 h-10), Nature Filters & Search Icon at Far Right */}
            <div 
              className="px-5 sm:px-6 py-4 bg-muted/30 dark:bg-black/30 shrink-0 border-b border-border/40 relative"
              style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' } : undefined}
            >
              <div className="flex items-center justify-between gap-2.5 overflow-hidden">
                {/* Left: Title + Tags Icon */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onOpenChange(false)}
                      className="rounded-full h-9 w-9 shrink-0"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}

                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md shrink-0">
                    <Tags className="w-5 h-5" />
                  </div>

                  <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground whitespace-nowrap">
                    Categorias
                  </DialogTitle>
                </div>

                {/* Right: Nature Filters + Search Button + Nova Categoria (+) Button */}
                <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                  {/* Nature Filter Chips (Receitas, Fixas, Variáveis) */}
                  <div className="flex items-center gap-0.5 bg-muted/60 dark:bg-black/20 p-0.5 rounded-xl border border-border/40 shrink-0">
                    {[
                      { id: "receita", label: "Receitas", count: counts.receita, icon: TrendingUp, color: "text-emerald-500" },
                      { id: "despesa_fixa", label: "Fixas", count: counts.despesa_fixa, icon: Repeat, color: "text-purple-500" },
                      { id: "despesa_variavel", label: "Variáveis", count: counts.despesa_variavel, icon: TrendingDown, color: "text-rose-500" }
                    ].map(tab => {
                      const isActive = selectedNature === tab.id;
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSelectedNature(isActive ? null : tab.id)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap",
                            isActive
                              ? "bg-card text-foreground shadow-xs font-black border border-border/40"
                              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                          )}
                        >
                          <IconComp className={cn("w-3.5 h-3.5", tab.color)} />
                          <span className="hidden sm:inline text-[11px]">{tab.label}</span>
                          <span className={cn(
                            "px-1 py-0.2 rounded-md text-[10px] font-black",
                            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expandable Search Button - contained width so it never blows out */}
                  {isSearchExpanded || searchTerm ? (
                    <div className={cn(
                      "relative animate-in fade-in-50 zoom-in-95 duration-150 shrink-0",
                      isPanelOpen ? "w-28 sm:w-36" : "w-32 sm:w-44"
                    )}>
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Pesquisar..."
                        className="pl-8 pr-7 h-10 rounded-xl bg-card border font-bold text-xs focus-visible:ring-primary"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          setSearchTerm("");
                          setIsSearchExpanded(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                        title="Fechar busca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsSearchExpanded(true)}
                      title="Pesquisar Categoria"
                      className="h-10 w-10 rounded-xl bg-card border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground shadow-xs transition-all active:scale-95 shrink-0"
                    >
                      <Search className="w-4.5 h-4.5" />
                    </Button>
                  )}

                  {/* Botão + ao lado do botão pesquisar (Ocultado quando a tela ao lado expande) */}
                  {!isPanelOpen && (
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleOpenNewCategory}
                      title="Cadastrar Nova Categoria"
                      className="h-10 w-10 rounded-xl font-black bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all shrink-0 ml-0.5"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Category Cards List: 2 columns grid with fine scrollbar */}
            <ScrollArea className="flex-1 px-4 sm:px-5 py-4 scrollbar-material">
              <div className="pb-8 space-y-4">
                {filteredCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                      <FolderOpen className="w-6 h-6 opacity-50" />
                    </div>
                    <h4 className="text-xs font-black text-foreground">Nenhuma categoria encontrada</h4>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      {searchTerm 
                        ? `Não há resultados para "${searchTerm}".`
                        : "Você ainda não tem categorias cadastradas nesta seção."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenNewCategory}
                      className="rounded-xl border-primary/30 text-primary font-bold gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar Categoria
                    </Button>
                  </div>
                ) : (
                  !selectedNature ? (
                    (Object.entries(groupedFiltered) as [CategoryNature, Categoria[]][]).map(([natureKey, list]) => {
                      if (list.length === 0) return null;
                      const meta = getNatureMeta(natureKey);
                      const IconComp = meta.icon;

                      return (
                        <div key={natureKey} className="space-y-2">
                          <div className="flex items-center gap-2 border-b border-border/30 pb-1">
                            <IconComp className={cn("w-3.5 h-3.5", meta.color)} />
                            <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                              {meta.label}
                            </h5>
                            <Badge variant="secondary" className="ml-auto rounded-md text-[10px] font-bold px-1.5 py-0">
                              {list.length}
                            </Badge>
                          </div>

                          {/* EXACTLY 2 COLUMNS PER ROW */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {list.map(cat => (
                              <CategoryCard
                                key={cat.id}
                                category={cat}
                                isEditing={isPanelOpen && editingId === cat.id}
                                txCount={transactionCountByCategory[cat.id] || 0}
                                meta={meta}
                                onSelect={() => {
                                  handleStartEdit(cat);
                                  onSelectCategory?.(cat);
                                }}
                                onEdit={() => handleStartEdit(cat)}
                                onDelete={() => handleDelete(cat)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {filteredCategories.map(cat => {
                        const meta = getNatureMeta(cat.nature);
                        return (
                          <CategoryCard
                            key={cat.id}
                            category={cat}
                            isEditing={isPanelOpen && editingId === cat.id}
                            txCount={transactionCountByCategory[cat.id] || 0}
                            meta={meta}
                            onSelect={() => {
                              handleStartEdit(cat);
                              onSelectCategory?.(cat);
                            }}
                            onEdit={() => handleStartEdit(cat)}
                            onDelete={() => handleDelete(cat)}
                          />
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </ScrollArea>

            {/* Modal Bottom Footer (Clean without extra helper text) */}
            <div className="p-3 bg-muted/20 border-t border-border/40 shrink-0 flex items-center justify-end">
              {!isMobile && (
                <Button 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl h-8 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  FECHAR
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODAL 2: SEPARATE FLOATING WINDOW (Dynamic Height, No Top X) */}
          {/* ========================================================= */}
          {isPanelOpen && (
            <div className={cn(
              "bg-card border border-border/50 shadow-2xl rounded-[2rem] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200 transition-all",
              isMobile 
                ? "w-full h-full rounded-none border-none" 
                : "w-[400px] xl:w-[430px] h-fit max-h-[86vh] my-auto"
            )}>
              <ScrollArea className="flex-1 px-5 sm:px-6 py-5 scrollbar-material">
                <div className="space-y-4 pb-1">
                  
                  {/* 1. EM CIMA: AS 3 OPÇÕES DE NATUREZA (SEM BOTÃO X NO TOPO) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Natureza Financeira
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                        {editingId ? "Edição" : "Novo Cadastro"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 bg-muted/50 dark:bg-black/20 p-1 rounded-xl border border-border/40">
                      {[
                        { id: 'receita', label: 'Receita', icon: TrendingUp, color: 'text-emerald-500' },
                        { id: 'despesa_fixa', label: 'Fixa', icon: Repeat, color: 'text-purple-500' },
                        { id: 'despesa_variavel', label: 'Variável', icon: TrendingDown, color: 'text-rose-500' }
                      ].map(opt => {
                        const isSelected = formNature === opt.id;
                        const IconComp = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormNature(opt.id as CategoryNature)}
                            className={cn(
                              "py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center",
                              isSelected
                                ? "bg-card text-foreground shadow-xs border border-border/40 font-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                            )}
                          >
                            <IconComp className={cn("w-3.5 h-3.5", opt.color)} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. CARD DA PRÉVIA COM EDIÇÃO INLINE DE ALTO DESTAQUE */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span>Cartão da Categoria (Edição Inline)</span>
                      </span>
                    </div>

                    {/* HERO PREVIEW CARD (Tamanho Maior com Edição Inline) */}
                    <div className={cn(
                      "p-4 rounded-2xl bg-gradient-to-br border-2 shadow-md transition-all duration-200 relative overflow-hidden",
                      previewMeta.borderHighlight,
                      previewMeta.cardBg
                    )}>
                      <div className="flex items-center gap-3.5">
                        {/* Big Icon Avatar Box */}
                        <div 
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card border-2 border-border/40 flex items-center justify-center text-3xl sm:text-4xl shadow-md shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer relative group"
                          title="Selecione um ícone abaixo na lista"
                        >
                          <span>{formIcon}</span>
                          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-2.5 h-2.5" />
                          </span>
                        </div>

                        {/* Inline Category Name Editing Field */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <input
                            type="text"
                            value={formLabel}
                            onChange={(e) => setFormLabel(e.target.value)}
                            placeholder="Nome da Categoria..."
                            className="w-full bg-transparent text-base sm:text-lg font-black tracking-tight text-foreground placeholder:text-muted-foreground/40 placeholder:font-bold border-b-2 border-border/50 focus:border-primary pb-1 outline-none transition-colors"
                            autoFocus
                          />
                          
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0", previewMeta.badgeBg)}>
                              <previewMeta.icon className="w-3 h-3" />
                              <span>{previewMeta.label}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground truncate">
                              {editingCategoryTxCount} {editingCategoryTxCount === 1 ? 'lançamento' : 'lançamentos'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. ABAIXO DA CATEGORIA INLINE: LISTAGEM DOS ÍCONES COM BUSCA GENÉRICA */}
                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Ícone
                      </span>

                      {/* Generic Icon Search Input */}
                      <div className="relative w-40 sm:w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={iconSearch}
                          onChange={(e) => setIconSearch(e.target.value)}
                          placeholder="Buscar ícone..."
                          className="pl-8 pr-7 h-7 text-xs rounded-lg bg-card border font-medium focus-visible:ring-primary"
                        />
                        {iconSearch && (
                          <button 
                            onClick={() => setIconSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Icons Grid with Fine Scrollbar */}
                    <div className="p-2.5 rounded-2xl bg-muted/20 dark:bg-white/5 border border-border/40 min-h-[120px] max-h-[160px] overflow-y-auto scrollbar-material">
                      {filteredIcons.length === 0 ? (
                        <div className="py-6 text-center text-xs font-medium text-muted-foreground">
                          Nenhum ícone para "{iconSearch}".
                        </div>
                      ) : (
                        <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
                          {filteredIcons.map(itemIcon => (
                            <button
                              key={itemIcon}
                              type="button"
                              onClick={() => setFormIcon(itemIcon)}
                              className={cn(
                                "w-8.5 h-8.5 flex items-center justify-center text-lg rounded-xl transition-all active:scale-95",
                                formIcon === itemIcon 
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold scale-110" 
                                  : "hover:bg-card hover:shadow-2xs"
                              )}
                            >
                              {itemIcon}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. RODAPÉ COM BOTÕES FECHAR E SALVAR CATEGORIA LADO A LADO */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClosePanel}
                      className="rounded-xl h-10 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/40"
                    >
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleFormSubmit}
                      className={cn(
                        "flex-1 rounded-xl h-10 font-black text-xs uppercase tracking-wider gap-2 shadow-lg transition-all active:scale-[0.98]",
                        editingId 
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
                          : "bg-primary text-primary-foreground shadow-primary/20"
                      )}
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingId ? "Salvar Alterações" : "Salvar Categoria"}</span>
                    </Button>
                  </div>

                </div>
              </ScrollArea>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryCardProps {
  category: Categoria;
  isEditing: boolean;
  txCount: number;
  meta: ReturnType<typeof getNatureMeta>;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryCard({ category, isEditing, txCount, meta, onSelect, onEdit, onDelete }: CategoryCardProps) {
  const IconComp = meta.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative rounded-xl bg-card border transition-all duration-150 flex items-stretch justify-between overflow-hidden min-w-0",
        isEditing 
          ? "border-emerald-500 bg-emerald-500/[0.05] ring-2 ring-emerald-500/20 shadow-xs" 
          : "border-border/50 hover:border-primary/40 hover:shadow-xs",
        onSelect && "cursor-pointer"
      )}
    >
      {/* Left & Center: Priority to Category Label */}
      <div className="flex items-center gap-2.5 p-2.5 min-w-0 flex-1">
        {/* Icon Avatar */}
        <div className="w-9 h-9 rounded-lg bg-muted/40 dark:bg-white/5 border border-border/30 flex items-center justify-center text-lg shrink-0">
          {category.icon || "🏷️"}
        </div>

        {/* Label & Details */}
        <div className="flex-1 min-w-0">
          <h5 className="font-extrabold text-xs text-foreground truncate group-hover:text-primary transition-colors pr-1">
            {category.label}
          </h5>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0", meta.badgeBg)}>
              <IconComp className="w-2.5 h-2.5" />
              <span className="truncate">{meta.label}</span>
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground truncate">
              {txCount} {txCount === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Vertical Action Column: Edit (Green) on top, Delete (Red) on bottom */}
      <div 
        className="flex flex-col justify-center shrink-0 border-l border-border/40 divide-y divide-border/30 bg-muted/10 dark:bg-black/20" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          title="Editar Categoria"
          className={cn(
            "flex-1 px-2.5 flex items-center justify-center transition-colors",
            isEditing 
              ? "bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold" 
              : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
          )}
          onClick={onEdit}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button 
          type="button"
          title="Excluir Categoria"
          className="flex-1 px-2.5 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" 
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}