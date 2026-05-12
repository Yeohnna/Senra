import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppScreen } from '@/types/types';

interface AppContextType {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
  navigateTo: (screen: AppScreen) => void;
  isTransitioning: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('prologue');
  const [previousScreen, setPreviousScreen] = useState<AppScreen | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateTo = useCallback((screen: AppScreen) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setPreviousScreen(currentScreen);
      setCurrentScreen(screen);
      setIsTransitioning(false);
    }, 600);
  }, [currentScreen, isTransitioning]);

  return (
    <AppContext.Provider value={{ currentScreen, previousScreen, navigateTo, isTransitioning }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
