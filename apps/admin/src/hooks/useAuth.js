import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('awy_admin_token');
    const userData = localStorage.getItem('awy_admin_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('awy_admin_token');
        localStorage.removeItem('awy_admin_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      // Mock authentication - replace with real API call
      if (credentials.email === 'admin@awy.com' && credentials.password === 'admin123') {
        const userData = {
          id: '1',
          name: 'Admin User',
          email: 'admin@awy.com',
          role: 'admin',
          avatar: null
        };
        
        const token = 'mock_jwt_token_' + Date.now();
        
        localStorage.setItem('awy_admin_token', token);
        localStorage.setItem('awy_admin_user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('awy_admin_token');
    localStorage.removeItem('awy_admin_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

