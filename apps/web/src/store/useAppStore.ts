import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  activeTenantId: string | null;
  activeTenantName: string | null;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setActiveTenant: (id: string, name: string) => void;
  clearActiveTenant: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  activeTenantId: 'tenant-demo-org',
  activeTenantName: 'Acme Global Corp',
  setTheme: (theme) => set({ theme }),
  setActiveTenant: (id, name) => set({ activeTenantId: id, activeTenantName: name }),
  clearActiveTenant: () => set({ activeTenantId: null, activeTenantName: null }),
}));
