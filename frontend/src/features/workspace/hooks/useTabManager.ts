import { useState, useCallback } from "react";

export interface UseTabManagerResult {
  openTabIds: string[];
  activeTabId: string | null;
  hasOpenTabs: boolean;
  openTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  switchTab: (fileId: string) => void;
}

export function useTabManager(): UseTabManagerResult {
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((fileId: string) => {
    setOpenTabIds((prev) =>
      prev.includes(fileId) ? prev : [...prev, fileId],
    );
    setActiveTabId(fileId);
  }, []);

  const closeTab = useCallback((fileId: string) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== fileId);
      setActiveTabId((current) => {
        if (current !== fileId) return current;
        const idx = prev.indexOf(fileId);
        return next[idx] ?? next[idx - 1] ?? null;
      });
      return next;
    });
  }, []);

  const switchTab = useCallback((fileId: string) => {
    setActiveTabId(fileId);
  }, []);

  return {
    openTabIds,
    activeTabId,
    hasOpenTabs: openTabIds.length > 0,
    openTab,
    closeTab,
    switchTab,
  };
}
