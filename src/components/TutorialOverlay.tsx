import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AppScreen } from '@/types/types';

interface TutorialProps {
  onDone: () => void;
  navigateTo: (s: AppScreen) => void;
}

const STEPS = [
  {
    title: '欢迎，守林人',
    body: '我是微光。你终于来了。\n2147年，这里是最后还亮着灯的地方——0号种子库。',
    highlight: null,
    icon: '✦',
  },
  {
    title: '源核',
    body: '这颗翡翠绿的晶体是源核。你记录的每一次情绪、每一个想法，都会化作养分滋养它。\n长时间不记录，它会结霜……',
    highlight: 'core',
    icon: '◈',
  },
  {
    title: '四大空间',
    body: '底部有四扇门：\n【心壤】记录情绪 · 【折光】捕捉灵感 · 【薪火】冥想修复 · 【重构】知识体系',
    highlight: 'nav',
    icon: '⊞',
  },
  {
    title: '记忆树皮',
    body: '屏幕上方那块青苔覆盖的树皮，保存了前代守林人的遗物。日记、仪表、导出工具——都在那里。',
    highlight: 'bark',
    icon: '⊙',
  },
  {
    title: '意识光灵',
    body: '你不是一个人。前六代守林人的意识尚未消散。点击那些发光的生命体，他们会和你说话。',
    highlight: 'companion',
    icon: '◉',
  },
  {
    title: '系统边栏',
    body: '左侧窄条是控制台——改名、退出、设置都在那里。\n右侧是风铃，敲它会有惊喜。',
    highlight: 'sidebar',
    icon: '≡',
  },
  {
    title: '出发吧',
    body: '不要害怕灰雾，Lyla。\n开始记录吧，哪怕只是一声叹息。',
    highlight: null,
    icon: '❋',
  },
];

export default function TutorialOverlay({ onDone, navigateTo: _nav }: TutorialProps) {
  const [step, setStep] = useState(0);
  const { markTutorialDone } = useAuth();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      await markTutorialDone();
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = async () => {
    await markTutorialDone();
    onDone();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      {/* 聚光圈 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 400px 300px at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 70%)',
      }} />

      {/* 微光引路 */}
      <div className="absolute"
        style={{
          width: '18px', height: '18px',
          borderRadius: '50%',
          background: '#A8E6CF',
          boxShadow: '0 0 20px rgba(168,230,207,0.8), 0 0 40px rgba(168,230,207,0.4)',
          top: `${30 + step * 8}%`,
          left: `${20 + step * 10}%`,
          animation: 'float 2s ease-in-out infinite',
          transition: 'all 0.8s ease',
        }}
      />

      {/* 对话框 */}
      <div className="relative z-10 glass-panel px-8 py-7 max-w-sm w-full mx-4 text-center"
        style={{ animation: 'slideFromBottom 0.4s ease forwards' }}
      >
        {/* 步骤图标 */}
        <div className="mb-4 text-3xl" style={{
          color: '#2ECC71',
          textShadow: '0 0 20px rgba(46,204,113,0.8)',
          animation: 'breathe 3s ease-in-out infinite',
        }}>
          {current.icon}
        </div>

        {/* 标题 */}
        <h3 className="mb-3 text-lg font-medium glow-text" style={{ color: '#E0F2F1', letterSpacing: '0.1em' }}>
          {current.title}
        </h3>

        {/* 内容 */}
        <p className="text-sm leading-relaxed text-pretty" style={{
          color: 'rgba(168,230,207,0.85)',
          whiteSpace: 'pre-line',
          lineHeight: 1.8,
        }}>
          {current.body}
        </p>

        {/* 进度点 */}
        <div className="flex justify-center gap-1.5 my-5">
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === step ? '#2ECC71' : 'rgba(78,205,196,0.3)',
              transition: 'all 0.3s ease',
              boxShadow: i === step ? '0 0 8px rgba(46,204,113,0.6)' : 'none',
            }} />
          ))}
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 justify-center">
          {!isLast && (
            <button onClick={handleSkip} className="px-4 py-1.5 text-xs"
              style={{ color: 'rgba(168,230,207,0.5)', letterSpacing: '0.1em' }}>
              跳过
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-6 py-2 text-sm transition-all"
            style={{
              background: 'rgba(46,204,113,0.2)',
              border: '1px solid rgba(46,204,113,0.5)',
              borderRadius: '6px',
              color: '#2ECC71',
              letterSpacing: '0.15em',
              boxShadow: '0 0 12px rgba(46,204,113,0.2)',
            }}
          >
            {isLast ? '开始记录' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
