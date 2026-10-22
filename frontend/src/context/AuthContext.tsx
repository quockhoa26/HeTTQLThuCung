import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        const u: User = {
          id: res.data.id,
          username: res.data.username,
          fullName: res.data.full_name,
          email: res.data.email,
          role: res.data.role,
          customerId: res.data.customer_id,
          phone: res.data.phone,
          address: res.data.address,
        };
        setUser(u);
        localStorage.setItem('pet_user', JSON.stringify(u));
      }
    } catch {
      localStorage.removeItem('pet_token');
      localStorage.removeItem('pet_user');
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('pet_token');
    const storedUser = localStorage.getItem('pet_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify with /me in background
        refreshUser().finally(() => setLoading(false));
      } catch {
        localStorage.removeItem('pet_token');
        localStorage.removeItem('pet_user');
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('pet_token', token);
    localStorage.setItem('pet_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('pet_token');
      localStorage.removeItem('pet_user');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
