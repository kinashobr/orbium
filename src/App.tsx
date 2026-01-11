import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import ReceitasDespesas from "./pages/ReceitasDespesas";
import Emprestimos from "./pages/Emprestimos";
import Veiculos from "./pages/Veiculos";
import Relatorios from "./pages/Relatorios";
import Investimentos from "./pages/Investimentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <FinanceProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/receitas-despesas" element={<ReceitasDespesas />} />
              <Route path="/emprestimos" element={<Emprestimos />} />
              <Route path="/veiculos" element={<Veiculos />} />
              <Route path="/investimentos" element={<Investimentos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FinanceProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
