import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { playWindChime, startWhiteNoise, stopWhiteNoise, playTimerEnd, resumeAudio, playWhaleSign } from '@/lib/audio';
import { COMPANIONS, matchCompanion, getResponse } from '@/lib/companions';
import type { AppScreen, CompanionId } from '@/types/types';
import TutorialOverlay from '@/components/TutorialOverlay';

interface MainHubProps {
  navigateTo: (s: AppScreen) => void;
}

const MEMORY_LINES = [
  '如果你看到了这些，请替我好好活着。 —— 阿萤',
  '今天的炉火比昨天旺。继续。 —— 阿南',
  '逻辑链完整，继续前进。 —— 阿澈',
  '你知道吗，星星其实一直在那里。 —— 那个孩子',
  '够了。今天这样就够了。 —— 小满',
  '发火没关系，压着才有问题。 —— 惊蛰',
];

const COVENANTS = [
  '一、在此记录的情绪与生活，皆为真实心跳数据',
  '二、灰雾无法吞噬被记录的记忆',
  '三、源核由守林人的真实感知滋养，任何虚假数据无效',
  '四、前代守林人的意识永久守护，随时可以对话',
  '五、断签不是失败，只是等待下一次柴火',
];

export default function MainHubPage({ navigateTo }: MainHubProps) {
  const { profile, signOut } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [companionId, setCompanionId] = useState<CompanionId | null>(null);
  const [companionMsg, setCompanionMsg] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showCovenant, setShowCovenant] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [noiseType, setNoiseType] = useState<'rain' | 'fire' | 'deep' | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerLeft, setTimerLeft] = useState(0);
  const [memoryDrop, setMemoryDrop] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [glowStage] = useState<'tadpole' | 'jellyfish' | 'stardust'>('tadpole');
  const [isHungry, setIsHungry] = useState(false);
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState('');
  const { updateGuardianName } = useAuth();

  // 检查是否首次登录
  useEffect(() => {
    if (profile?.first_login) {
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, [profile]);

  // 源核饥饿检测（3分钟没有记录）
  useEffect(() => {
    const t = setTimeout(() => {
      setIsHungry(true);
      playWhaleSign();
    }, 3 * 60 * 1000);
    return () => clearTimeout(t);
  }, []);

  // 计时器
  useEffect(() => {
    if (!timerActive || timerLeft <= 0) return;
    const t = setInterval(() => {
      setTimerLeft(l => {
        if (l <= 1) {
          setTimerActive(false);
          playTimerEnd();
          // 剧情掉落
          const line = MEMORY_LINES[Math.floor(Math.random() * MEMORY_LINES.length)];
          setMemoryDrop(line);
          setShowMemory(true);
          setTimeout(() => setShowMemory(false), 6000);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timerActive, timerLeft]);

  const handleChimeClick = useCallback(() => {
    resumeAudio();
    playWindChime();
    // 随机掉落记忆
    if (Math.random() < 0.3) {
      const line = MEMORY_LINES[Math.floor(Math.random() * MEMORY_LINES.length)];
      setMemoryDrop(line);
      setShowMemory(true);
      setTimeout(() => setShowMemory(false), 5000);
    }
  }, []);

  const handleNoiseToggle = (type: 'rain' | 'fire' | 'deep') => {
    resumeAudio();
    if (noiseType === type) {
      stopWhiteNoise();
      setNoiseType(null);
    } else {
      startWhiteNoise(type);
      setNoiseType(type);
    }
  };

  const handleCompanionClick = (id: CompanionId) => {
    setCompanionId(id);
    setCompanionMsg(getResponse(id, ''));
    setChatInput('');
  };

  const handleChat = () => {
    if (!companionId) return;
    const matched = matchCompanion(chatInput);
    const resp = getResponse(matched !== 'glow' ? matched : companionId, chatInput);
    setCompanionMsg(resp);
    setChatInput('');
  };

  const startTimer = () => {
    if (timerMinutes <= 0) return;
    setTimerLeft(timerMinutes * 60);
    setTimerActive(true);
  };

  const guardianName = profile?.guardian_name || 'Lyla';
  const dayCount = profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) + 1 : 1;

  return (
    <div className="fullscreen relative overflow-hidden select-none"
      style={{ background: 'linear-gradient(to top, #0D1B1E 0%, #142E2A 100%)' }}
    >
      {/* 背景孢子粒子 */}
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: '3px', height: '3px',
            background: '#A8E6CF',
            left: `${10 + i * 8}%`,
            top: '-10px',
            opacity: 0.4,
            animation: `spore-fall ${10 + i * 1.5}s linear infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}

      {/* ── 左侧边栏 ── */}
      <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col items-center py-6 gap-6 z-20"
        style={{ background: 'rgba(10,26,26,0.9)', borderRight: '1px solid rgba(78,205,196,0.15)' }}
      >
        {/* 铭牌 */}
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { setEditName(true); setNewName(guardianName); }}>
          <div className="w-10 h-10 rounded flex items-center justify-center text-xs"
            style={{ background: 'rgba(255,240,180,0.1)', border: '1px solid rgba(255,240,180,0.3)', color: '#FFEAA7', fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.3 }}>
            {guardianName.slice(0, 3)}<br />
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,240,180,0.6)' }}>Day {dayCount}</span>
          </div>
        </div>

        {/* 种子库公约 */}
        <button onClick={() => setShowCovenant(true)} className="w-10 h-8 rounded text-xs"
          style={{ background: 'rgba(78,205,196,0.1)', border: '1px solid rgba(78,205,196,0.2)', color: '#4ECDC4', fontSize: '0.55rem' }}>
          公约
        </button>

        {/* 设置 */}
        <button onClick={() => setShowSettings(true)} className="w-10 h-8 rounded text-xs"
          style={{ background: 'rgba(78,205,196,0.1)', border: '1px solid rgba(78,205,196,0.2)', color: '#4ECDC4', fontSize: '0.55rem' }}>
          设置
        </button>

        {/* 退出 */}
        <button onClick={signOut} className="mt-auto w-10 h-8 rounded text-xs"
          style={{ background: 'rgba(120,30,30,0.3)', border: '1px solid rgba(180,50,50,0.4)', color: '#CC5555', fontSize: '0.55rem' }}>
          休眠
        </button>
      </div>

      {/* ── 记忆树皮（上方） ── */}
      <div className="absolute top-4 left-20 right-20 z-10">
        <div className="relative mx-auto max-w-lg rounded-xl px-6 py-4 cursor-pointer"
          style={{ background: 'rgba(15,30,20,0.8)', border: '1px solid rgba(78,130,80,0.3)', borderRadius: '4px 4px 20px 20px' }}>
          {/* 青苔纹理 */}
          <div className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
            style={{ background: 'repeating-linear-gradient(45deg, rgba(46,204,113,0.1) 0px, rgba(46,204,113,0.1) 2px, transparent 2px, transparent 8px)' }}
          />
          <div className="flex justify-around items-center">
            {/* 阿萤的皮面日记 */}
            <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => navigateTo('heartsoil')}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="4" y="3" width="22" height="28" rx="2" fill="rgba(100,60,20,0.6)" stroke="rgba(168,230,207,0.5)" strokeWidth="1"/>
                <line x1="8" y1="10" x2="22" y2="10" stroke="rgba(168,230,207,0.4)" strokeWidth="0.8"/>
                <line x1="8" y1="14" x2="22" y2="14" stroke="rgba(168,230,207,0.3)" strokeWidth="0.8"/>
                <line x1="8" y1="18" x2="18" y2="18" stroke="rgba(168,230,207,0.3)" strokeWidth="0.8"/>
                <circle cx="24" cy="4" r="3" fill="#A8E6CF" opacity="0.7" className="animate-twinkle"/>
              </svg>
              <span style={{ fontSize: '0.55rem', color: 'rgba(168,230,207,0.6)' }}>日记</span>
            </div>

            {/* 阿澈的黄铜仪表 */}
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigateTo('reconstruct')}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="rgba(60,40,10,0.5)" stroke="rgba(255,200,50,0.5)" strokeWidth="1.5"/>
                <circle cx="16" cy="16" r="8" fill="none" stroke="rgba(255,200,50,0.3)" strokeWidth="0.8"/>
                <line x1="16" y1="8" x2="16" y2="13" stroke="#FFEAA7" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="16" x2="21" y2="19" stroke="rgba(255,200,50,0.6)" strokeWidth="1" strokeLinecap="round"/>
                <circle cx="16" cy="16" r="2" fill="#FFEAA7"/>
              </svg>
              <span style={{ fontSize: '0.55rem', color: 'rgba(255,224,167,0.6)' }}>仪表</span>
            </div>

            {/* 全息刻录机 */}
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => {
              const content = `0号种子库 守林人记录\n导出时间：${new Date().toLocaleString()}\n守林人：${guardianName}\n\n[记录已导出]`;
              const blob = new Blob([content], { type: 'text/plain' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '守林人记录.txt'; a.click();
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="6" y="8" width="20" height="18" rx="3" fill="rgba(20,50,50,0.6)" stroke="rgba(78,205,196,0.4)" strokeWidth="1"/>
                <circle cx="16" cy="17" r="4" fill="none" stroke="rgba(78,205,196,0.6)" strokeWidth="1"/>
                <circle cx="16" cy="17" r="1.5" fill="rgba(78,205,196,0.8)"/>
                <rect x="12" y="6" width="8" height="4" rx="1" fill="rgba(78,205,196,0.2)" stroke="rgba(78,205,196,0.3)" strokeWidth="0.8"/>
              </svg>
              <span style={{ fontSize: '0.55rem', color: 'rgba(78,205,196,0.6)' }}>导出</span>
            </div>

            {/* 锡纸星星（装饰） */}
            <div className="flex flex-col items-center gap-1">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <polygon points="16,4 18.5,13 28,13 20.5,18.5 23,28 16,22 9,28 11.5,18.5 4,13 13.5,13"
                  fill="rgba(180,180,200,0.3)" stroke="rgba(200,200,220,0.6)" strokeWidth="0.8"
                  style={{ animation: 'twinkle 3s ease infinite' }}/>
              </svg>
              <span style={{ fontSize: '0.55rem', color: 'rgba(200,200,220,0.4)' }}>星</span>
            </div>

            {/* 阿萤的粉笔字条 */}
            <div className="flex flex-col items-center gap-1 relative group cursor-default">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="4" y="8" width="24" height="18" rx="2" fill="rgba(240,240,200,0.1)" stroke="rgba(255,255,150,0.3)" strokeWidth="0.8"/>
                <line x1="8" y1="13" x2="24" y2="13" stroke="rgba(255,255,150,0.3)" strokeWidth="0.7"/>
                <line x1="8" y1="17" x2="20" y2="17" stroke="rgba(255,255,150,0.3)" strokeWidth="0.7"/>
                <line x1="8" y1="21" x2="16" y2="21" stroke="rgba(255,255,150,0.3)" strokeWidth="0.7"/>
              </svg>
              <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,150,0.4)' }}>字条</span>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 text-center hidden group-hover:block"
                style={{ fontSize: '0.65rem', color: '#FFEAA7', background: 'rgba(10,20,15,0.95)', border: '1px solid rgba(255,255,150,0.3)', borderRadius: '6px', padding: '6px 8px' }}>
                如果你看到了这些，请替我好好活着。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 中央：苔藓地面与源核 ── */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ bottom: '130px' }}>
        {/* 苔藓地面 */}
        <div className="relative" style={{ width: '320px', height: '80px' }}>
          <div className="absolute bottom-0 w-full h-12 rounded-full"
            style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(20,60,30,0.9) 0%, rgba(13,27,30,0.5) 70%)', filter: 'blur(4px)' }}
          />
          {/* 地面纹理 */}
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="absolute bottom-4 rounded-full"
              style={{
                width: `${4 + i * 2}px`, height: `${3 + i}px`,
                background: `rgba(${30 + i * 10},${80 + i * 15},${40 + i * 8},0.8)`,
                left: `${20 + i * 45}px`,
                filter: 'blur(0.5px)',
              }}
            />
          ))}
        </div>

        {/* 源核 */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-32 flex flex-col items-center">
          <div className="relative cursor-pointer" onClick={() => navigateTo('heartsoil')}
            style={{ animation: isHungry ? 'shake 0.5s ease, breathe 4s 1s ease-in-out infinite' : 'breathe 4s ease-in-out infinite' }}
          >
            <svg width="120" height="160" viewBox="0 0 120 160">
              <defs>
                <radialGradient id="coreGrad" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#E0F2F1" stopOpacity="0.9"/>
                  <stop offset="35%" stopColor="#2ECC71" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#A8E6CF" stopOpacity="0.4"/>
                </radialGradient>
                <filter id="coreglow">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <radialGradient id="frostGrad" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgba(200,240,255,0.7)"/>
                  <stop offset="100%" stopColor="rgba(150,200,220,0.2)"/>
                </radialGradient>
              </defs>
              {/* 根系 */}
              {[[-20,5],[-10,8],[0,10],[10,8],[20,5]].map(([dx], i) => (
                <path key={i}
                  d={`M60,140 Q${60 + dx},${155 + i * 2} ${60 + dx * 2},${165 + i}`}
                  fill="none" stroke="rgba(46,204,113,0.5)" strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(46,204,113,0.4))' }}
                />
              ))}
              {/* 光晕 */}
              <ellipse cx="60" cy="75" rx="52" ry="68" fill="rgba(46,204,113,0.08)"
                style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}/>
              {/* 主体 */}
              <path d="M60 10 C85 10 100 40 100 70 C100 105 85 140 60 148 C35 140 20 105 20 70 C20 40 35 10 60 10Z"
                fill="url(#coreGrad)" filter="url(#coreglow)"/>
              {/* 冰霜覆盖（饥饿时） */}
              {isHungry && (
                <path d="M60 10 C85 10 100 40 100 70 C100 105 85 140 60 148 C35 140 20 105 20 70 C20 40 35 10 60 10Z"
                  fill="url(#frostGrad)" opacity="0.5"/>
              )}
              {/* 内部年轮 */}
              {[0,1,2].map(i => (
                <ellipse key={i} cx="60" cy="75" rx={20 - i * 6} ry={26 - i * 8}
                  fill="none" stroke="rgba(224,242,241,0.2)" strokeWidth="0.8"
                  style={{ animation: `rotate-slow ${20 + i * 10}s linear infinite` }}
                />
              ))}
              {/* 内部心脏光点 */}
              <circle cx="60" cy="75" r="6" fill="rgba(224,242,241,0.6)"
                style={{ animation: 'breathe 2s ease-in-out infinite' }}/>
            </svg>
          </div>

          {/* 微光小窝 */}
          <div className="absolute -right-16 bottom-8">
            <div className="relative">
              {/* 鸟巢 */}
              <svg width="50" height="35" viewBox="0 0 50 35">
                <path d="M5 30 Q25 15 45 30" fill="rgba(100,60,20,0.6)" stroke="rgba(140,90,40,0.5)" strokeWidth="1"/>
                <path d="M8 28 Q25 18 42 28" fill="none" stroke="rgba(140,90,40,0.4)" strokeWidth="0.8"/>
              </svg>
              {/* 微光（蝌蚪形态） */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 cursor-pointer"
                onClick={() => handleCompanionClick('glow')}
                style={{ animation: 'float 3s ease-in-out infinite' }}>
                <svg width="20" height="28" viewBox="0 0 20 28">
                  {glowStage === 'tadpole' && <>
                    <ellipse cx="10" cy="10" rx="7" ry="9" fill="rgba(168,230,207,0.8)"
                      style={{ filter: 'drop-shadow(0 0 5px rgba(168,230,207,0.8))' }}/>
                    <path d="M10 19 Q8 23 6 27" fill="none" stroke="rgba(168,230,207,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                  </>}
                </svg>
              </div>
            </div>
          </div>

          {/* 小满（源核泥土旁）*/}
          <div className="absolute -left-14 bottom-4 cursor-pointer" onClick={() => handleCompanionClick('man')}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <ellipse cx="14" cy="20" rx="10" ry="6" fill="rgba(68,170,102,0.3)"/>
              {[0,1,2].map(i => (
                <ellipse key={i} cx={8 + i * 6} cy={16 - i % 2 * 3} rx="3" ry="5"
                  fill={`rgba(40,${120 + i * 20},70,0.7)`}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(68,170,102,0.5))' }}/>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* ── 右侧风铃 ── */}
      <div className="absolute right-3 top-1/3 z-20 flex flex-col items-center gap-2">
        {/* 风铃主体 */}
        <div className="flex gap-1.5 cursor-pointer" onClick={handleChimeClick}>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col items-center" style={{ animationDelay: `${i * 0.2}s` }}>
              <div style={{
                width: '2px', height: `${30 + i * 8}px`,
                background: 'rgba(168,230,207,0.5)',
                boxShadow: noiseType ? '0 0 6px rgba(168,230,207,0.8)' : 'none',
              }}/>
              <div style={{
                width: `${10 + i * 3}px`, height: `${12 + i * 4}px`,
                background: 'rgba(168,230,207,0.2)',
                border: '1px solid rgba(168,230,207,0.5)',
                borderRadius: '2px 2px 50% 50%',
                boxShadow: noiseType ? '0 0 12px rgba(168,230,207,0.6)' : '0 0 4px rgba(168,230,207,0.2)',
                animation: 'float 3s ease-in-out infinite',
                animationDelay: `${i * 0.3}s`,
              }}/>
            </div>
          ))}
        </div>

        {/* 白噪音切换 */}
        <div className="flex flex-col gap-1 mt-2">
          {(['rain', 'fire', 'deep'] as const).map(t => (
            <button key={t} onClick={() => handleNoiseToggle(t)}
              className="w-8 h-6 text-xs rounded"
              style={{
                background: noiseType === t ? 'rgba(46,204,113,0.3)' : 'rgba(20,46,42,0.6)',
                border: `1px solid ${noiseType === t ? 'rgba(46,204,113,0.6)' : 'rgba(78,205,196,0.2)'}`,
                color: noiseType === t ? '#2ECC71' : 'rgba(168,230,207,0.5)',
                fontSize: '0.45rem',
              }}>
              {t === 'rain' ? '雨' : t === 'fire' ? '炉' : '深'}
            </button>
          ))}
        </div>

        {/* 发呆计时器 */}
        <div className="flex flex-col items-center gap-1 mt-2">
          {timerActive ? (
            <div className="text-center" style={{ fontSize: '0.55rem', color: '#A8E6CF' }}>
              {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input type="number" min="1" max="60" value={timerMinutes || ''}
                onChange={e => setTimerMinutes(Number(e.target.value))}
                className="w-8 text-center outline-none"
                style={{ background: 'rgba(20,46,42,0.8)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '3px', color: '#A8E6CF', fontSize: '0.55rem' }}
                placeholder="分"
              />
              <button onClick={startTimer} style={{ fontSize: '0.55rem', color: '#2ECC71' }}>▶</button>
            </div>
          )}
        </div>
      </div>

      {/* 伙伴：惊蛰（折光水面上方位置，此处在右侧） */}
      <div className="absolute right-16 top-1/4 cursor-pointer z-10" onClick={() => handleCompanionClick('jingzhe')}>
        <svg width="28" height="24" viewBox="0 0 28 24">
          <ellipse cx="14" cy="12" rx="10" ry="7" fill="rgba(100,40,160,0.3)" stroke="rgba(153,68,204,0.4)" strokeWidth="1"/>
          {[0,1,2].map(i => (
            <line key={i} x1={8 + i * 6} y1={12} x2={8 + i * 6} y2={22}
              stroke="rgba(153,68,204,0.7)" strokeWidth="1.5"
              style={{ animation: `twinkle ${1 + i * 0.3}s ease infinite`, animationDelay: `${i * 0.2}s` }}/>
          ))}
        </svg>
      </div>

      {/* 伙伴：那个孩子 */}
      <div className="absolute right-24 top-1/3 cursor-pointer z-10" onClick={() => handleCompanionClick('child')}
        style={{ animation: 'drift 8s ease-in-out infinite' }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'rgba(136,170,255,0.4)', border: '1px solid rgba(136,170,255,0.7)',
          boxShadow: '0 0 15px rgba(136,170,255,0.5)',
          animation: 'twinkle 1.5s ease infinite',
        }}/>
      </div>

      {/* ── 底部四大入口 ── */}
      <div className="absolute bottom-0 left-14 right-0 z-20">
        {/* 弧形背景 */}
        <div style={{ height: '110px', background: 'linear-gradient(to top, rgba(5,15,15,0.95) 0%, transparent 100%)' }}>
          <div className="flex justify-around items-end h-full pb-6 px-4">
            {/* 心壤 */}
            <button onClick={() => navigateTo('heartsoil')} className="flex flex-col items-center gap-2 group">
              <div className="relative w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'rgba(20,60,30,0.8)', border: '1px solid rgba(46,204,113,0.3)', boxShadow: '0 0 15px rgba(46,204,113,0.1)' }}>
                {/* 藤蔓 */}
                <svg width="44" height="36" viewBox="0 0 44 36">
                  <path d="M5 35 Q10 20 22 15 Q34 20 39 35" fill="none" stroke="rgba(46,204,113,0.5)" strokeWidth="1"/>
                  {[0,1,2].map(i => (
                    <circle key={i} cx={10 + i * 12} cy={28 - i * 3} r="2"
                      fill="rgba(46,204,113,0.6)" style={{ animation: `twinkle ${1.5 + i * 0.5}s ease infinite` }}/>
                  ))}
                </svg>
              </div>
              <span className="text-xs" style={{ color: 'rgba(168,230,207,0.8)', letterSpacing: '0.1em' }}>心壤</span>
            </button>

            {/* 折光 */}
            <button onClick={() => navigateTo('prism')} className="flex flex-col items-center gap-2 group">
              <div className="relative w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'rgba(10,30,50,0.8)', border: '1px solid rgba(93,138,168,0.4)', boxShadow: '0 0 15px rgba(93,138,168,0.1)' }}>
                <svg width="44" height="36" viewBox="0 0 44 36">
                  <rect x="2" y="20" width="40" height="16" rx="2" fill="rgba(93,138,168,0.2)"/>
                  {[0,1,2,3,4].map(i => (
                    <circle key={i} cx={6 + i * 8} cy={30} r="2"
                      fill="rgba(93,138,168,0.7)" style={{ animation: `float ${2 + i * 0.3}s ease infinite`, animationDelay: `${i * 0.2}s` }}/>
                  ))}
                  <path d="M5 20 Q22 5 39 20" fill="none" stroke="rgba(93,138,168,0.4)" strokeWidth="1"/>
                </svg>
              </div>
              <span className="text-xs" style={{ color: 'rgba(93,138,168,0.9)', letterSpacing: '0.1em' }}>折光</span>
            </button>

            {/* 薪火 */}
            <button onClick={() => navigateTo('hearthfire')} className="flex flex-col items-center gap-2 group">
              <div className="relative w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'rgba(40,20,10,0.8)', border: '1px solid rgba(255,150,50,0.3)', boxShadow: '0 0 15px rgba(255,150,50,0.1)' }}>
                <svg width="44" height="36" viewBox="0 0 44 36">
                  <rect x="8" y="10" width="28" height="22" rx="4" fill="rgba(60,30,10,0.6)" stroke="rgba(150,80,20,0.5)" strokeWidth="1.5"/>
                  {[0,1,2].map(i => (
                    <rect key={i} x={12 + i * 8} y={24} width="4" height="10" rx="1"
                      fill={`rgba(255,${180 - i * 30},${50 + i * 20},0.7)`}
                      style={{ animation: `breathe ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}/>
                  ))}
                  {/* 缝隙火光 */}
                  <line x1="8" y1="32" x2="36" y2="32" stroke="rgba(255,224,167,0.5)" strokeWidth="1"/>
                </svg>
              </div>
              <span className="text-xs" style={{ color: 'rgba(255,224,167,0.8)', letterSpacing: '0.1em' }}>薪火</span>
            </button>

            {/* 重构 */}
            <button onClick={() => navigateTo('reconstruct')} className="flex flex-col items-center gap-2 group">
              <div className="relative w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'rgba(5,20,25,0.8)', border: '1px solid rgba(78,205,196,0.3)', boxShadow: '0 0 15px rgba(78,205,196,0.1)' }}>
                <svg width="44" height="36" viewBox="0 0 44 36">
                  {[[22,6],[8,30],[36,30]].map(([cx,cy],i) => (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r="4" fill="rgba(78,205,196,0.3)" stroke="rgba(78,205,196,0.6)" strokeWidth="1"
                        style={{ animation: `twinkle ${2 + i * 0.3}s ease infinite` }}/>
                    </g>
                  ))}
                  <line x1="22" y1="10" x2="8" y2="26" stroke="rgba(78,205,196,0.4)" strokeWidth="0.8"/>
                  <line x1="22" y1="10" x2="36" y2="26" stroke="rgba(78,205,196,0.4)" strokeWidth="0.8"/>
                  <line x1="8" y1="30" x2="36" y2="30" stroke="rgba(78,205,196,0.3)" strokeWidth="0.8"/>
                </svg>
              </div>
              <span className="text-xs" style={{ color: 'rgba(78,205,196,0.8)', letterSpacing: '0.1em' }}>重构</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 伙伴树皮旁（阿萤、阿澈） ── */}
      <div className="absolute top-24 left-20 cursor-pointer z-10" onClick={() => handleCompanionClick('ying')}
        style={{ animation: 'drift 10s ease-in-out infinite' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="absolute" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'rgba(136,204,0,0.8)',
            boxShadow: '0 0 8px rgba(136,204,0,0.5)',
            left: `${i * 8}px`, top: `${i % 2 * 6}px`,
            animation: `float ${1.5 + i * 0.3}s ease infinite`,
          }}/>
        ))}
      </div>

      {/* ── 游戏入口（培养皿）── */}
      <div className="absolute cursor-pointer z-10" style={{ top: '80px', left: '70px' }}
        onClick={() => navigateTo('game')}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <rect x="4" y="4" width="28" height="28" rx="4" fill="rgba(20,46,42,0.6)" stroke="rgba(78,205,196,0.3)" strokeWidth="1"/>
          <text x="18" y="22" textAnchor="middle" fill="rgba(168,230,207,0.7)" fontSize="14">⚗</text>
        </svg>
      </div>

      {/* 记忆飘落文字 */}
      {showMemory && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 text-center"
          style={{ animation: 'slideFromBottom 0.5s ease forwards', maxWidth: '280px' }}>
          <p style={{ color: 'rgba(168,230,207,0.7)', fontSize: '0.75rem', letterSpacing: '0.1em', textShadow: '0 0 10px rgba(168,230,207,0.4)' }}>
            {memoryDrop}
          </p>
        </div>
      )}

      {/* ── 弹窗：种子库公约 ── */}
      {showCovenant && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowCovenant(false)}>
          <div className="glass-panel px-8 py-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideFromBottom 0.3s ease' }}>
            <h3 className="text-center mb-4 glow-text" style={{ color: '#E0F2F1', letterSpacing: '0.2em', fontSize: '1rem' }}>
              ⊙ 种子库公约 ⊙
            </h3>
            {COVENANTS.map((c, i) => (
              <p key={i} className="text-sm mb-2" style={{ color: 'rgba(168,230,207,0.8)', lineHeight: 1.7, fontSize: '0.8rem' }}>{c}</p>
            ))}
            <button className="mt-4 w-full py-1.5 text-sm" onClick={() => setShowCovenant(false)}
              style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '6px', color: '#2ECC71' }}>
              已阅，继续守护
            </button>
          </div>
        </div>
      )}

      {/* ── 弹窗：设置 ── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowSettings(false)}>
          <div className="glass-panel px-8 py-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-center mb-4" style={{ color: '#E0F2F1', letterSpacing: '0.2em', fontSize: '0.9rem' }}>⚙ 设置</h3>
            <p className="text-sm mb-3" style={{ color: 'rgba(168,230,207,0.6)', fontSize: '0.75rem' }}>当前守林人：{guardianName}</p>
            <p className="text-sm" style={{ color: 'rgba(168,230,207,0.6)', fontSize: '0.75rem' }}>入库天数：Day {dayCount}</p>
            <p className="text-sm mt-2" style={{ color: 'rgba(168,230,207,0.6)', fontSize: '0.75rem' }}>星光碎片：{profile?.star_fragments || 0}</p>
            <button className="mt-4 w-full py-1.5 text-sm" onClick={() => setShowSettings(false)}
              style={{ background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '6px', color: '#4ECDC4', fontSize: '0.8rem' }}>
              关闭
            </button>
          </div>
        </div>
      )}

      {/* ── 改名弹窗 ── */}
      {editName && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-panel px-6 py-5 max-w-xs w-full mx-4">
            <h3 className="text-center mb-3" style={{ color: '#E0F2F1', fontSize: '0.9rem', letterSpacing: '0.1em' }}>修改守林人代号</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={20}
              className="w-full px-3 py-2 text-center outline-none mb-3"
              style={{ background: 'rgba(20,46,42,0.7)', border: '1px solid rgba(78,205,196,0.4)', borderRadius: '6px', color: '#E0F2F1', fontSize: '0.85rem' }}/>
            <div className="flex gap-2">
              <button className="flex-1 py-1.5 text-xs" onClick={() => setEditName(false)}
                style={{ background: 'transparent', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '6px', color: 'rgba(168,230,207,0.6)' }}>
                取消
              </button>
              <button className="flex-1 py-1.5 text-xs" onClick={async () => { await updateGuardianName(newName); setEditName(false); }}
                style={{ background: 'rgba(46,204,113,0.2)', border: '1px solid rgba(46,204,113,0.5)', borderRadius: '6px', color: '#2ECC71' }}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 伙伴对话框 ── */}
      {companionId && (
        <div className="absolute inset-0 z-50 flex items-end justify-center pb-32"
          style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setCompanionId(null)}>
          <div className="glass-panel px-6 py-5 max-w-sm w-full mx-4 mb-4" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideFromBottom 0.3s ease' }}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: COMPANIONS[companionId].color, boxShadow: `0 0 10px ${COMPANIONS[companionId].glowColor}` }}/>
              <span style={{ color: COMPANIONS[companionId].color, fontSize: '0.85rem', letterSpacing: '0.1em' }}>{COMPANIONS[companionId].name}</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(224,242,241,0.85)', lineHeight: 1.8, fontSize: '0.82rem' }}>
              {companionMsg}
            </p>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="说点什么…" className="flex-1 px-3 py-1.5 text-sm outline-none"
                style={{ background: 'rgba(20,46,42,0.7)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '6px', color: '#E0F2F1', fontSize: '0.8rem' }}/>
              <button onClick={handleChat} style={{ padding: '6px 12px', background: 'rgba(46,204,113,0.2)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '6px', color: '#2ECC71', fontSize: '0.8rem' }}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 新手教程 ── */}
      {showTutorial && (
        <TutorialOverlay onDone={() => setShowTutorial(false)} navigateTo={navigateTo} />
      )}
    </div>
  );
}
