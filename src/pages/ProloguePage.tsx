import React, { useEffect, useState, useCallback } from 'react';
import { startHeartbeat, stopHeartbeat, playBreakSound, resumeAudio } from '@/lib/audio';

interface PrologueProps {
  onComplete: () => void;
}

const LINES = [
  { text: ['', '2147', '年，大静默时代已持续了半个世纪。'], highlight: 1 },
  { text: ['吞噬记忆的灰雾覆盖了地表，四季不再轮转。'], highlight: -1 },
  { text: ['这是0号种子库——文明最后的情绪避难所。'], highlight: -1 },
  { text: ['而现在，源核的火光即将熄灭……'], highlight: -1, emerald: true },
];

export default function ProloguePage({ onComplete }: PrologueProps) {
  const [phase, setPhase] = useState<'init' | 'typing' | 'prompt' | 'burst'>('init');
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>(['', '', '', '']);
  const [promptVisible, setPromptVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // 雾气粒子
  const fogParticles = Array.from({ length: 20 }, (_, i) => i);

  const handleClick = useCallback(() => {
    if (phase === 'burst' || hasInteracted) return;
    if (phase !== 'prompt' && phase !== 'typing') return;
    setHasInteracted(true);
    resumeAudio();
    playBreakSound();
    setPhase('burst');
    setTimeout(() => {
      stopHeartbeat();
      onComplete();
    }, 900);
  }, [phase, hasInteracted, onComplete]);

  useEffect(() => {
    const t = setTimeout(() => {
      resumeAudio();
      startHeartbeat();
      setPhase('typing');
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // 打字机逻辑
  useEffect(() => {
    if (phase !== 'typing') return;
    if (lineIndex >= LINES.length) {
      setPromptVisible(true);
      setPhase('prompt');
      return;
    }

    const line = LINES[lineIndex];
    const fullText = line.text.join('');

    if (charIndex < fullText.length) {
      const t = setTimeout(() => {
        setDisplayedLines(prev => {
          const next = [...prev];
          next[lineIndex] = fullText.slice(0, charIndex + 1);
          return next;
        });
        setCharIndex(c => c + 1);
      }, 60);
      return () => clearTimeout(t);
    } else {
      // 当前行打完，停顿后进入下一行
      const t = setTimeout(() => {
        setLineIndex(l => l + 1);
        setCharIndex(0);
      }, lineIndex < LINES.length - 1 ? 2500 : 1200);
      return () => clearTimeout(t);
    }
  }, [phase, lineIndex, charIndex]);

  const renderLine = (lineIdx: number) => {
    const line = LINES[lineIdx];
    const text = displayedLines[lineIdx];
    if (!text) return null;

    if (line.emerald) {
      return (
        <span style={{ color: '#2ECC71', textShadow: '0 0 20px rgba(46,204,113,0.8)', animation: lineIdx === 3 && text.length > 5 ? 'pulse-glow 1s ease infinite' : 'none' }}>
          {text}
        </span>
      );
    }
    if (line.highlight === 1 && text.length >= 4) {
      const before = text.slice(0, 0);
      const hi = text.slice(0, Math.min(4, text.length));
      const after = text.slice(4);
      return (
        <>
          {before}
          <span style={{ color: '#E0F2F1', textShadow: '0 0 20px rgba(224,242,241,0.9)' }}>{hi}</span>
          {after}
        </>
      );
    }
    return <span>{text}</span>;
  };

  return (
    <div
      className="fullscreen flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{
        background: phase === 'burst'
          ? 'radial-gradient(circle at center, rgba(224,242,241,1) 0%, rgba(46,204,113,0.8) 30%, #0D1B1E 70%)'
          : 'linear-gradient(to top, #0D1B1E 0%, #000000 100%)',
        transition: phase === 'burst' ? 'background 0.8s ease' : 'background 3s ease',
      }}
      onClick={handleClick}
    >
      {/* 雾气粒子 */}
      {fogParticles.map(i => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${80 + i * 30}px`,
            height: `${40 + i * 15}px`,
            background: `rgba(${30 + i * 3}, ${20 + i * 2}, ${35 + i * 2}, ${0.3 + i * 0.02})`,
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            filter: 'blur(20px)',
            animation: `fog-crawl ${6 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* 边缘暗角 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)'
      }} />

      {/* 爆发光效 */}
      {phase === 'burst' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, rgba(224,242,241,0.9) 0%, rgba(46,204,113,0.6) 20%, transparent 60%)',
          animation: 'fadeIn 0.3s ease forwards',
        }} />
      )}

      {/* 文案区域 */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-2xl">
        {LINES.map((_, i) => (
          <p
            key={i}
            className="text-center leading-relaxed text-balance"
            style={{
              fontSize: i === 3 ? '1.3rem' : '1.1rem',
              color: 'rgba(224,242,241,0.85)',
              letterSpacing: '0.15em',
              fontWeight: 300,
              minHeight: '1.8rem',
              opacity: displayedLines[i] ? 1 : 0,
              transition: 'opacity 0.3s ease',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {renderLine(i)}
          </p>
        ))}
      </div>

      {/* 唤醒提示 */}
      {promptVisible && !hasInteracted && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20"
          style={{ animation: 'twinkle 2s ease-in-out infinite' }}
        >
          <span style={{
            color: '#A8E6CF',
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
            textShadow: '0 0 15px rgba(168,230,207,0.8)',
            fontWeight: 300,
          }}>
            ［ 点击任意处，唤醒源核 ］
          </span>
        </div>
      )}
    </div>
  );
}
