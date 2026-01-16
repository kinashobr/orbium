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
    // Evita execução dupla em modo de desenvolvimento (React StrictMode)
    if (hasExchanged.current) return;

    const exchangeCodeForToken = async () => {
      const code = searchParams.get("code");
      const verifier = localStorage.getItem("google_code_verifier");

      console.log("[AuthCallback] Iniciando troca de código...", { hasCode: !!code, hasVerifier: !!verifier });

      if (!code || !verifier) {
        console.error("[AuthCallback] Código ou Verifier ausentes.");
        toast.error("Falha na autenticação: Parâmetros de segurança não encontrados.");
        setStatus("error");
        setTimeout(() => navigate("/"), 3000);
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
          const errorData = await response.json();
          console.error("[AuthCallback] Erro na API do Google:", errorData);
          throw new Error(errorData.error_description || "Erro na troca do token");
        }

        const data = await response.json();
        saveGoogleToken(data);
        localStorage.removeItem("google_code_verifier");
        
        console.log("[AuthCallback] Token obtido com sucesso!");
        toast.success("Google Drive conectado com sucesso!");
        navigate("/");
      } catch (error) {
        console.error("[AuthCallback] Falha catastrófica:", error);
        toast.error("Erro ao conectar com o Google Drive.");
        setStatus("error");
        setTimeout(() => navigate("/"), 3000);
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
        <h2 className="text-xl font-bold">Algo deu errado</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Não conseguimos completar a conexão com o Google Drive. Você será redirecionado para a página inicial.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="space-y-1 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-foreground animate-pulse">
          Finalizando conexão...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Autenticando com Google Drive
        </p>
      </div>
    </div>
  );
}