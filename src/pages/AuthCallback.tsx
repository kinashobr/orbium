"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GOOGLE_CLIENT_ID, saveGoogleToken } from "@/lib/googleDrive";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasExchanged = useRef(false);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    // Evita execução dupla em modo de desenvolvimento
    if (hasExchanged.current) return;

    const exchangeCodeForToken = async () => {
      const code = searchParams.get("code");
      
      // Garantindo o uso de localStorage (conforme solicitado) para evitar perda no redirecionamento
      const verifier = localStorage.getItem("google_code_verifier");

      console.log("[AuthCallback] Iniciando troca de código...", { 
        hasCode: !!code, 
        hasVerifier: !!verifier,
        origin: window.location.origin 
      });

      if (!code || !verifier) {
        console.error("[AuthCallback] ERRO CRÍTICO: Código (URL) ou Verifier (localStorage) ausentes.");
        toast.error("Falha na autenticação: Parâmetros de segurança não encontrados.");
        setStatus("error");
        setTimeout(() => navigate("/"), 4000);
        return;
      }

      hasExchanged.current = true;

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            code: code,
            code_verifier: verifier,
            grant_type: "authorization_code",
            redirect_uri: `${window.location.origin}/oauth/callback`,
          }),
        });

        if (!response.ok) {
          // Lendo o corpo da resposta de erro detalhadamente conforme solicitado
          const errorBody = await response.text();
          console.error(`[AuthCallback] Falha na API do Google (Status ${response.status}):`, errorBody);
          
          let parsedError;
          try {
            parsedError = JSON.parse(errorBody);
          } catch (e) {
            parsedError = { error: "Unknown", error_description: errorBody };
          }

          toast.error(`Erro do Google: ${parsedError.error_description || parsedError.error}`);
          throw new Error(`Google API Error: ${parsedError.error}`);
        }

        const data = await response.json();
        saveGoogleToken(data);
        
        // Limpa o segredo apenas após o sucesso
        localStorage.removeItem("google_code_verifier");
        
        console.log("[AuthCallback] Token obtido com sucesso!");
        toast.success("Google Drive conectado com sucesso!");
        navigate("/");
      } catch (error) {
        console.error("[AuthCallback] Erro durante a troca de token:", error);
        setStatus("error");
        setTimeout(() => navigate("/"), 4000);
      }
    };

    exchangeCodeForToken();
  }, [searchParams, navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold">Falha na Autenticação</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Houve um problema ao validar sua conexão com o Google Drive. Verifique os detalhes no console do navegador (F12).
        </p>
        <Button variant="outline" onClick={() => navigate("/")} className="mt-4 rounded-full">
          Voltar para Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="space-y-1 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-foreground animate-pulse">
          Validando Acesso...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Orbium Cloud Sync
        </p>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";