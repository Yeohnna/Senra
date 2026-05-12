import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

// 云隙光：0号种子库 — SPA 模式
// 所有界面切换由 App.tsx 内部 SeedLibrary 状态机控制，不依赖 URL 路由
// routes.tsx 仅保留根路由占位，实际页面渲染由 App.tsx 完成
export const routes: RouteConfig[] = [];
