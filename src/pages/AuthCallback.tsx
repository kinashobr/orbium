"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GOOGLE_CLIENT_ID, saveGoogleToken } from "@/lib/googleDrive";
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

      const params = new URLSearchParams();
      params.append("client_id", GOOGLE_CLIENT_ID);
      params.append("code", code);
      params.append("code_verifier", verifier);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", "https://orbiumfinance.vercel.app/oauth/callback");

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`[AuthCallback] Erro Google (${response.status}):`, responseText);
          toast.error("Erro na validação. Verifique as configurações de Redirect URI.");
          setStatus("error");
          return;
        }

        const data = JSON.parse(responseText);
        saveGoogleToken(data);
        localStorage.removeItem("google_code_verifier");
        
        toast.success("Nuvem conectada!");
        navigate("/");
      } catch (error) {
        console.error("[AuthCallback] Erro na requisição:", error);
        setStatus("error");
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
        <h2 className="text-xl font-bold">Conexão Interrompida</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Se o erro persistir, pode haver uma divergência na <strong>Redirect URI</strong> configurada no Google Console para este novo Client ID.
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
          Sincronizando com o Google...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Finalizando autenticação PKCE
        </p>
      </div>
    </div>
  );
}