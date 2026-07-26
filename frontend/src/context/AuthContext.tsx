import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
interface UserProfile {
  id: number;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
}
interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  mockLogin: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Set default axios authentication headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  const fetchProfile = async (accessToken: string) => {
    try {
      const response = await axios.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed fetching user profile:", error);
      logout();
    }
  };
  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/v1/auth/google', { credential });
      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      await fetchProfile(access_token);
    } catch (error) {
      console.error("Google authentication failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const mockLogin = async () => {
    // Send a mock token, backend mock detector will handle login validation
    await loginWithGoogle("mock_credential_id_token");
  };
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };
  // Run initial token check on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        await fetchProfile(storedToken);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);
  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginWithGoogle, logout, mockLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be called inside an AuthProvider');
  }
  return context;
};
