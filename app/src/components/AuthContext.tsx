/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  stravaConfigured: boolean;
  login: () => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  configureStrava: (clientId: string, clientSecret: string, redirectUri?: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  stravaConfigured: false,
  login: () => {},
  logout: () => {},
  deleteAccount: async () => {},
  configureStrava: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stravaConfigured, setStravaConfigured] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const [meRes, statusRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/auth/status'),
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      } else {
        setUser(null);
      }

      if (statusRes.ok) {
        const status = await statusRes.json();
        setStravaConfigured(status.configured);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/login');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Strava login unavailable. Please try again later.');
    }
  }, []);

  const configureStrava = useCallback(async (clientId: string, clientSecret: string, redirectUri?: string) => {
    const res = await fetch('/api/auth/strava-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, redirectUri }),
    });
    const data = await res.json();
    if (data.success) {
      setStravaConfigured(true);
    } else {
      throw new Error(data.error || 'Error saving configuration.');
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await fetch('/api/auth/delete-account', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, stravaConfigured, login, logout, deleteAccount, configureStrava }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
