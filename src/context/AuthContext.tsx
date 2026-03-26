import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const storageKey = 'zentrum_reserved_auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(storageKey) === '1');
  }, []);

  const login = (email: string, password: string) => {
    const allowed = email.trim() !== '' && password.trim() !== '';

    if (allowed) {
      window.localStorage.setItem(storageKey, '1');
      setIsAuthenticated(true);
    }

    return allowed;
  };

  const logout = () => {
    window.localStorage.removeItem(storageKey);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthProvider;
