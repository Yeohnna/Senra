import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { startWhiteNoise, stopWhiteNoise, playMechanicalClick, resumeAudio, playAmberSound } from '@/lib/audio';
import ReturnButton from '@/components/ReturnButton';
import type { AppScreen, MeditationRecord, SenseRitual } from '@/types/types';

interface HearthFireProps { navigateTo: (s: AppScreen) => void; }

type AnchorType = 'rain' | 'fire' | 'deep';
type BreathMode = 'basic' | 'deep' | 'free';
type Phase = 'idle' | 'select' | 'breath' | 'crystal';

const RITUALS = [
  { key: 'touch', label: '触温', desc: '闭眼感受皮肤温度', color: '#888888', nanWords: '灰潮夺走温度感。你夺回来了。' },
  { key: 'smell', label: '嗅寻', desc: '深吸一口气辨别气味', color: '#66AA44', nanWords: '还在闻。还在活。' },
  { key: 'listen', label: '听寂', desc: '分辨你能听到的最远声音', color: '#5D8AA8', nanWords: '寂静也有层次。你能听见了。' },
  { key: 'focus', label: '凝微', desc: '盯着一个微小物体30秒', color: '#FFEAA7', nanWords: '世界比灰潮想让你看到的更细。' },
  { key: 'pulse', label: '脉寻', desc: '摸胸口数心跳10次', color: '#2ECC71', nanWords: '你的心跳，是这废土上最后的坐标。' },
];

const BREATH_MODES: Record<BreathMode, { in: number; hold: number; out: number; rest: number; label: string; desc: string }> = {
  basic:  { in: 4, hold: 4, out: 6, rest: 2, label: '基础', desc: '4-4-6-2 日常放松' },
  deep:   { in: 4, hold: 7, out: 8, rest: 2, label: '深度', desc: '4-7-8-2 焦虑/失眠' },
  free:   { in: 6, hold: 0, out: 6, rest: 0, label: '自由', desc: '6-0-6-0 随心呼吸' },
};

