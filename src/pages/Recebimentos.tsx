import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  DollarSign
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RecebiveisClientesTab } from "@/components/recebimentos/RecebiveisClientesTab";

export default function Recebimentos() {
  return (
    <MainLayout>
      <div className="space-y-6 pb-12 w-full animate-fade-in">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl md:text-2xl leading-none">Painel de Recebimentos</h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Gestão de Rendas Profissionais e Recebíveis</p>
            </div>
          </div>
        </header>

        <RecebiveisClientesTab />
      </div>
    </MainLayout>
  );
}
