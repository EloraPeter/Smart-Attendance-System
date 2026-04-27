import React, { createContext, useContext, useEffect, useState } from 'react';
import { pb, User } from '../lib/pocketbase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLecturer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth
    if (pb.authStore.isValid && pb.authStore.model) {
      const model = pb.authStore.model as unknown as User;
      setUser(model);
    }
    setIsLoading(false);

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.model) {
        const model = pb.authStore.model as unknown as User;
        setUser(model);
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      const userData = authData.record as unknown as User;
      setUser(userData);
      toast.success(`Welcome back, ${userData.name || email}!`);
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Invalid email or password');
      throw error;
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const isAdmin = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, login, logout, 
      isAuthenticated: !!user, isAdmin, isLecturer 
    }}>
      {children}
    </AuthContext.Provider>
  );
};