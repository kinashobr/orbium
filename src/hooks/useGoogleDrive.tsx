"use client";

import { useState, useCallback } from "react";
import { getGoogleToken, FILE_NAME, logoutGoogleDrive } from "@/lib/googleDrive";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";

export function useGoogleDrive() {
  const { lastModified, importData } = useFinance();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem("google_last_sync"));

  const findAppDataFile = async (token: string) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}'&spaces=appDataFolder&fields=files(id,appProperties)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  };

  const saveToDrive = useCallback(async (jsonData: any) => {
    const token = getGoogleToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      const fileInfo = await findAppDataFile(token);
      const fileId = fileInfo?.id;
      const cloudLastModified = fileInfo?.appProperties?.lastModified || new Date(0).toISOString();
      
      const localLastModifiedDate = new Date(jsonData.lastModified);
      const cloudLastModifiedDate = new Date(cloudLastModified);

      // 1. Checagem de Conflito: Não salvar se a nuvem for mais recente
      if (localLastModifiedDate <= cloudLastModifiedDate) {
        toast.info("Sincronização cancelada: A versão na nuvem é mais recente ou igual à local.");
        setIsSyncing(false);
        return;
      }

      // Prepara os metadados base
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
        // Se o arquivo já existe, usamos PATCH e NÃO incluímos o campo 'parents'
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,appProperties`;
        method = "PATCH";
      } else {
        // Se é um arquivo novo (POST), incluímos o campo 'parents'
        metadata.parents = ["appDataFolder"];
      }

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append(
        "file",
        new Blob([JSON.stringify(jsonData)], { type: "application/json" })
      );

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

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[GoogleDrive] Erro na requisição:", errorData);
        throw new Error("Erro ao salvar no Drive");
      }

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
  }, [lastModified]);

  const loadFromDrive = useCallback(async () => {
    const token = getGoogleToken();
    if (!token) return null;

    setIsSyncing(true);
    try {
      const fileInfo = await findAppDataFile(token);
      const fileId = fileInfo?.id;
      
      if (!fileId) {
        toast.info("Nenhum backup encontrado na nuvem.");
        return null;
      }

      // Removida a checagem que bloqueava a restauração baseada no timestamp local
      // O usuário clicou no botão de download, então ele quer restaurar independente da data local

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Erro ao baixar dados");

      const data = await response.json();
      
      // Simula a importação de um arquivo para usar a lógica de importData do FinanceContext
      const tempFile = new File([JSON.stringify(data)], FILE_NAME, { type: 'application/json' });
      const importResult = await importData(tempFile);

      if (importResult.success) {
        toast.success("Dados restaurados da nuvem!");
      } else {
        toast.error(`Restauração falhou: ${importResult.message}`);
      }
      
      return data;
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados da nuvem.");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [lastModified, importData]);

  return {
    isSyncing,
    lastSync,
    saveToDrive,
    loadFromDrive,
    isConnected: !!getGoogleToken(),
  };
}