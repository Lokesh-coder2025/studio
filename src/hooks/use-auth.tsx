
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// A mock user object for demonstration purposes
interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // For demonstration, we'll start with a logged-out state.
  // In a real app, you would check for a token in localStorage or a cookie.
  const [user, setUser] = useState<User | null>(null);

  // A mock login function
  const login = (userData: User) => {
    setUser(userData);
  };

  // A mock logout function
  const logout = () => {
    setUser(null);
  };
  
  // For demonstration purposes, we will automatically log in a mock user.
  // In a real app, this would happen after a login form is submitted.
  useState(() => {
    login({ id: '1', name: 'Lokesh D', email: 'lokesh@example.com' });
  });

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
