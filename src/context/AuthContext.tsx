import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  loginReservedArea,
  logoutReservedArea,
  unregisterAppDevice,
  type AppAuthUser,
  type AppLoginResponse,
} from '../lib/frontpage-api';
import { clearStoredPushToken, getStoredPushToken, isAndroidPushSupported } from '../lib/push-notifications';

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AppAuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AppLoginResponse>;
  logout: () => void;
};

const storageKey = 'zentrum_reserved_auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      setIsReady(true);
      return;
    }

    try {
      const storedAuth = JSON.parse(storedValue) as { user?: AppAuthUser; token?: string } | null;

      if (storedAuth?.user && storedAuth?.token) {
        setUser(storedAuth.user);
        setToken(storedAuth.token);
        setIsAuthenticated(true);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    setIsReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginReservedArea(email.trim(), password);

    window.localStorage.setItem(storageKey, JSON.stringify({
      token: response.token,
      user: response.user,
    }));
    setToken(response.token);
    setUser(response.user);
    setIsAuthenticated(true);

    return response;
  };

  const logout = () => {
    if (token) {
      const pushToken = getStoredPushToken();

      if (pushToken && isAndroidPushSupported()) {
        void unregisterAppDevice(token, pushToken).catch(() => undefined);
        clearStoredPushToken();
      }

      void logoutReservedArea(token);
    }

    window.localStorage.removeItem(storageKey);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return <AuthContext.Provider value={{ isReady, isAuthenticated, user, token, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthProvider;
