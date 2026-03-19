import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (user) => set({ user }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      isLoggedIn: () => !!get().accessToken,

      isAdmin: () => get().user?.role?.can_manage_users === true,

      isTeacher: () =>
        get().user?.role?.can_create_notes === true ||
        get().user?.role?.can_manage_users === true,

      canCreateNotes: () => get().user?.role?.can_create_notes === true,
      canManageUsers: () => get().user?.role?.can_manage_users === true,
      canComment: () => get().user?.role?.can_comment === true,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
