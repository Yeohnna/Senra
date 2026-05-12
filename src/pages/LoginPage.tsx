import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { playTypeSound, playBreakSound, resumeAudio } from '@/lib/audio';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [frostLevel, setFrostLevel] = useState(100); // 0-100
  const [glowing, setGlowing] = useState(false);
  const [awakening, setAwakening] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // 每敲一字，减少冰霜
  const handleKeyDown = () => {
    resumeAudio();
    playTypeSound();
    setFrostLevel(f => Math.max(0, f - 5));
    setGlowing(true);
    setTimeout(() => setGlowing(false), 300);
  };

  useEffect(() => {
    // 若长时间不输入，冰霜回升
    const t = setTimeout(() => {
      if (!loading) setFrostLevel(f => Math.min(100, f + 2));
    }, 3000);
    return () => clearTimeout(t);
  }, [name, password, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('请输入守林人代号和密钥');
      return;
    }
    setError('');
    setLoading(true);

    const fn = mode === 'login' ? signInWithUsername : signUpWithUsername;
    const { error: err } = await fn(name.trim(), password);

    if (err) {
      setError(mode === 'login' ? '代号或密钥不匹配，源核无法识别' : '此代号已被使用，请换一个');
      setLoading(false);
      setFrostLevel(80);
      return;
    }

    // 唤醒动画
    setFrostLevel(0);
    setAwakening(true);
    playBreakSound();
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  // 冰霜碎片数量
  const frostShards = Math.floor(frostLevel / 10);

  return (
    <div
      className="fullscreen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: awakening
          ? 'radial-gradient(circle at center, rgba(46,204,113,0.9) 0%, rgba(20,46,42,1) 60%)'
          : 'radial-gradient(ellipse at center, #142E2A 0%, #0D1B1E 70%, #000000 100%)',
        transition: awakening ? 'background 1s ease' : 'none',
      }}
    >
      {/* 背景星点 */}
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            background: '#A8E6CF',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: 0.4 + Math.random() * 0.5,
          }}
        />
      ))}

      {/* Slogan */}
      <p className="relative z-10 mb-10 text-center glow-text-mist" style={{
        fontSize: '0.95rem',
        letterSpacing: '0.3em',
        color: '#A8E6CF',
        fontWeight: 300,
        opacity: awakening ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}>
        在遗忘的尽头，为你留一盏灯。
      </p>

      {/* 光茧 */}
      <div className="relative z-10 flex flex-col items-center" style={{
        opacity: awakening ? 0 : 1,
        transform: awakening ? 'scale(1.3)' : 'scale(1)',
        transition: 'all 1s ease',
      }}>
        {/* 茧体 */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: '200px',
            height: '260px',
            animation: 'float-slow 6s ease-in-out infinite',
          }}
        >
          {/* 光茧 SVG */}
          <svg width="200" height="260" viewBox="0 0 200 260" className="absolute inset-0">
            {/* 茧发光背景 */}
            <defs>
              <radialGradient id="cocoonGrad" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#2ECC71" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#4ECDC4" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#142E2A" stopOpacity="0.05" />
              </radialGradient>
              <filter id="cocoonglow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* 茧体轮廓 */}
            <ellipse cx="100" cy="130" rx="70" ry="110" fill="url(#cocooonGrad)"
              stroke="rgba(78,205,196,0.4)" strokeWidth="1.5" filter="url(#cocoonglow)"
              style={{ fill: glowing ? 'rgba(46,204,113,0.2)' : 'rgba(20,46,42,0.6)', transition: 'fill 0.3s' }}
            />
            {/* 茧纹路 */}
            {[0, 1, 2, 3].map(i => (
              <ellipse key={i} cx="100" cy="130" rx={55 - i * 12} ry={90 - i * 18}
                fill="none" stroke="rgba(78,205,196,0.15)" strokeWidth="0.8"
              />
            ))}
            {/* 冰霜碎片 */}
            {Array.from({ length: frostShards }, (_, i) => {
              const angle = (i / frostShards) * Math.PI * 2;
              const r = 55 + Math.random() * 20;
              const x = 100 + Math.cos(angle) * r;
              const y = 130 + Math.sin(angle) * r * 1.4;
              return (
                <polygon key={i}
                  points={`${x},${y - 8} ${x + 5},${y + 4} ${x - 5},${y + 4}`}
                  fill="rgba(200,240,255,0.6)"
                  stroke="rgba(224,242,241,0.3)"
                  strokeWidth="0.5"
                  style={{ animation: `twinkle ${1 + i * 0.2}s ease infinite`, animationDelay: `${i * 0.1}s` }}
                />
              );
            })}
          </svg>

          {/* 微光（萤火虫）*/}
          <div className="absolute" style={{
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#A8E6CF',
            boxShadow: '0 0 15px rgba(168,230,207,0.8)',
            animation: glowing ? 'pulse-glow 0.3s ease' : 'twinkle 3s ease infinite',
          }} />
        </div>

        {/* 输入区 —— 光柱底座 */}
        <div className="mt-6 w-72">
          {/* 光柱装饰线 */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #2ECC71, transparent)',
            marginBottom: '16px',
            opacity: loading ? 1 : 0.6,
            boxShadow: '0 0 10px rgba(46,204,113,0.5)',
          }} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              ref={nameRef}
              type="text"
              placeholder="守林人代号"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
              className="w-full px-3 py-2 text-center text-sm outline-none"
              style={{
                background: 'rgba(20,46,42,0.7)',
                border: '1px solid rgba(78,205,196,0.4)',
                borderRadius: '6px',
                color: '#E0F2F1',
                fontSize: '0.9rem',
                letterSpacing: '0.15em',
              }}
            />
            <input
              type="password"
              placeholder="神经密钥"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={30}
              className="w-full px-3 py-2 text-center text-sm outline-none"
              style={{
                background: 'rgba(20,46,42,0.7)',
                border: '1px solid rgba(78,205,196,0.4)',
                borderRadius: '6px',
                color: '#E0F2F1',
                fontSize: '0.9rem',
                letterSpacing: '0.15em',
              }}
            />

            {error && (
              <p className="text-center text-xs" style={{ color: '#ff6b6b', textShadow: '0 0 8px rgba(255,107,107,0.5)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-2 text-sm transition-all"
              style={{
                background: loading ? 'rgba(46,204,113,0.3)' : 'rgba(46,204,113,0.2)',
                border: '1px solid rgba(46,204,113,0.6)',
                borderRadius: '6px',
                color: '#2ECC71',
                letterSpacing: '0.2em',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: loading ? '0 0 20px rgba(46,204,113,0.4)' : '0 0 10px rgba(46,204,113,0.2)',
              }}
            >
              {loading ? '唤醒中…' : mode === 'login' ? '唤醒源核' : '初始化守林人'}
            </button>
          </form>

          {/* 光柱装饰线 */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #2ECC71, transparent)',
            marginTop: '16px',
            opacity: 0.6,
          }} />

          <p className="text-center mt-3 text-xs cursor-pointer"
            style={{ color: 'rgba(168,230,207,0.6)', letterSpacing: '0.1em' }}
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? '首次连接？注册守林人代号' : '已有代号？连接记忆网络'}
          </p>
        </div>
      </div>

      {/* 唤醒光爆 */}
      {awakening && (
        <div className="absolute inset-0 pointer-events-none z-20" style={{
          background: 'radial-gradient(circle at center, rgba(224,242,241,1) 0%, rgba(46,204,113,0.8) 30%, transparent 70%)',
          animation: 'fadeIn 0.6s ease forwards',
        }} />
      )}
    </div>
  );
}
