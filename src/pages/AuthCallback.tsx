"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveGoogleToken } from "@/lib/googleDrive";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasExchanged = useRef(false);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (hasExchanged.current) return;

    const exchangeCodeForToken = async () => {
      const code = searchParams.get("code");
      const verifier = localStorage.getItem("google_code_verifier");

      if (!verifier) {
        console.error("[AuthCallback] ERRO: code_verifier não encontrado.");
        toast.error("Segurança: Verificador ausente. Reinicie o login.");
        setStatus("error");
        return;
      }

      if (!code) {
        console.error("[AuthCallback] ERRO: Código de autorização ausente.");
        setStatus("error");
        return;
      }

      hasExchanged.current = true;

      try {
        // Garantindo que a URI seja idêntica à do initiateGoogleAuth
        const redirectUri = window.location.origin + '/oauth/callback';

        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
          }),
        });

        // Corrigido para extrair do objeto response local
        const data = await response.json();

        if (!response.ok) {
          console.error("[AuthCallback] Erro no Proxy de Autenticação:", data);
          toast.error("Erro na validação do token.");
          setStatus("error");
          return;
        }

        saveGoogleToken(data);
        localStorage.removeItem("google_code_verifier");
        
        toast.success("Nuvem conectada!");
        navigate("/");
      } catch (error) {
        console.error("[AuthCallback] Erro na requisição ao proxy:", error);
        setStatus("error");
      }
    };

    exchangeCodeForToken();
  }, [searchParams, navigate]);

  if (status === "error") {
    const currentOrigin = window.location.origin;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold">Conexão Interrompida</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Certifique-se de que a URL abaixo está cadastrada no seu Google Cloud Console:
        </p>
        <code className="bg-muted px-4 py-2 rounded-lg text-xs font-mono break-all max-w-md">
          {currentOrigin}/oauth/callback
        </code>
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
          Sincronizando com o Google...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Processando token via proxy seguro
        </p>
      </div>
    </div>
  );
}