import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { fetchFrontpage } from '../lib/frontpage-api';
import type { FrontpagePayload } from '../types/frontpage';

type FrontpageDataContextValue = {
  data: FrontpagePayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const FrontpageDataContext = createContext<FrontpageDataContextValue | undefined>(undefined);

const FrontpageDataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [data, setData] = useState<FrontpagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchFrontpage();
      setData(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <FrontpageDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </FrontpageDataContext.Provider>
  );
};

export function useFrontpageData(): FrontpageDataContextValue {
  const context = useContext(FrontpageDataContext);

  if (!context) {
    throw new Error('useFrontpageData must be used within FrontpageDataProvider');
  }

  return context;
}

export default FrontpageDataProvider;
