import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Repeat, Check, ArrowLeft, Search, X } from "lucide-react";
import { Categoria, CategoryNature, generateCategoryId, getCategoryTypeFromNature } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Categoria;
  onSubmit: (category: Categoria) => void;
  onDelete?: (categoryId: string) => void;
  hasTransactions?: boolean;
  defaultNature?: CategoryNature;
  defaultLabel?: string;
}

interface EmojiSearchItem {
  emoji: string;
  keywords: string[];
}

// Complete rich Emoji database with Portuguese search keywords including tooth 🦷, glasses 👓, etc.
const EMOJI_DATABASE: Record<CategoryNature, EmojiSearchItem[]> = {
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

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSubmit,
  onDelete,
  hasTransactions = false,
  defaultNature = "despesa_variavel",
  defaultLabel = ""
}: CategoryFormModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [nature, setNature] = useState<CategoryNature>(defaultNature);
  const [emojiSearch, setEmojiSearch] = useState("");

  const isEditing = !!category;

  // Body scroll lock for mobile
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

  useEffect(() => {
    if (open && category) {
      setLabel(category.label);
      setIcon(category.icon || "📦");
      setNature(category.nature || defaultNature);
      setEmojiSearch("");
    } else if (open) {
      setLabel(defaultLabel);
      setIcon("📦");
      setNature(defaultNature);
      setEmojiSearch("");
    }
  }, [open, category, defaultNature, defaultLabel]);

  // Filter emojis based on inline search term or nature
  const filteredEmojis = useMemo(() => {
    const term = emojiSearch.trim().toLowerCase();
    if (!term) {
      return (EMOJI_DATABASE[nature] || EMOJI_DATABASE.despesa_variavel).map(item => item.emoji);
    }

    // Search across ALL nature categories when searching
    const results: string[] = [];
    Object.values(EMOJI_DATABASE).forEach(list => {
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
  }, [nature, emojiSearch]);

  const handleSubmit = () => {
    if (!label.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const newCategory: Categoria = {
      id: category?.id || generateCategoryId(),
      label: label.trim(),
      icon,
      nature,
      type: getCategoryTypeFromNature(nature)
    };

    onSubmit(newCategory);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col border border-border/40 overflow-hidden",
          // Same height as CategoryListModal: h-[85vh] for perfect vertical consistency!
          !isMobile && "max-w-3xl h-[85vh] rounded-[2rem]"
        )}
      >
        {/* Header with compact Nature Buttons */}
        <DialogHeader 
          className="px-5 sm:px-6 py-4 bg-muted/30 dark:bg-black/30 shrink-0 border-b border-border/40 relative"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' } : undefined}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Title & Active Icon */}
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onOpenChange(false)}
                  className="rounded-full h-8 w-8 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                <span>{icon}</span>
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  {isEditing ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-semibold text-muted-foreground">
                  Identificação e classificação do fluxo
                </DialogDescription>
              </div>
            </div>

            {/* Nature Compact Pill Selector in Header */}
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-black/20 p-1 rounded-xl border border-border/40">
              {[
                { id: 'receita', label: 'Receita', icon: TrendingUp, color: 'text-emerald-500' },
                { id: 'despesa_fixa', label: 'Despesa Fixa', icon: Repeat, color: 'text-purple-500' },
                { id: 'despesa_variavel', label: 'Despesa Variável', icon: TrendingDown, color: 'text-rose-500' }
              ].map(opt => {
                const isSelected = nature === opt.id;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNature(opt.id as CategoryNature)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
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
        </DialogHeader>

        {/* Modal Main Content Body with Fine Scrollbar */}
        <ScrollArea className="flex-1 px-5 sm:px-6 py-5 scrollbar-material">
          <div className="space-y-6 pb-20 sm:pb-4">
            {/* Name Input */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Nome da Categoria
              </Label>
              <Input
                placeholder="Ex: Alimentação, Salário, Internet, Dentista, Óculos..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-10 border-2 dark:border-white/10 rounded-xl bg-card font-bold text-sm px-3.5 focus-visible:ring-primary"
                autoFocus
              />
            </div>

            {/* Emoji Selection Section with Inline Search */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Selecione o Ícone (Emoji)
                </Label>

                {/* Inline Search Input with Icon */}
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    placeholder="Buscar (ex: dente, oculos)..."
                    className="pl-8 pr-7 h-8 text-xs rounded-lg bg-card border font-medium"
                  />
                  {emojiSearch && (
                    <button 
                      onClick={() => setEmojiSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Emoji Grid Container with Fine Scrollbar */}
              <div className="p-3.5 rounded-2xl bg-muted/20 dark:bg-white/5 border border-border/40 min-h-[160px] max-h-[260px] overflow-y-auto scrollbar-material">
                {filteredEmojis.length === 0 ? (
                  <div className="py-10 text-center text-xs font-semibold text-muted-foreground">
                    Nenhum emoji encontrado para "{emojiSearch}". Tente buscar por ex: "dente", "oculos", "carro", "casa".
                  </div>
                ) : (
                  <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {filteredEmojis.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setIcon(e)}
                        className={cn(
                          "w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-all active:scale-95",
                          icon === e 
                            ? "bg-primary text-primary-foreground shadow-xs font-bold scale-110" 
                            : "hover:bg-card hover:shadow-2xs"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter 
          className={cn(
            "p-3.5 sm:p-4 bg-muted/20 border-t border-border/40 shrink-0 flex flex-col-reverse sm:flex-row gap-2.5 justify-end",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card z-10"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' } : undefined}
        >
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl h-9 px-5 font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground w-full sm:w-auto"
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="rounded-xl h-9 px-5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider gap-2 shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all w-full sm:w-auto"
          >
            <Check className="w-4 h-4" />
            {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CATEGORIA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}