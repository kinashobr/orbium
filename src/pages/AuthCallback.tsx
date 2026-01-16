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

      if (!code || !verifier) {
        console.error("[AuthCallback] Parâmetros ausentes:", { code: !!code, verifier: !!verifier });
        toast.error("Sessão de segurança expirada. Tente novamente.");
        setStatus("error");
        return;
      }

      hasExchanged.current = true;

      // Construindo o corpo da requisição exatamente como application/x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append("client_id", GOOGLE_CLIENT_ID);
      params.append("code", code);
      params.append("code_verifier", verifier);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", `${window.location.origin}/oauth/callback`);

      try {
        console.log("[AuthCallback] Enviando requisição de token (Public Client/PKCE)...");

        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // Garantindo que nenhum header de Authorization (Basic) seja enviado acidentalmente
          },
          body: params.toString(),
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`[AuthCallback] Erro ${response.status} da API do Google:`, responseText);
          
          let errorMessage = "Erro na troca de token";
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.error_description || errorJson.error || errorMessage;
          } catch (e) {
            errorMessage = responseText || errorMessage;
          }

          toast.error(`Erro: ${errorMessage}`);
          setStatus("error");
          return;
        }

        const data = JSON.parse(responseText);
        saveGoogleToken(data);
        
        localStorage.removeItem("google_code_verifier");
        
        toast.success("Conectado ao Google Drive!");
        navigate("/");
      } catch (error) {
        console.error("[AuthCallback] Erro excepcional:", error);
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
        <h2 className="text-xl font-bold">Erro na Conexão</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          O Google exigiu um segredo que SPAs não possuem. Certifique-se de que o ID do Cliente no Google Cloud Console foi criado como <strong>"iOS"</strong> ou <strong>"Android"</strong> (que são públicos) ou que as restrições de origem estão corretas.
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
          Finalizando Conexão...
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Troca de chaves PKCE
        </p>
      </div>
    </div>
  );
}