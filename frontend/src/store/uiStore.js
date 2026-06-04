import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  graphView: '3d', // '3d' | '2d'
  setGraphView: (v) => set({ graphView: v }),

  activeNote: null,
  setActiveNote: (n) => set({ activeNote: n }),

  theme: localStorage.getItem('usuz-theme') || 'dark',
  setTheme: (t) => {
    localStorage.setItem('usuz-theme', t)
    document.documentElement.classList.toggle('light', t === 'light')
    set({ theme: t })
  },
  toggleTheme: () => {
    set((s) => {
      const t = s.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('usuz-theme', t)
      document.documentElement.classList.toggle('light', t === 'light')
      return { theme: t }
    })
  },
}))
