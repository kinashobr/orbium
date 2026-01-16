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

      // Verificação estrita do code_verifier (sem ele o Google exige secret)
      if (!verifier) {
        console.error("[AuthCallback] ERRO: code_verifier não encontrado no localStorage.");
        toast.error("Segurança: code_verifier ausente. Reinicie o login.");
        setStatus("error");
        return;
      }

      if (!code) {
        console.error("[AuthCallback] ERRO: Código de autorização ausente na URL.");
        setStatus("error");
        return;
      }

      hasExchanged.current = true;

      // 1. Uso de URLSearchParams para o corpo
      const params = new URLSearchParams();
      params.append("client_id", "1009498436542-3k2h3d5d7mmcrr5kftfmueu5sdt5oqnr.apps.googleusercontent.com");
      params.append("code", code);
      params.append("code_verifier", verifier);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", "https://orbiumfinance.vercel.app/oauth/callback");

      // 4. Log para conferência dos campos enviados
      console.log("Corpo enviado:", Object.fromEntries(params));

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            // 3. Header estrito
            "Content-Type": "application/x-www-form-urlencoded",
            // 2. Omitindo 'Authorization' propositalmente para cliente público
          },
          body: params.toString(),
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`[AuthCallback] Resposta de erro do Google (${response.status}):`, responseText);
          toast.error("Erro na validação com o Google. Verifique o console.");
          setStatus("error");
          return;
        }

        const data = JSON.parse(responseText);
        saveGoogleToken(data);
        
        // Limpeza
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
          Não foi possível trocar as chaves de segurança com o Google. Certifique-se de que o Client ID está configurado como <strong>"App da Web"</strong> ou <strong>"Android/iOS"</strong> e que as origens e URIs de redirecionamento no Google Console batem com este domínio.
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
          Troca de Chaves PKCE...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Finalizando autenticação segura
        </p>
      </div>
    </div>
  );
}