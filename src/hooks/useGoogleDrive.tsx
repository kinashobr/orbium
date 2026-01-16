"use client";

import { useState, useCallback } from "react";
import { getGoogleToken, FILE_NAME, logoutGoogleDrive } from "@/lib/googleDrive";
import { toast } from "sonner";

export function useGoogleDrive() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem("google_last_sync"));

  const findAppDataFile = async (token: string) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}'&spaces=appDataFolder`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  };

  const saveToDrive = useCallback(async (jsonData: any) => {
    const token = getGoogleToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      const fileId = await findAppDataFile(token);
      const metadata = {
        name: FILE_NAME,
        parents: ["appDataFolder"],
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append(
        "file",
        new Blob([JSON.stringify(jsonData)], { type: "application/json" })
      );

      let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      let method = "POST";

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        logoutGoogleDrive();
        toast.error("Sessão expirada. Conecte o Google Drive novamente.");
        return;
      }

      if (!response.ok) throw new Error("Erro ao salvar no Drive");

      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem("google_last_sync", now);
      toast.success("Dados sincronizados na nuvem!");
    } catch (error) {
      console.error(error);
      toast.error("Erro na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const loadFromDrive = useCallback(async () => {
    const token = getGoogleToken();
    if (!token) return null;

    setIsSyncing(true);
    try {
      const fileId = await findAppDataFile(token);
      if (!fileId) return null;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Erro ao baixar dados");

      return await response.json();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados da nuvem.");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    lastSync,
    saveToDrive,
    loadFromDrive,
    isConnected: !!getGoogleToken(),
  };
}