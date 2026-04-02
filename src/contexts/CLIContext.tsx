import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CLIType } from '../data/types';

interface CLIContextType {
  currentCLI: CLIType;
  setCurrentCLI: (cli: CLIType) => void;
}

const CLIContext = createContext<CLIContextType | undefined>(undefined);

export function CLIProvider({ children }: { children: ReactNode }) {
  const [currentCLI, setCurrentCLIState] = useState<CLIType>(() => {
    if (typeof window === 'undefined') return 'claude';
    const saved = localStorage.getItem('cli-preference');
    if (saved === 'claude' || saved === 'codex') {
      return saved;
    }
    return 'claude';
  });

  const setCurrentCLI = useCallback((cli: CLIType) => {
    setCurrentCLIState(cli);
    localStorage.setItem('cli-preference', cli);
  }, []);

  return (
    <CLIContext.Provider value={{ currentCLI, setCurrentCLI }}>
      {children}
    </CLIContext.Provider>
  );
}

export function useCLI() {
  const context = useContext(CLIContext);
  if (!context) {
    throw new Error('useCLI must be used within CLIProvider');
  }
  return context;
}