export default function HearthFirePage({ navigateTo }: HearthFireProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [anchor, setAnchor] = useState<AnchorType>('fire');
  const [breathMode, setBreathMode] = useState<BreathMode>('basic');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'rest'>('in');
  const [breathProgress, setBreathProgress] = useState(0);
  const [meditationSecs, setMeditationSecs] = useState(0);
  const [nanMessage, setNanMessage] = useState('');
  const [ritualDone, setRitualDone] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<MeditationRecord[]>([]);
  const [crystals, setCrystals] = useState<Array<{ id: string; size: 'small' | 'medium' | 'large'; secs: number; date: string }>>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [darkModeSecs, setDarkModeSecs] = useState(0);
  const [overload, setOverload] = useState(false);
  const [ashCount, setAshCount] = useState(0);
  const [nanFire, setNanFire] = useState<'weak' | 'normal' | 'strong'>('normal');
  const breathTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meditationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const darkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathSecondsRef = useRef(0);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('meditation_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setRecords(data as MeditationRecord[]);
      const mapped = (data as MeditationRecord[]).map(r => ({
        id: r.id,
        secs: r.duration_seconds || 0,
        size: (r.duration_seconds || 0) < 300 ? 'small' as const : (r.duration_seconds || 0) < 900 ? 'medium' as const : 'large' as const,
        date: new Date(r.created_at).toLocaleDateString(),
      }));
      setCrystals(mapped);
    }
  }, [user]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // 开始冥想
  const startMeditation = () => {
    resumeAudio();
    startWhiteNoise(anchor);
    setPhase('breath');
    setMeditationSecs(0);
    breathSecondsRef.current = 0;
    startBreathCycle();
    meditationTimerRef.current = setInterval(() => {
      setMeditationSecs(s => s + 1);
    }, 1000);
  };

  // 呼吸循环
  const startBreathCycle = () => {
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    const mode = BREATH_MODES[breathMode];
    let totalPhase = 0;
    const phases = ([
      { name: 'in' as const, duration: mode.in },
      { name: 'hold' as const, duration: mode.hold },
      { name: 'out' as const, duration: mode.out },
      { name: 'rest' as const, duration: mode.rest },
    ] as Array<{ name: 'in' | 'hold' | 'out' | 'rest'; duration: number }>).filter(p => p.duration > 0);

    let phaseIndex = 0;
    let phaseElapsed = 0;
    setBreathPhase(phases[0].name);

    breathTimerRef.current = setInterval(() => {
      phaseElapsed++;
      const currentPhase = phases[phaseIndex];
      setBreathProgress(phaseElapsed / currentPhase.duration);
      if (phaseElapsed >= currentPhase.duration) {
        phaseElapsed = 0;
        phaseIndex = (phaseIndex + 1) % phases.length;
        setBreathPhase(phases[phaseIndex].name);
      }
      breathSecondsRef.current++;
    }, 1000);
  };

  // 结束冥想
  const endMeditation = async () => {
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    if (meditationTimerRef.current) clearInterval(meditationTimerRef.current);
    stopWhiteNoise();
    const secs = meditationSecs;
    const crystalSize = secs < 300 ? 'small' : secs < 900 ? 'medium' : 'large';
    resumeAudio();
    playAmberSound();
    setPhase('crystal');

    if (user) {
      await supabase.from('meditation_records').insert({
        user_id: user.id,
        duration_seconds: secs,
        anchor_type: anchor,
        breath_mode: breathMode,
        amber_size: crystalSize,
        dark_mode: darkMode,
      });
    }

    if (secs > 900) {
      setTimeout(() => {
        setOverload(true);
        setTimeout(() => setOverload(false), 10000);
      }, 500);
    }
    loadRecords();
  };

  const handleRitualClick = (key: string) => {
    resumeAudio();
    playMechanicalClick();
    const ritual = RITUALS.find(r => r.key === key);
    if (ritual) {
      setNanMessage(ritual.nanWords);
      setTimeout(() => setNanMessage(''), 4000);
      setRitualDone(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setNanFire(ritualDone.size >= 3 ? 'strong' : ritualDone.size >= 1 ? 'normal' : 'weak');
    }
  };

  // 暗室模式长按
  const handleFurnaceLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      resumeAudio();
      setDarkMode(true);
      setDarkModeSecs(0);
      startWhiteNoise('deep');
      darkTimerRef.current = setInterval(() => {
        setDarkModeSecs(s => s + 1);
      }, 1000);
    }, 3000);
  };
  const handleFurnaceLongPressEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };
  const exitDarkMode = () => {
    if (darkTimerRef.current) clearInterval(darkTimerRef.current);
    stopWhiteNoise();
    setDarkMode(false);
  };

  useEffect(() => {
    return () => {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
      if (meditationTimerRef.current) clearInterval(meditationTimerRef.current);
      if (darkTimerRef.current) clearInterval(darkTimerRef.current);
      stopWhiteNoise();
    };
  }, []);

  const nanColor = nanFire === 'strong' ? '#FF6600' : nanFire === 'normal' ? '#CC4400' : '#660022';
  const breathConfig = BREATH_MODES[breathMode];
  const breathLabel = { in: '吸 气', hold: '屏 息', out: '呼 气', rest: '静 息' }[breathPhase];
  const sphereScale = breathPhase === 'in' ? (0.6 + breathProgress * 0.6) : breathPhase === 'hold' ? 1.2 : breathPhase === 'out' ? (1.2 - breathProgress * 0.6) : 0.6;
  const sphereColor = breathPhase === 'in' || breathPhase === 'hold' ? `rgba(168,230,207,${0.4 + breathProgress * 0.4})` : `rgba(180,50,30,${0.4 + breathProgress * 0.4})`;

  return (
    <div className={`fullscreen relative overflow-hidden ${darkMode ? '' : ''}`}
      style={{ background: darkMode ? '#000000' : `linear-gradient(to bottom, #1A1612 0%, #2C2520 100%)`, transition: 'background 1s ease' }}
    >
      {!darkMode && <ReturnButton onClick={() => navigateTo('hub')} />}

      {/* 热浪扭曲效果 */}
      {!darkMode && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ backdropFilter: phase === 'breath' ? 'blur(0.3px)' : 'none', animation: 'heat-wave 3s ease-in-out infinite' }}/>
      )}

      {/* 炉火过载 */}
      {overload && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.9)', animation: 'fadeIn 0.3s ease' }}>
          <p className="text-center" style={{ color: '#1A1612', fontSize: '0.85rem', letterSpacing: '0.2em' }}>
            你的感知力传到了源核。<br/>它在告诉你：我感受到了你。
          </p>
        </div>
      )}

      {/* 暗室模式 */}
      {darkMode && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center" onClick={exitDarkMode}>
          {/* 阿南微弱光 */}
          <div className="absolute" style={{ bottom: '80px', left: '50px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(180,50,30,0.3)', filter: 'blur(4px)', animation: 'breathe 4s ease-in-out infinite' }}/>
          </div>
          {/* 呼吸球 */}
          <div style={{
            width: `${80 * sphereScale}px`, height: `${80 * sphereScale}px`,
            borderRadius: '50%', background: sphereColor,
            boxShadow: `0 0 ${40 * sphereScale}px ${sphereColor}`,
            transition: 'all 0.1s ease',
          }}/>
          <p className="mt-6" style={{ color: 'rgba(168,230,207,0.3)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
            {Math.floor(darkModeSecs / 60)}:{String(darkModeSecs % 60).padStart(2, '0')} · 点击退出暗室
          </p>
        </div>
      )}

      {/* 主体（非暗室） */}
      {!darkMode && (
        <div className="absolute inset-0 flex flex-col z-10" style={{ paddingTop: '50px' }}>

          {/* 维生炉膛 */}
          <div className="flex justify-center mb-4">
            <div
              className="relative cursor-pointer"
              onMouseDown={handleFurnaceLongPressStart}
              onMouseUp={handleFurnaceLongPressEnd}
              onTouchStart={handleFurnaceLongPressStart}
              onTouchEnd={handleFurnaceLongPressEnd}
            >
              <svg width="200" height="160" viewBox="0 0 200 160">
                <defs>
                  <radialGradient id="furnaceGrad">
                    <stop offset="0%" stopColor={overload ? '#ffffff' : '#FF8C00'} stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#1A1612" stopOpacity="0.9"/>
                  </radialGradient>
                </defs>
                {/* 铆钉 */}
                {[[10,10],[190,10],[10,150],[190,150]].map(([x,y],i) => (
                  <circle key={i} cx={x} cy={y} r="5" fill="rgba(120,80,20,0.6)" stroke="rgba(180,120,30,0.4)" strokeWidth="1"/>
                ))}
                {/* 炉体 */}
                <rect x="20" y="20" width="160" height="120" rx="8" fill="rgba(40,20,10,0.7)" stroke="rgba(120,80,20,0.5)" strokeWidth="2"/>
                {/* 炉门 */}
                <rect x="40" y="40" width="120" height="80" rx="6" fill="rgba(20,10,5,0.8)" stroke="rgba(150,90,30,0.6)" strokeWidth="1.5"/>
                {/* 缝隙火光 */}
                <rect x="42" y="118" width="116" height="3" rx="1" fill="#FFEAA7" opacity="0.6"
                  style={{ animation: 'breathe 2s ease-in-out infinite' }}/>
                {/* 炉内火焰 */}
                {phase === 'breath' && [0,1,2].map(i => (
                  <path key={i} d={`M${70+i*20} 115 Q${65+i*20} ${90-i*5} ${70+i*20} ${70+i*8}`}
                    fill={`rgba(${255},${150+i*30},${50+i*20},0.7)`}
                    style={{ animation: `breathe ${1.2+i*0.2}s ease-in-out infinite`, animationDelay: `${i*0.15}s` }}/>
                ))}
                {/* 星空/雨帘/炉火overlay */}
                {anchor === 'deep' && (
                  <>
                    <rect x="42" y="42" width="116" height="76" rx="4" fill="rgba(5,10,30,0.7)"/>
                    {Array.from({length:8},(_,i) => (
                      <circle key={i} cx={50+i*14} cy={60+i%3*15} r="1.5" fill="rgba(200,220,255,0.6)"
                        style={{ animation: `twinkle ${1.5+i*0.3}s ease infinite` }}/>
                    ))}
                  </>
                )}
                {anchor === 'rain' && phase === 'breath' && Array.from({length:6},(_,i) => (
                  <line key={i} x1={55+i*16} y1={42} x2={52+i*16} y2={118}
                    stroke="rgba(93,138,168,0.4)" strokeWidth="1"
                    style={{ animation: `spore-fall ${1+i*0.2}s linear infinite`, animationDelay: `${i*0.15}s` }}/>
                ))}
                {/* 阿南 */}
                <ellipse cx="100" cy="90" rx="18" ry="14" fill={nanColor}
                  style={{ filter: `drop-shadow(0 0 ${nanFire==='strong'?'12':'8'}px ${nanColor})`, animation: 'breathe 3s ease-in-out infinite' }}/>
                {/* 齿轮（装饰） */}
                <g transform="translate(160, 15)">
                  <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(150,100,30,0.5)" strokeWidth="1.5"/>
                  {[0,45,90,135,180,225,270,315].map(a => (
                    <rect key={a} x="-1.5" y="-12" width="3" height="5" rx="1" fill="rgba(150,100,30,0.4)"
                      transform={`rotate(${a})`}/>
                  ))}
                </g>
              </svg>
              <p className="text-center" style={{ fontSize: '0.55rem', color: 'rgba(255,200,100,0.4)', letterSpacing: '0.1em', marginTop: '-8px' }}>长按3秒进入暗室</p>
            </div>

            {/* 感知年轮（右侧） */}
            <div className="absolute right-4 top-16">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="rgba(60,30,10,0.5)" stroke="rgba(120,80,20,0.4)" strokeWidth="1"/>
                {crystals.slice(-10).map((c, i) => {
                  const r = 6 + i * 3;
                  const color = c.size === 'small' ? '#8B0000' : c.size === 'medium' ? '#CC6600' : '#E0F2F1';
                  return <circle key={c.id} cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth={c.size === 'large' ? 2 : 1} opacity="0.7"/>;
                })}
                <circle cx="40" cy="40" r="4" fill={nanColor} style={{ filter: `drop-shadow(0 0 4px ${nanColor})` }}/>
              </svg>
              <p className="text-center" style={{ fontSize: '0.55rem', color: 'rgba(150,80,20,0.6)', letterSpacing: '0.1em' }}>感知年轮</p>
            </div>
          </div>

          {/* 阿南话语 */}
          {nanMessage && (
            <div className="text-center px-8 mb-3" style={{ animation: 'slideFromBottom 0.3s ease' }}>
              <p style={{ color: `rgba(200,130,50,0.9)`, fontSize: '0.78rem', fontStyle: 'italic', textShadow: `0 0 8px ${nanColor}80` }}>
                阿南：「{nanMessage}」
              </p>
            </div>
          )}

          {/* 感知仪式 */}
          {phase === 'idle' && (
            <div className="px-4">
              <p style={{ fontSize: '0.65rem', color: 'rgba(150,80,20,0.7)', letterSpacing: '0.15em', textAlign: 'center', marginBottom: '8px' }}>
                ── 添柴协议·感知仪式 ──
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {RITUALS.map(r => (
                  <button key={r.key} onClick={() => handleRitualClick(r.key)}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: ritualDone.has(r.key) ? `rgba(${r.color === '#FFEAA7' ? '255,224,167' : r.color === '#2ECC71' ? '46,204,113' : r.color === '#5D8AA8' ? '93,138,168' : r.color === '#66AA44' ? '102,170,68' : '120,120,120'},0.2)` : 'rgba(40,20,10,0.6)',
                      border: `1px solid ${ritualDone.has(r.key) ? r.color+'80' : 'rgba(120,80,20,0.3)'}`,
                      opacity: ritualDone.has(r.key) ? 1 : 0.8,
                    }}>
                    <span style={{ fontSize: '0.8rem', color: ritualDone.has(r.key) ? r.color : 'rgba(180,120,50,0.8)' }}>{r.label}</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(150,80,20,0.6)', maxWidth: '60px', textAlign: 'center', lineHeight: 1.3 }}>{r.desc}</span>
                    {ritualDone.has(r.key) && <span style={{ fontSize: '0.65rem', color: r.color }}>✓</span>}
                  </button>
                ))}
              </div>

              {/* 归炉协议 */}
              <p style={{ fontSize: '0.65rem', color: 'rgba(150,80,20,0.7)', letterSpacing: '0.15em', textAlign: 'center', marginBottom: '8px' }}>
                ── 归炉协议·选择锚点 ──
              </p>
              <div className="flex gap-2 justify-center mb-3">
                {([['rain','雨穴','rgba(93,138,168,0.6)'],['fire','炉穴','rgba(200,100,30,0.6)'],['deep','深穴','rgba(50,30,100,0.6)']] as [AnchorType,string,string][]).map(([k,label,c]) => (
                  <button key={k} onClick={() => setAnchor(k)}
                    className="px-4 py-2 text-xs rounded-lg"
                    style={{ background: anchor === k ? c.replace('0.6','0.3') : 'rgba(40,20,10,0.5)', border: `1px solid ${anchor===k?c:'rgba(100,60,20,0.3)'}`, color: anchor===k?'#FFEAA7':'rgba(180,120,50,0.6)', letterSpacing: '0.1em' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-center mb-3">
                {(Object.entries(BREATH_MODES) as [BreathMode, typeof BREATH_MODES[BreathMode]][]).map(([k, m]) => (
                  <button key={k} onClick={() => setBreathMode(k)}
                    className="px-3 py-1.5 text-xs rounded"
                    style={{ background: breathMode===k?'rgba(180,100,30,0.2)':'transparent', border:`1px solid ${breathMode===k?'rgba(200,120,40,0.5)':'rgba(100,60,20,0.2)'}`, color: breathMode===k?'#FFEAA7':'rgba(150,80,20,0.6)', fontSize:'0.7rem' }}>
                    {m.label}
                    <span style={{ display:'block', fontSize:'0.55rem', opacity:0.7 }}>{m.desc}</span>
                  </button>
                ))}
              </div>
              <div className="text-center">
                <button onClick={startMeditation}
                  className="px-8 py-2.5 text-sm"
                  style={{ background: 'rgba(150,80,20,0.3)', border: '1px solid rgba(200,120,40,0.5)', borderRadius: '8px', color: '#FFEAA7', letterSpacing: '0.15em' }}>
                  点燃归炉协议
                </button>
              </div>
            </div>
          )}

          {/* 冥想呼吸阶段 */}
          {phase === 'breath' && (
            <div className="flex flex-col items-center gap-4 flex-1 justify-center">
              {/* 呼吸球 */}
              <div style={{
                width: `${100 * sphereScale}px`, height: `${100 * sphereScale}px`,
                borderRadius: '50%', background: sphereColor,
                boxShadow: `0 0 ${50 * sphereScale}px ${sphereColor}`,
                transition: 'all 0.5s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em' }}>{breathLabel}</p>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(180,120,50,0.7)', letterSpacing: '0.1em' }}>
                {Math.floor(meditationSecs / 60)}:{String(meditationSecs % 60).padStart(2,'0')} · {breathConfig.desc}
              </p>
              <button onClick={endMeditation}
                className="px-6 py-2 text-sm"
                style={{ background: 'rgba(80,30,10,0.4)', border: '1px solid rgba(150,80,20,0.4)', borderRadius: '8px', color: 'rgba(200,120,50,0.8)', fontSize: '0.75rem' }}>
                结束冥想，凝结琥珀
              </button>
            </div>
          )}

          {/* 结晶阶段 */}
          {phase === 'crystal' && (
            <div className="flex flex-col items-center gap-4 flex-1 justify-center">
              <p style={{ color: '#FFEAA7', fontSize: '0.85rem', letterSpacing: '0.2em', textShadow: '0 0 12px rgba(255,200,100,0.5)' }}>
                感知琥珀已凝结
              </p>
              <div style={{
                width: meditationSecs >= 900 ? '80px' : meditationSecs >= 300 ? '56px' : '36px',
                height: meditationSecs >= 900 ? '80px' : meditationSecs >= 300 ? '56px' : '36px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, rgba(255,200,50,0.9), rgba(180,80,20,0.7))',
                boxShadow: '0 0 30px rgba(255,180,50,0.5), inset 0 0 15px rgba(255,220,100,0.3)',
                animation: 'breathe 3s ease-in-out infinite',
              }}/>
              <p style={{ color: 'rgba(200,150,50,0.7)', fontSize: '0.72rem' }}>
                {meditationSecs < 300 ? '微小暖橙琥珀' : meditationSecs < 900 ? '饱满琥珀橙结晶' : '深琥珀球·已存入年轮'}
              </p>
              <p style={{ color: 'rgba(200,130,50,0.6)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                阿南：「{meditationSecs >= 900 ? '这一炉，烧得透。' : meditationSecs >= 300 ? '不错，柴已够用。' : '小火也是火，回来就好。'}」
              </p>
              <button onClick={() => setPhase('idle')}
                className="px-6 py-2 text-sm mt-2"
                style={{ background: 'rgba(150,80,20,0.2)', border: '1px solid rgba(200,120,40,0.4)', borderRadius: '8px', color: '#FFEAA7', fontSize: '0.78rem' }}>
                返回炉边
              </button>
            </div>
          )}

          {/* 灰烬回收站 */}
          {phase === 'idle' && ashCount > 0 && (
            <div className="absolute bottom-4 right-4">
              <button onClick={() => setAshCount(0)}
                className="px-3 py-1.5 text-xs"
                style={{ background: 'rgba(40,20,10,0.7)', border: '1px solid rgba(100,60,20,0.4)', borderRadius: '6px', color: 'rgba(150,100,40,0.7)', fontSize: '0.65rem' }}>
                清灰 ({ashCount} 坚韧值)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
