import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { playTypeSound, playGrowSound, playWormSound, startHeartbeat, stopHeartbeat, resumeAudio } from '@/lib/audio';
import ReturnButton from '@/components/ReturnButton';
import type { AppScreen, DiaryEntry } from '@/types/types';

interface HeartSoilProps { navigateTo: (s: AppScreen) => void; }

const DAILY_PROMPTS = [
  '系统警告：描述一个你最想躲雨的虚构屋檐',
  '信号捕捉：今天有什么微小的东西让你觉得活着真好？',
  '深海波动：如果今天有一种颜色，是什么颜色？',
  '孢子扫描：最近最让你安心的一件小事是什么？',
  '神经连接：有什么话，你想说给过去的自己听？',
];

const EMOTION_PLANTS: Record<string, { name: string; color: string; desc: string }> = {
  happy: { name: '呼吸草', color: '#A8E6CF', desc: '随源核呼吸膨胀收缩' },
  sad: { name: '泪滴铃兰', color: '#5D8AA8', desc: '偶尔滴落光珠' },
  angry: { name: '摇曳风铃', color: '#FFEAA7', desc: '鼠标划过发出合成音' },
  calm: { name: '呼吸草', color: '#A8E6CF', desc: '随源核呼吸膨胀收缩' },
};

function detectEmotion(text: string): string {
  const lc = text.toLowerCase();
  if (['开心', '高兴', '哈哈', '棒', '喜欢', '爱', '快乐'].some(k => lc.includes(k))) return 'happy';
  if (['难过', '哭', '伤心', '失落', '痛', '泪', '委屈'].some(k => lc.includes(k))) return 'sad';
  if (['气', '烦', '愤怒', '恨', '讨厌', '火大'].some(k => lc.includes(k))) return 'angry';
  return 'calm';
}

