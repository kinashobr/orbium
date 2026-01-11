import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { ContaCorrente, Categoria, OperationType } from "@/types/finance";
import { cn } from "@/lib/utils";

interface TransactionFiltersProps {
  accounts: ContaCorrente[];
  categories: Categoria[];
  // Valores dos filtros
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedAccountId: string;
  onAccountChange: (value: string) => void;
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
  selectedTypes: OperationType[];
  onTypesChange: (types: OperationType[]) => void;
  // Removido: dateFrom, dateTo, onDateFromChange, onDateToChange
  onClearFilters: () => void;
}

const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'aplicacao', label: 'Aplicação' },
  { value: 'resgate', label: 'Resgate' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'rendimento', label: 'Rendimento' },
];

export function TransactionFilters({
  accounts,
  categories,
  searchTerm,
  onSearchChange,
  selectedAccountId,
  onAccountChange,
  selectedCategoryId,
  onCategoryChange,
  selectedTypes,
  onTypesChange,
  onClearFilters
}: TransactionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = searchTerm || 
    selectedAccountId !== 'all' || 
    selectedCategoryId !== 'all' || 
    selectedTypes.length !== OPERATION_TYPE_OPTIONS.length;
    // Removido: || dateFrom || dateTo;

  const activeFiltersCount = [
    searchTerm,
    selectedAccountId !== 'all' ? selectedAccountId : null,
    selectedCategoryId !== 'all' ? selectedCategoryId : null,
    selectedTypes.length !== OPERATION_TYPE_OPTIONS.length ? 'types' : null,
    // Removido: dateFrom, dateTo
  ].filter(Boolean).length;

  const handleTypeToggle = (type: OperationType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Linha principal de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Conta */}
        <Select value={selectedAccountId} onValueChange={onAccountChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todas contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas contas</SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtros avançados */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Tipos de Operação</h4>
              <div className="grid grid-cols-2 gap-2">
                {OPERATION_TYPE_OPTIONS.map(option => (
                  <label 
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(option.value)}
                      onCheckedChange={() => handleTypeToggle(option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onTypesChange(OPERATION_TYPE_OPTIONS.map(o => o.value))}
                >
                  Selecionar todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onTypesChange([])}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 text-muted-foreground">
            <X className="w-4 h-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Tags de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{searchTerm}"
              <button onClick={() => onSearchChange('')} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedAccountId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Conta: {accounts.find(a => a.id === selectedAccountId)?.name}
              <button onClick={() => onAccountChange('all')} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedCategoryId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoria: {categories.find(c => c.id === selectedCategoryId)?.label}
              <button onClick={() => onCategoryChange('all')} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}