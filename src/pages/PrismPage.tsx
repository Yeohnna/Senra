import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { playTypeSound, playBreakSound, playGrowSound, resumeAudio } from '@/lib/audio';
import ReturnButton from '@/components/ReturnButton';
import type { AppScreen, LightFragment } from '@/types/types';

interface PrismPageProps { navigateTo: (s: AppScreen) => void; }

const PROMPTS = [
  '信号捕获：今天你接触到最陌生的一个词是什么？',
  '系统警告：描述一个你一直想弄懂但没去查的概念',
  '雷达扫描：记录一句今天读到的，像刀一样锋利的话',
  '波动探测：有什么知识，你学了却总是记不住？',
];

const POETIC_EXPANSIONS = [
  '灰雾无法吞噬被命名的事物。',
  '每一个想法，都是阻挡灰雾的一盏灯。',
  '记录下来的瞬间，就不会真正消失。',
  '碎片也有碎片的力量。',
  '知道与不知道之间，只差一次思考的勇气。',
];

// 简单间隔重复：1天、3天、7天、14天、30天
function getNextReviewDays(reviewCount: number): number {
  const intervals = [1, 3, 7, 14, 30];
  return intervals[Math.min(reviewCount, intervals.length - 1)];
}

export default function PrismPage({ navigateTo }: PrismPageProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'inspire' | 'knowledge'>('inspire');
  const [inputText, setInputText] = useState('');
  const [backText, setBackText] = useState('');
  const [fragments, setFragments] = useState<LightFragment[]>([]);
  const [reviewItems, setReviewItems] = useState<LightFragment[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewInput, setReviewInput] = useState('');
  const [reviewCorrect, setReviewCorrect] = useState<boolean | null>(null);
  const [drops, setDrops] = useState<Array<{ id: string; x: number; correct: boolean }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [prompt] = useState(PROMPTS[new Date().getDay() % PROMPTS.length]);
  const [poeticResult, setPoeticResult] = useState('');
  const [corals, setCorals] = useState<Array<{ id: string; type: string; x: number; y: number }>>([]);

  const loadFragments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('light_fragments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setFragments(data as LightFragment[]);
      // 计算今日需复习的条目
      const today = new Date();
      const toReview = (data as LightFragment[]).filter(f => {
        if (f.fragment_type !== 'knowledge') return false;
        const lastReview = f.last_reviewed_at ? new Date(f.last_reviewed_at) : new Date(f.created_at);
        const daysSince = (today.getTime() - lastReview.getTime()) / 86400000;
        const nextDays = getNextReviewDays(f.review_count || 0);
        return daysSince >= nextDays;
      });
      setReviewItems(toReview);
    }
  }, [user]);

  useEffect(() => { loadFragments(); }, [loadFragments]);

  // 检测概念珊瑚生成
  useEffect(() => {
    const knowledge = fragments.filter(f => f.fragment_type === 'knowledge');
    if (knowledge.length >= 3) {
      const recent3 = knowledge.slice(0, 3);
      const hasNewCoral = corals.length < Math.floor(knowledge.length / 3);
      if (hasNewCoral) {
        setCorals(prev => [...prev, {
          id: crypto.randomUUID(),
          type: Math.random() > 0.5 ? 'code' : 'language',
          x: 20 + Math.random() * 60,
          y: 50 + Math.random() * 20,
        }]);
      }
    }
  }, [fragments, corals.length]);

  const handleSubmit = async () => {
    if (!inputText.trim() || !user || submitting) return;
    setSubmitting(true);
    resumeAudio();
    playBreakSound();
    setTimeout(() => playGrowSound(), 400);

    const fragmentType = mode === 'inspire' ? 'inspiration' : 'knowledge';
    await supabase.from('light_fragments').insert({
      user_id: user.id,
      front_text: inputText.trim(),
      back_text: mode === 'knowledge' ? backText.trim() : '',
      fragment_type: fragmentType,
      review_count: 0,
    });

    if (mode === 'inspire') {
      setPoeticResult(POETIC_EXPANSIONS[Math.floor(Math.random() * POETIC_EXPANSIONS.length)]);
      setTimeout(() => setPoeticResult(''), 4000);
    }

    // 水滴动画
    const drop = { id: crypto.randomUUID(), x: 40 + Math.random() * 20, correct: true };
    setDrops(d => [...d, drop]);
    setTimeout(() => setDrops(d => d.filter(x => x.id !== drop.id)), 2000);

    setInputText('');
    setBackText('');
    setSubmitting(false);
    loadFragments();
  };

  const handleReviewCheck = async () => {
    if (!reviewItems[reviewIndex] || !user) return;
    const item = reviewItems[reviewIndex];
    const isCorrect = reviewInput.trim().toLowerCase() === (item.back_text || '').trim().toLowerCase();
    setReviewCorrect(isCorrect);
    setShowAnswer(true);
    resumeAudio();
    if (isCorrect) playGrowSound(); else playTypeSound();

    // 更新复习记录
    await supabase.from('light_fragments').update({
      review_count: (item.review_count || 0) + 1,
      last_reviewed_at: new Date().toISOString(),
    }).eq('id', item.id);
  };

  const nextReview = () => {
    setShowAnswer(false);
    setReviewCorrect(null);
    setReviewInput('');
    setReviewIndex(i => i + 1);
  };

  const currentReview = reviewItems[reviewIndex];

  return (
    <div className="fullscreen relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0A1A2A 0%, #0D1B2E 50%, #0A2A2A 100%)' }}
    >
      <ReturnButton onClick={() => navigateTo('hub')} />

      {/* 水面效果 */}
      <div className="absolute w-full pointer-events-none z-0"
        style={{ top: '45%', height: '8px', background: 'linear-gradient(90deg, transparent, rgba(93,138,168,0.3), transparent)', filter: 'blur(2px)' }}/>
      <div className="absolute w-full pointer-events-none z-0"
        style={{ top: '45%', height: '4px', background: 'linear-gradient(90deg, transparent, rgba(93,138,168,0.5), transparent)', animation: 'wave-in 3s ease-in-out infinite' }}/>

      {/* 水底浮游生物 */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none z-0"
          style={{
            width: `${4 + i * 2}px`, height: `${4 + i * 2}px`,
            background: `rgba(93,138,168,${0.3 + i * 0.05})`,
            boxShadow: `0 0 ${6 + i * 2}px rgba(93,138,168,0.5)`,
            left: `${5 + i * 12}%`, top: `${55 + (i % 3) * 8}%`,
            animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}/>
      ))}

      {/* 概念珊瑚 */}
      {corals.map(c => (
        <div key={c.id} className="absolute pointer-events-none z-0"
          style={{ left: `${c.x}%`, top: `${c.y}%` }}>
          <svg width="40" height="50" viewBox="0 0 40 50">
            {c.type === 'code' ? (
              // 几何晶体（编程珊瑚）
              <>
                <polygon points="20,2 35,20 20,38 5,20" fill="none" stroke="rgba(0,77,64,0.8)" strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(78,205,196,0.5))' }}/>
                <polygon points="20,10 28,20 20,30 12,20" fill="rgba(0,77,64,0.4)" stroke="rgba(78,205,196,0.5)" strokeWidth="1"/>
              </>
            ) : (
              // 海葵（语言珊瑚）
              <>
                {[0,1,2,3,4].map(j => (
                  <path key={j} d={`M20,40 Q${10 + j * 5},${20 + j * 3} ${12 + j * 4},5`}
                    fill="none" stroke="rgba(93,138,168,0.6)" strokeWidth="1.5"
                    style={{ animation: `float ${2 + j * 0.3}s ease-in-out infinite`, animationDelay: `${j * 0.2}s` }}/>
                ))}
              </>
            )}
          </svg>
        </div>
      ))}

      {/* 惊蛰（折光页伙伴） */}
      <div className="absolute z-10 cursor-pointer" style={{ top: '42%', right: '60px' }}>
        <svg width="32" height="28" viewBox="0 0 32 28">
          <ellipse cx="16" cy="12" rx="12" ry="8" fill="rgba(100,40,160,0.4)" stroke="rgba(153,68,204,0.5)" strokeWidth="1"/>
          {[0,1,2].map(i => (
            <line key={i} x1={8+i*8} y1={12} x2={8+i*8} y2={26}
              stroke={`rgba(153,68,204,${0.5+i*0.15})`} strokeWidth="1.5"
              style={{ animation: `twinkle ${0.8+i*0.2}s ease infinite`, animationDelay: `${i*0.15}s` }}/>
          ))}
        </svg>
      </div>

      {/* 每日Prompt */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center w-80">
        <p style={{ fontSize: '0.7rem', color: 'rgba(93,138,168,0.6)', letterSpacing: '0.08em', fontStyle: 'italic' }}>{prompt}</p>
      </div>

      {/* 主体 */}
      <div className="absolute inset-0 flex flex-col z-10" style={{ paddingTop: '50px', paddingBottom: '20px' }}>

        {/* 模式切换 */}
        <div className="flex justify-center gap-3 mb-4">
          {[{k:'inspire' as const,label:'灵感水滴',c:'rgba(46,204,113,0.8)'},{k:'knowledge' as const,label:'知识珍珠',c:'rgba(224,242,241,0.8)'}].map(m => (
            <button key={m.k} onClick={() => setMode(m.k)}
              className="px-4 py-1.5 text-xs rounded-full transition-all"
              style={{
                background: mode === m.k ? 'rgba(20,46,42,0.8)' : 'transparent',
                border: `1px solid ${mode === m.k ? 'rgba(78,205,196,0.6)' : 'rgba(78,205,196,0.2)'}`,
                color: mode === m.k ? m.c : 'rgba(168,230,207,0.4)',
                letterSpacing: '0.1em',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* 输入区（水面上方） */}
        <div className="px-6 max-w-lg mx-auto w-full">
          <div className="flex flex-col gap-2">
            <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={() => { resumeAudio(); playTypeSound(); }}
              onKeyUp={e => e.key === 'Enter' && !backText && handleSubmit()}
              placeholder={mode === 'inspire' ? '记录一闪而过的想法、梦境、感受…' : '正面：词汇/概念'}
              className="w-full px-4 py-2.5 outline-none"
              style={{ background: 'rgba(10,26,42,0.8)', border: '1px solid rgba(93,138,168,0.3)', borderRadius: '8px', color: '#E0F2F1', fontSize: '0.88rem' }}/>
            {mode === 'knowledge' && (
              <input type="text" value={backText} onChange={e => setBackText(e.target.value)}
                onKeyDown={() => { resumeAudio(); playTypeSound(); }}
                onKeyUp={e => e.key === 'Enter' && handleSubmit()}
                placeholder="背面：解释/例句"
                className="w-full px-4 py-2.5 outline-none"
                style={{ background: 'rgba(10,26,42,0.8)', border: '1px solid rgba(93,138,168,0.25)', borderRadius: '8px', color: '#E0F2F1', fontSize: '0.88rem' }}/>
            )}
            <button onClick={handleSubmit} disabled={submitting || !inputText.trim()}
              className="py-2 text-sm"
              style={{ background: 'rgba(93,138,168,0.2)', border: '1px solid rgba(93,138,168,0.4)', borderRadius: '8px', color: 'rgba(224,242,241,0.8)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
              {mode === 'inspire' ? '投入水面' : '沉入水底'}
            </button>
          </div>

          {/* 灵感折射结果 */}
          {poeticResult && (
            <div className="mt-3 text-center" style={{ animation: 'slideFromBottom 0.3s ease' }}>
              <p style={{ color: '#FFEAA7', fontSize: '0.78rem', textShadow: '0 0 10px rgba(255,224,167,0.5)', letterSpacing: '0.1em', fontStyle: 'italic' }}>
                ⚡ {poeticResult}
              </p>
            </div>
          )}
        </div>

        {/* 分隔水面 */}
        <div className="my-4 mx-6" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(93,138,168,0.4), transparent)' }}/>

        {/* 潮汐复习区 */}
        {reviewItems.length > 0 && reviewIndex < reviewItems.length && (
          <div className="px-6 max-w-lg mx-auto w-full mb-4">
            <p style={{ fontSize: '0.65rem', color: 'rgba(93,138,168,0.7)', letterSpacing: '0.15em', marginBottom: '8px', textAlign: 'center' }}>
              ～ 潮汐复习 {reviewIndex + 1}/{reviewItems.length} ～
            </p>
            {currentReview && (
              <div className="glass-panel px-4 py-3 rounded-xl"
                style={{ borderColor: 'rgba(93,138,168,0.3)', animation: 'float 3s ease-in-out infinite' }}>
                <p style={{ fontSize: '0.85rem', color: '#E0F2F1', marginBottom: '8px', textAlign: 'center' }}>
                  {currentReview.front_text}
                </p>
                {!showAnswer ? (
                  <div className="flex gap-2">
                    <input type="text" value={reviewInput} onChange={e => setReviewInput(e.target.value)}
                      onKeyUp={e => e.key === 'Enter' && handleReviewCheck()}
                      placeholder="默写背面内容…"
                      className="flex-1 px-3 py-1.5 outline-none"
                      style={{ background: 'rgba(10,26,42,0.6)', border: '1px solid rgba(93,138,168,0.3)', borderRadius: '6px', color: '#E0F2F1', fontSize: '0.82rem' }}/>
                    <button onClick={handleReviewCheck}
                      style={{ padding: '6px 12px', background: 'rgba(93,138,168,0.2)', border: '1px solid rgba(93,138,168,0.4)', borderRadius: '6px', color: 'rgba(224,242,241,0.8)', fontSize: '0.78rem' }}>
                      确认
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.78rem', color: reviewCorrect ? '#2ECC71' : 'rgba(255,150,150,0.8)', marginBottom: '4px', textAlign: 'center', textShadow: reviewCorrect ? '0 0 8px rgba(46,204,113,0.5)' : 'none' }}>
                      {reviewCorrect ? '✓ 正确！珍珠在成长…' : '✗ 正确答案：'}
                    </p>
                    {!reviewCorrect && (
                      <p style={{ fontSize: '0.82rem', color: '#E0F2F1', textAlign: 'center', marginBottom: '8px' }}>
                        {currentReview.back_text}
                      </p>
                    )}
                    <button onClick={nextReview} className="w-full py-1.5 text-xs"
                      style={{ background: 'rgba(93,138,168,0.15)', border: '1px solid rgba(93,138,168,0.3)', borderRadius: '6px', color: 'rgba(224,242,241,0.7)' }}>
                      下一条
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 已记录碎片（水底珍珠列表） */}
        <div className="flex-1 overflow-y-auto px-6 max-w-lg mx-auto w-full">
          <div className="flex flex-wrap gap-2">
            {fragments.map(f => (
              <div key={f.id} className="px-3 py-1.5 rounded-full cursor-default"
                style={{
                  background: f.fragment_type === 'inspiration' ? 'rgba(46,204,113,0.1)' : 'rgba(93,138,168,0.1)',
                  border: `1px solid ${f.fragment_type === 'inspiration' ? 'rgba(46,204,113,0.3)' : 'rgba(93,138,168,0.3)'}`,
                  fontSize: '0.75rem',
                  color: f.fragment_type === 'inspiration' ? 'rgba(168,230,207,0.8)' : 'rgba(224,242,241,0.7)',
                  animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                }}>
                {f.front_text.slice(0, 20)}{f.front_text.length > 20 ? '…' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 水滴动画 */}
      {drops.map(d => (
        <div key={d.id} className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: '10px', height: '10px',
            background: d.correct ? 'rgba(46,204,113,0.8)' : 'rgba(93,138,168,0.8)',
            boxShadow: `0 0 12px ${d.correct ? 'rgba(46,204,113,0.5)' : 'rgba(93,138,168,0.5)'}`,
            left: `${d.x}%`,
            top: '30%',
            animation: 'spore-fall 1.5s ease forwards',
          }}/>
      ))}
    </div>
  );
}