export default function HeartSoilPage({ navigateTo }: HeartSoilProps) {
  const { user } = useAuth();
  const [shortText, setShortText] = useState('');
  const [longText, setLongText] = useState('');
  const [showLong, setShowLong] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [plants, setPlants] = useState<Array<{ emotion: string; id: string; x: number }>>([]);
  const [drops, setDrops] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [prompt] = useState(DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length]);
  const [fogAttack, setFogAttack] = useState(false);
  const [fogKeys, setFogKeys] = useState(0);
  const [sonarsActive, setSonarsActive] = useState(false);
  const [sonarsResult, setSonarsResult] = useState<DiaryEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coreGlow, setCoreGlow] = useState(false);
  const shortRef = useRef<HTMLInputElement>(null);

  // 获取历史日记
  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setEntries(data as DiaryEntry[]);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // 随机触发灰雾潮汐（3分钟没有记录）
  useEffect(() => {
    const t = setTimeout(() => setFogAttack(true), 3 * 60 * 1000);
    return () => clearTimeout(t);
  }, [entries]);

  // 灰雾被击退
  useEffect(() => {
    if (fogKeys >= 20 && fogAttack) {
      setFogAttack(false);
      setFogKeys(0);
    }
  }, [fogKeys, fogAttack]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    resumeAudio();
    playTypeSound();
    if (fogAttack) setFogKeys(k => k + 1);
    // 淡出冰霜
    setCoreGlow(true);
    setTimeout(() => setCoreGlow(false), 500);
  };

  // 提交短日记
  const submitShort = async () => {
    if (!shortText.trim() || !user || submitting) return;
    setSubmitting(true);
    resumeAudio();
    playGrowSound();
    const emotion = detectEmotion(shortText);
    const { data } = await supabase.from('diary_entries').insert({
      user_id: user.id,
      content: shortText.trim(),
      entry_type: 'short',
      emotion,
      word_count: shortText.length,
    }).select().maybeSingle();
    if (data) {
      setEntries(prev => [data as DiaryEntry, ...prev]);
      // 晨露滴落动画
      const newDrop = { id: crypto.randomUUID(), x: 40 + Math.random() * 20, y: 0 };
      setDrops(d => [...d, newDrop]);
      setTimeout(() => setDrops(d => d.filter(x => x.id !== newDrop.id)), 2000);
    }
    setShortText('');
    setFogAttack(false);
    setSubmitting(false);
    loadEntries();
  };

  // 提交长日记
  const submitLong = async () => {
    if (!longText.trim() || !user || submitting) return;
    setSubmitting(true);
    resumeAudio();
    playGrowSound();
    startHeartbeat();
    setTimeout(() => stopHeartbeat(), 2000);
    const emotion = detectEmotion(longText);
    const { data } = await supabase.from('diary_entries').insert({
      user_id: user.id,
      content: longText.trim(),
      entry_type: 'long',
      emotion,
      word_count: longText.length,
    }).select().maybeSingle();
    if (data) {
      setEntries(prev => [data as DiaryEntry, ...prev]);
      // 生成情绪植物
      setPlants(p => [...p, { emotion, id: crypto.randomUUID(), x: 20 + Math.random() * 60 }]);
    }
    setLongText('');
    setShowLong(false);
    setSubmitting(false);
    loadEntries();
  };

  // 情绪声纳
  const triggerSonar = (filter: 'sad' | 'happy' | 'angry') => {
    resumeAudio();
    playWormSound();
    setSonarsActive(true);
    const match = entries.find(e => e.emotion === filter);
    setSonarsResult(match || null);
    setTimeout(() => setSonarsActive(false), 2000);
  };

  return (
    <div className="fullscreen relative overflow-hidden"
      style={{ background: 'linear-gradient(to top, #0D1B1E 0%, #0A1F1C 100%)' }}
    >
      <ReturnButton onClick={() => navigateTo('hub')} />

      {/* 飘落孢子 */}
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: '3px', height: '3px', background: '#A8E6CF',
            left: `${i * 7}%`, top: '-10px', opacity: 0.4,
            animation: `spore-fall ${12 + i * 1.2}s linear infinite`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}

      {/* 灰雾潮汐 */}
      {fogAttack && (
        <div className="absolute inset-0 pointer-events-none z-30"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(50,0,80,0.5) 100%)', animation: 'fog-crawl 2s ease-in-out infinite' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="absolute rounded pointer-events-none"
              style={{
                width: '40px', height: '80px', background: 'rgba(50,0,80,0.6)',
                left: `${i * 13}%`, top: `${20 + (i % 3) * 20}%`,
                filter: 'blur(8px)',
                animation: `fog-crawl ${3 + i * 0.5}s ease-in-out infinite`,
              }}/>
          ))}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center z-40">
            <p style={{ color: '#ff88ff', fontSize: '0.75rem', textShadow: '0 0 10px rgba(255,100,255,0.6)' }}>
              灰雾来袭！疯狂输入文字击退它！({fogKeys}/20)
            </p>
          </div>
        </div>
      )}

      {/* 中央源核 */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '120px' }}>
        <div className="cursor-pointer" onDoubleClick={() => setShowLong(true)}
          style={{ animation: 'breathe 4s ease-in-out infinite' }}>
          <svg width="130" height="170" viewBox="0 0 130 170">
            <defs>
              <radialGradient id="hsGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#E0F2F1" stopOpacity="0.9"/>
                <stop offset="40%" stopColor="#2ECC71" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#A8E6CF" stopOpacity="0.3"/>
              </radialGradient>
              <filter id="hsglow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {/* 根系 */}
            {[[-25,8],[-12,10],[0,12],[12,10],[25,8]].map(([dx],i) => (
              <path key={i} d={`M65,155 Q${65+dx},${168+i} ${65+dx*1.8},${175+i}`}
                fill="none" stroke="rgba(46,204,113,0.4)" strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 3px rgba(46,204,113,0.3))' }}/>
            ))}
            {/* 光晕 */}
            <ellipse cx="65" cy="80" rx="55" ry="72" fill="rgba(46,204,113,0.05)"
              style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}/>
            {/* 主体 */}
            <path d="M65 12 C92 12 108 44 108 76 C108 114 92 152 65 160 C38 152 22 114 22 76 C22 44 38 12 65 12Z"
              fill={coreGlow ? "rgba(46,204,113,0.9)" : "url(#hsGrad)"} filter="url(#hsglow)"
              style={{ transition: 'fill 0.3s' }}/>
            {/* 内部心脏 */}
            <circle cx="65" cy="80" r="8" fill="rgba(224,242,241,0.5)"
              style={{ animation: 'breathe 1.8s ease-in-out infinite' }}/>
            {/* 年轮 */}
            {[0,1,2].map(i => (
              <ellipse key={i} cx="65" cy="80" rx={22 - i * 7} ry={28 - i * 8}
                fill="none" stroke="rgba(224,242,241,0.15)" strokeWidth="0.8"/>
            ))}
          </svg>
          <p className="text-center mt-1" style={{ fontSize: '0.6rem', color: 'rgba(168,230,207,0.5)', letterSpacing: '0.15em' }}>双击唤出深根协议</p>
        </div>
      </div>

      {/* 织梦虫 */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="absolute z-10 pointer-events-none"
          style={{
            left: `${30 + i * 20}%`, bottom: `${140 + i * 10}px`,
            animation: `worm-crawl ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}>
          <svg width="20" height="8" viewBox="0 0 20 8">
            {[0,1,2,3].map(j => (
              <ellipse key={j} cx={3 + j * 5} cy="4" rx="2.5" ry="3"
                fill={`rgba(${40 + i * 10},${160 + i * 15},${80 + j * 10},0.8)`}
                style={{ filter: 'drop-shadow(0 0 3px rgba(46,204,113,0.4))' }}/>
            ))}
          </svg>
        </div>
      ))}

      {/* 晨露滴落 */}
      {drops.map(d => (
        <div key={d.id} className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: '8px', height: '8px',
            background: 'rgba(224,242,241,0.8)',
            boxShadow: '0 0 10px rgba(224,242,241,0.5)',
            left: `${d.x}%`, top: '70%',
            animation: 'spore-fall 1.5s ease forwards',
          }}/>
      ))}

      {/* 情绪植物 */}
      <div className="absolute z-10" style={{ bottom: '130px', left: 0, right: 0, height: '60px' }}>
        {plants.slice(-6).map((p, i) => {
          const plant = EMOTION_PLANTS[p.emotion] || EMOTION_PLANTS.calm;
          return (
            <div key={p.id} className="absolute" style={{ left: `${p.x}%`, bottom: 0 }}>
              <svg width="30" height="50" viewBox="0 0 30 50">
                <line x1="15" y1="50" x2="15" y2="20" stroke={plant.color} strokeWidth="1.5" opacity="0.7"/>
                <ellipse cx="15" cy="18" rx="8" ry="12" fill={plant.color} opacity="0.5"
                  style={{ animation: `breathe ${2 + i * 0.3}s ease-in-out infinite` }}/>
              </svg>
            </div>
          );
        })}
      </div>

      {/* 情绪声纳 */}
      <div className="absolute right-16 top-1/3 z-10 flex flex-col gap-2">
        <p style={{ fontSize: '0.6rem', color: 'rgba(168,230,207,0.5)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '4px' }}>声纳</p>
        {[{k: 'sad' as const, label:'悲', c:'#5D8AA8'},{k:'happy' as const,label:'喜',c:'#2ECC71'},{k:'angry' as const,label:'怒',c:'#FFEAA7'}].map(s => (
          <button key={s.k} onClick={() => triggerSonar(s.k)}
            className="w-9 h-9 rounded-full text-xs"
            style={{ background: `rgba(${s.c === '#5D8AA8' ? '93,138,168' : s.c === '#2ECC71' ? '46,204,113' : '255,224,167'},0.15)`, border: `1px solid ${s.c}40`, color: s.c }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* 声纳结果 */}
      {sonarsActive && sonarsResult && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: '40%', animation: 'slideFromBottom 0.3s ease' }}>
          <div className="glass-panel px-4 py-3 max-w-xs">
            <p style={{ fontSize: '0.75rem', color: 'rgba(168,230,207,0.85)', lineHeight: 1.7 }}>
              {new Date(sonarsResult.created_at).toLocaleDateString()}<br/>
              {sonarsResult.content.slice(0, 60)}{sonarsResult.content.length > 60 ? '…' : ''}
            </p>
          </div>
        </div>
      )}

      {/* 每日Prompt */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center w-72">
        <p style={{ fontSize: '0.7rem', color: 'rgba(168,230,207,0.45)', letterSpacing: '0.08em', fontStyle: 'italic' }}>{prompt}</p>
      </div>

      {/* 历史日记条目（右侧列表） */}
      <div className="absolute right-2 top-16 z-10 flex flex-col gap-2" style={{ maxWidth: '130px' }}>
        {entries.slice(0, 5).map(e => (
          <div key={e.id} className="px-2 py-1.5 rounded"
            style={{ background: 'rgba(20,46,42,0.7)', border: '1px solid rgba(78,205,196,0.15)', cursor: 'default' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(168,230,207,0.7)', lineHeight: 1.5 }}>
              {e.content.slice(0, 30)}{e.content.length > 30 ? '…' : ''}
            </p>
            <p style={{ fontSize: '0.55rem', color: 'rgba(78,205,196,0.4)', marginTop: '2px' }}>
              {new Date(e.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* 底部：露水协议（短日记）*/}
      <div className="absolute bottom-4 left-16 right-4 z-20">
        <div className="flex gap-2 items-center px-2 py-1.5 rounded-full"
          style={{ background: 'rgba(20,46,42,0.85)', border: '1px solid rgba(78,205,196,0.25)', backdropFilter: 'blur(10px)' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(168,230,207,0.5)', whiteSpace: 'nowrap', paddingLeft: '4px' }}>晨露·</span>
          <input
            ref={shortRef}
            type="text"
            value={shortText}
            onChange={e => shortText.length < 50 && setShortText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={e => e.key === 'Enter' && submitShort()}
            placeholder={`${50 - shortText.length}字 · Enter提交`}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#E0F2F1', fontSize: '0.85rem' }}
            maxLength={50}
          />
          <button onClick={submitShort} disabled={submitting || !shortText.trim()}
            className="px-3 py-1 text-xs rounded-full transition-all"
            style={{ background: shortText.trim() ? 'rgba(46,204,113,0.3)' : 'transparent', border: '1px solid rgba(46,204,113,0.3)', color: '#2ECC71', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
            {submitting ? '…' : '滴落'}
          </button>
        </div>
      </div>

      {/* 深根协议：长日记 */}
      {showLong && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg mx-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span style={{ color: '#A8E6CF', fontSize: '0.85rem', letterSpacing: '0.15em' }}>◈ 深根协议 ◈</span>
              <button onClick={() => setShowLong(false)} style={{ color: 'rgba(168,230,207,0.5)', fontSize: '1.2rem' }}>×</button>
            </div>
            {/* 源核轮廓 */}
            <div className="absolute left-1/2 -translate-x-1/2 top-10 opacity-10 pointer-events-none">
              <svg width="200" height="260" viewBox="0 0 200 260">
                <path d="M100 20 C140 20 166 66 166 118 C166 176 142 236 100 248 C58 236 34 176 34 118 C34 66 60 20 100 20Z"
                  fill="none" stroke="#2ECC71" strokeWidth="2"/>
              </svg>
            </div>
            <textarea
              value={longText}
              onChange={e => setLongText(e.target.value)}
              onKeyDown={() => { resumeAudio(); playTypeSound(); }}
              placeholder="让文字化作翡翠光流，流入源核深处……"
              className="w-full h-64 px-4 py-3 resize-none outline-none"
              style={{
                background: 'rgba(10,30,25,0.9)',
                border: '1px solid rgba(46,204,113,0.3)',
                borderRadius: '12px',
                color: '#E0F2F1',
                fontSize: '0.9rem',
                lineHeight: 1.8,
                backdropFilter: 'blur(10px)',
              }}
            />
            <div className="flex justify-between items-center">
              <span style={{ fontSize: '0.7rem', color: 'rgba(168,230,207,0.4)' }}>{longText.length} 字</span>
              <button onClick={submitLong} disabled={submitting || !longText.trim()}
                className="px-6 py-2 text-sm"
                style={{ background: 'rgba(46,204,113,0.2)', border: '1px solid rgba(46,204,113,0.5)', borderRadius: '8px', color: '#2ECC71', letterSpacing: '0.1em' }}>
                {submitting ? '注入中…' : '注入源核根部'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
