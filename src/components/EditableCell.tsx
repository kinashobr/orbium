import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDateLocal } from "@/lib/utils";

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: "text" | "number" | "date" | "select" | "currency";
  options?: string[];
  className?: string;
  disabled?: boolean; // Added disabled prop
}

export function EditableCell({ value, onSave, type = "text", options = [], className = "", disabled = false }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(type === "number" || type === "currency" ? Number(editValue) : editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  const formatDisplay = () => {
    if (type === "currency") {
      return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    if (type === "date" && value) {
      const dateStr = String(value);
      // Se for uma string no formato YYYY-MM-DD, use parseDateLocal
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = parseDateLocal(dateStr);
        return date.toLocaleDateString("pt-BR");
      }
      // Caso contrário, tente converter normalmente (fallback)
      try {
        return new Date(dateStr).toLocaleDateString("pt-BR");
      } catch {
        return dateStr;
      }
    }
    if (type === "number") {
      return Number(value).toLocaleString("pt-BR");
    }
    return value;
  };

  if (type === "select" && options.length > 0) {
    return (
      <Select value={String(value)} onValueChange={(v) => onSave(v)} disabled={disabled}>
        <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-border transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === "currency" ? "number" : type === "date" ? "date" : type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        step={type === "currency" ? "0.01" : undefined}
        className={`h-8 bg-muted border-primary ${className}`}
        disabled={disabled} // Pass disabled prop to Input
      />
    );
  }

  // Use <span> instead of <div> to avoid nesting issues inside <p> elements
  return (
    <span
      onClick={() => !disabled && setIsEditing(true)} // Prevent editing if disabled
      className={`cursor-pointer px-2 py-1 rounded transition-colors min-h-[32px] inline-flex items-center ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50'}`}
      title={disabled ? "Edição desabilitada" : "Clique para editar"}
    >
      {formatDisplay()}
    </span>
  );
}