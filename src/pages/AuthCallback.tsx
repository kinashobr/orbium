"use client";

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GOOGLE_CLIENT_ID, saveGoogleToken } from "@/lib/googleDrive";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const code = searchParams.get("code");
      const verifier = localStorage.getItem("google_code_verifier");

      if (!code || !verifier) {
        toast.error("Falha na autenticação: Código não encontrado.");
        navigate("/");
        return;
      }

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

        if (!response.ok) throw new Error("Erro na troca do token");

        const data = await response.json();
        saveGoogleToken(data);
        localStorage.removeItem("google_code_verifier");
        
        toast.success("Google Drive conectado com sucesso!");
        navigate("/");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao conectar com o Google Drive.");
        navigate("/");
      }
    };

    exchangeCodeForToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
        Finalizando conexão...
      </p>
    </div>
  );
}