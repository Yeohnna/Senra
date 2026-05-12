import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import type { AppScreen } from '@/types/types';

import ProloguePage from '@/pages/ProloguePage';
import LoginPage from '@/pages/LoginPage';
import MainHubPage from '@/pages/MainHubPage';
import HeartSoilPage from '@/pages/HeartSoilPage';
import PrismPage from '@/pages/PrismPage';
import HearthFirePage from '@/pages/HearthFirePage';
import ReconstructPage from '@/pages/ReconstructPage';
import GeneFoldingPage from '@/pages/GeneFoldingPage';

// 内部 SPA 路由核心——管理全屏切换与淡入淡出动画
function SeedLibrary() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<AppScreen>('prologue');
  const [visible, setVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasSeenPrologue = useRef(false);

  // 已登录用户直接跳到主界面（跳过序幕）
  useEffect(() => {
    if (!loading && user && screen === 'prologue' && !hasSeenPrologue.current) {
      hasSeenPrologue.current = true;
      setScreen('main');
    }
  }, [loading, user]);

  const navigateTo = useCallback((next: AppScreen) => {
    if (isTransitioning) return;
    // 'hub' is an alias for 'main'
    const target: AppScreen = next === 'hub' ? 'main' : next;
    setIsTransitioning(true);
    setVisible(false);
    setTimeout(() => {
      setScreen(target);
      setVisible(true);
      setIsTransitioning(false);
    }, 500);
  }, [isTransitioning]);

  if (loading) {
    return (
      <div className="fullscreen flex items-center justify-center"
        style={{ background: '#0D1B1E' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(46,204,113,0.4)', animation: 'breathe 2s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        width: '100%',
        height: '100%',
        position: 'fixed',
        inset: 0,
      }}
    >
      {screen === 'prologue' && (
        <ProloguePage onComplete={() => navigateTo('login')} />
      )}
      {screen === 'login' && (
        <LoginPage onSuccess={() => navigateTo('main')} />
      )}
      {screen === 'main' && (
        <MainHubPage navigateTo={navigateTo} />
      )}
      {screen === 'heartsoil' && (
        <HeartSoilPage navigateTo={navigateTo} />
      )}
      {screen === 'prism' && (
        <PrismPage navigateTo={navigateTo} />
      )}
      {screen === 'hearthfire' && (
        <HearthFirePage navigateTo={navigateTo} />
      )}
      {screen === 'reconstruct' && (
        <ReconstructPage navigateTo={navigateTo} />
      )}
      {screen === 'game' && (
        <GeneFoldingPage navigateTo={navigateTo} />
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SeedLibrary />
        <Toaster />
      </AuthProvider>
    </Router>
  );
};

export default App;

