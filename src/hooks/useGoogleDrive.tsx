"use client";

import { useState, useCallback, useEffect } from "react";
import { getGoogleToken, getGoogleRefreshToken, saveGoogleToken, FILE_NAME, logoutGoogleDrive } from "@/lib/googleDrive";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useGoogleDrive() {
  const { lastModified, importData } = useFinance();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem("google_last_sync"));

  // Sincroniza o estado do lastSync entre diferentes abas ou componentes
  useEffect(() => {
    const handleStorageChange = () => {
      setLastSync(localStorage.getItem("google_last_sync"));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const formattedLastSync = lastSync ? (() => {
    try {
      const date = new Date(lastSync);
      // Retorna algo curto como "27/10 10:30" ou "Hoje 10:30"
      const isToday = new Date().toDateString() === date.toDateString();
      return isToday 
        ? `Hoje, ${format(date, 'HH:mm')}`
        : format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return null;
    }
  })() : null;

  const findAppDataFile = async (token: string) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}'&spaces=appDataFolder&fields=files(id,appProperties)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  };

  const ensureValidToken = async (): Promise<string | null> => {
    const currentToken = getGoogleToken();
    if (currentToken) return currentToken;

    const refreshToken = getGoogleRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken, grant_type: "refresh_token" }),
      });

      if (!response.ok) {
        logoutGoogleDrive();
        return null;
      }

      const data = await response.json();
      saveGoogleToken(data);
      return data.access_token;
    } catch (error) {
      return null;
    }
  };

  const saveToDrive = useCallback(async (jsonData: any) => {
    const token = await ensureValidToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      const fileInfo = await findAppDataFile(token);
      const fileId = fileInfo?.id;
      const cloudLastModified = fileInfo?.appProperties?.lastModified || new Date(0).toISOString();
      
      const localLastModifiedDate = new Date(jsonData.lastModified);
      const cloudLastModifiedDate = new Date(cloudLastModified);

      if (localLastModifiedDate <= cloudLastModifiedDate) {
        toast.info("Nuvem já está atualizada.");
        setIsSyncing(false);
        return;
      }

      const metadata: any = {
        name: FILE_NAME,
        appProperties: {
          lastModified: jsonData.lastModified,
          schemaVersion: jsonData.schemaVersion,
        }
      };

      let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      let method = "POST";

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,appProperties`;
        method = "PATCH";
      } else {
        metadata.parents = ["appDataFolder"];
      }

      const formData = new FormData();
      formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      formData.append("file", new Blob([JSON.stringify(jsonData)], { type: "application/json" }));

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao salvar no Drive");

      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem("google_last_sync", now);
      // Dispara evento manual para atualizar outros componentes na mesma aba
      window.dispatchEvent(new Event('storage'));
      
      toast.success("Nuvem sincronizada!");
    } catch (error) {
      toast.error("Erro na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  }, [lastModified]);

  const loadFromDrive = useCallback(async () => {
    const token = await ensureValidToken();
    if (!token) return null;

    setIsSyncing(true);
    try {
      const fileInfo = await findAppDataFile(token);
      const fileId = fileInfo?.id;
      
      if (!fileId) {
        toast.info("Nenhum backup encontrado.");
        return null;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Erro ao baixar dados");

      const data = await response.json();
      const tempFile = new File([JSON.stringify(data)], FILE_NAME, { type: 'application/json' });
      const importResult = await importData(tempFile);

      if (importResult.success) {
        toast.success("Dados restaurados!");
        const now = new Date().toISOString();
        setLastSync(now);
        localStorage.setItem("google_last_sync", now);
        window.dispatchEvent(new Event('storage'));
      }
      
      return data;
    } catch (error) {
      toast.error("Erro ao carregar da nuvem.");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [importData]);

  return {
    isSyncing,
    lastSync: formattedLastSync, // Agora retorna a data formatada
    saveToDrive,
    loadFromDrive,
    isConnected: !!getGoogleRefreshToken(),
  };
}