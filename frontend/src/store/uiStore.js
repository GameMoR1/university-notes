import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  graphView: '3d', // '3d' | '2d'
  setGraphView: (v) => set({ graphView: v }),

  activeNote: null,
  setActiveNote: (n) => set({ activeNote: n }),
}))
