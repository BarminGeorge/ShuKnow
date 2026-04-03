import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { openTabsAtom, activeTabFileAtom, activeTabIdAtom, openTabAtom, closeTabAtom, switchTabAtom } from '../store';

export function useTabs() {
  const openTabs = useAtomValue(openTabsAtom);
  const activeTab = useAtomValue(activeTabFileAtom);
  const [activeTabId, setActiveTabId] = useAtom(activeTabIdAtom);
  const openTab = useSetAtom(openTabAtom);
  const closeTab = useSetAtom(closeTabAtom);
  const switchTab = useSetAtom(switchTabAtom);

  return {
    openTabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openTab,
    closeTab,
    switchTab,
  };
}
