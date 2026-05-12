import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { playMergeSound, playBreakSound, resumeAudio } from '@/lib/audio';
import ReturnButton from '@/components/ReturnButton';
import type { AppScreen } from '@/types/types';

interface GeneFoldingProps { navigateTo: (s: AppScreen) => void; }

// 进化链：叹息→晨露→嫩芽→花苞→幻影花→记忆果实→永恒之种
const SEED_NAMES = ['叹息', '晨露', '嫩芽', '花苞', '幻影花', '记忆果实', '永恒之种'];
const SEED_COLORS = [
  'rgba(80,80,100,0.7)',      // 叹息 - 灰
  'rgba(93,138,168,0.8)',     // 晨露 - 雾霭蓝
  'rgba(46,150,80,0.8)',      // 嫩芽 - 嫩绿
  'rgba(46,204,113,0.85)',    // 花苞 - 翡翠绿
  'rgba(168,230,207,0.9)',    // 幻影花 - 柔雾绿
  'rgba(255,224,167,0.9)',    // 记忆果实 - 极淡柠檬黄
  'rgba(224,242,241,1)',      // 永恒之种 - 极光白绿
];
const SEED_GLOW = [
  'none',
  '0 0 8px rgba(93,138,168,0.5)',
  '0 0 10px rgba(46,150,80,0.5)',
  '0 0 12px rgba(46,204,113,0.6)',
  '0 0 15px rgba(168,230,207,0.7)',
  '0 0 18px rgba(255,224,167,0.7)',
  '0 0 24px rgba(224,242,241,0.9)',
];

const SEED_VALUES = [2, 4, 8, 16, 32, 64, 128];

type Cell = { value: number; id: string; merged?: boolean; isNew?: boolean };
type Board = (Cell | null)[][];

function createEmptyBoard(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(null));
}

function addRandomTile(board: Board): Board {
  const empties: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!board[r][c]) empties.push([r, c]);
  if (empties.length === 0) return board;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = { value: 2, id: crypto.randomUUID(), isNew: true };
  return newBoard;
}

function slideRow(row: (Cell | null)[]): { row: (Cell | null)[]; score: number; merged: boolean } {
  const tiles = row.filter(Boolean) as Cell[];
  const result: Cell[] = [];
  let score = 0;
  let merged = false;
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      const newVal = tiles[i].value * 2;
      result.push({ value: newVal, id: crypto.randomUUID(), merged: true });
      score += newVal;
      merged = true;
      i += 2;
    } else {
      result.push({ ...tiles[i], merged: false, isNew: false });
      i++;
    }
  }
  while (result.length < 4) result.push(null as any);
  return { row: result, score, merged };
}

function moveLeft(board: Board): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newBoard = board.map(row => {
    const { row: newRow, score, merged } = slideRow(row);
    totalScore += score;
    if (merged || row.some((c, i) => (c?.value !== newRow[i]?.value))) moved = true;
    return newRow;
  });
  // check actually moved
  const didMove = board.some((row, r) => row.some((c, col) => c?.value !== newBoard[r][col]?.value));
  return { board: newBoard, score: totalScore, moved: didMove };
}

function rotateClockwise(board: Board): Board {
  return Array(4).fill(null).map((_, r) =>
    Array(4).fill(null).map((_, c) => board[3 - c][r])
  );
}

function move(board: Board, direction: 'left' | 'right' | 'up' | 'down'): { board: Board; score: number; moved: boolean } {
  let b = board;
  let rotations = 0;
  if (direction === 'right') { b = rotateClockwise(rotateClockwise(b)); rotations = 2; }
  else if (direction === 'up') { b = rotateClockwise(rotateClockwise(rotateClockwise(b))); rotations = 3; }
  else if (direction === 'down') { b = rotateClockwise(b); rotations = 1; }

  const { board: moved, score, moved: didMove } = moveLeft(b);
  let result = moved;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateClockwise(result);
  return { board: result, score, moved: didMove };
}

function getMaxTile(board: Board): number {
  let max = 0;
  board.forEach(row => row.forEach(c => { if (c && c.value > max) max = c.value; }));
  return max;
}

function isGameOver(board: Board): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!board[r][c]) return false;
      if (c < 3 && board[r][c]?.value === board[r][c + 1]?.value) return false;
      if (r < 3 && board[r][c]?.value === board[r + 1][c]?.value) return false;
    }
  return true;
}

function seedIndex(value: number): number {
  return Math.min(Math.log2(value) - 1, SEED_NAMES.length - 1);
}

export default function GeneFoldingPage({ navigateTo }: GeneFoldingProps) {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board>(() => addRandomTile(addRandomTile(createEmptyBoard())));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [glowCell, setGlowCell] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return;
    resumeAudio();
    setBoard(prev => {
      const { board: newBoard, score: gained, moved } = move(prev, dir);
      if (!moved) return prev;
      playMergeSound();
      const withNew = addRandomTile(newBoard);
      setScore(s => {
        const next = s + gained;
        setBestScore(b => Math.max(b, next));
        return next;
      });
      if (gained > 0) {
        // find merged cell
        withNew.forEach(row => row.forEach(c => {
          if (c?.merged) { setGlowCell(c.id); setTimeout(() => setGlowCell(null), 600); }
        }));
      }
      if (getMaxTile(withNew) >= 128) {
        setWon(true);
        playBreakSound();
      }
      if (isGameOver(withNew)) setGameOver(true);
      return withNew;
    });
  }, [gameOver]);

  // 键盘控制
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      if (map[e.key]) { e.preventDefault(); handleMove(map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) handleMove(dx > 0 ? 'right' : 'left');
    else handleMove(dy > 0 ? 'down' : 'up');
    touchStartRef.current = null;
  };

  const restart = () => {
    setBoard(addRandomTile(addRandomTile(createEmptyBoard())));
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  const saveScore = async () => {
    if (!user || score === 0) return;
    const maxTile = getMaxTile(board);
    const fragments = Math.floor(score / 100);
    await supabase.from('game_scores').insert({ user_id: user.id, score, max_tile: maxTile, star_fragments: fragments });
    // 更新 profile star_fragments
    const { data: profile } = await supabase.from('profiles').select('star_fragments').eq('id', user.id).maybeSingle();
    if (profile) {
      await supabase.from('profiles').update({ star_fragments: (profile.star_fragments || 0) + fragments }).eq('id', user.id);
    }
  };

  useEffect(() => {
    if (gameOver && score > 0) saveScore();
  }, [gameOver]);

  return (
    <div className="fullscreen relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, #0D1B1E 0%, #142E2A 100%)' }}
    >
      <ReturnButton onClick={() => navigateTo('hub')} />

      {/* 标题 */}
      <div className="text-center mb-4 mt-8">
        <h1 style={{ fontSize: '1.1rem', color: '#A8E6CF', letterSpacing: '0.3em', textShadow: '0 0 12px rgba(168,230,207,0.5)', fontWeight: 300 }}>
          基因折叠
        </h1>
        <p style={{ fontSize: '0.65rem', color: 'rgba(168,230,207,0.4)', letterSpacing: '0.1em', marginTop: '2px' }}>
          合并情绪种子，滋养永恒之种
        </p>
      </div>

      {/* 分数 */}
      <div className="flex gap-6 mb-4">
        {[{ label: '当前得分', val: score }, { label: '最高得分', val: bestScore }].map(s => (
          <div key={s.label} className="text-center px-4 py-2 rounded-lg"
            style={{ background: 'rgba(20,46,42,0.7)', border: '1px solid rgba(78,205,196,0.2)', minWidth: '80px' }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(168,230,207,0.5)', letterSpacing: '0.1em' }}>{s.label}</p>
            <p style={{ fontSize: '1rem', color: '#E0F2F1', fontWeight: 300 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* 游戏板 */}
      <div
        className="relative select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ padding: '8px', background: 'rgba(10,26,22,0.8)', borderRadius: '12px', border: '1px solid rgba(78,205,196,0.15)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const idx = cell ? seedIndex(cell.value) : -1;
              return (
                <div key={`${r}-${c}`}
                  style={{
                    width: '66px', height: '66px',
                    borderRadius: '8px',
                    background: cell ? SEED_COLORS[idx] : 'rgba(20,46,42,0.4)',
                    border: cell ? `1px solid rgba(78,205,196,${0.2 + idx * 0.1})` : '1px solid rgba(78,205,196,0.1)',
                    boxShadow: cell?.id === glowCell ? `0 0 20px rgba(46,204,113,0.8), ${SEED_GLOW[idx]}` : (cell ? SEED_GLOW[idx] : 'none'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s ease',
                    animation: cell?.isNew ? 'pulse-glow 0.3s ease' : cell?.merged ? 'pulse-glow 0.3s ease' : 'none',
                  }}>
                  {cell && (
                    <>
                      <span style={{ fontSize: '0.6rem', color: idx >= 5 ? 'rgba(20,46,42,0.9)' : '#E0F2F1', fontWeight: 300, lineHeight: 1.2, textAlign: 'center', letterSpacing: '0.05em' }}>
                        {SEED_NAMES[idx]}
                      </span>
                      <span style={{ fontSize: '0.55rem', color: idx >= 5 ? 'rgba(20,46,42,0.6)' : 'rgba(224,242,241,0.5)' }}>
                        {cell.value}
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 游戏结束/胜利覆盖层 */}
        {(gameOver || won) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
            style={{ background: 'rgba(10,26,22,0.92)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }}>
            <p style={{ fontSize: '1rem', color: won ? '#2ECC71' : '#E0F2F1', letterSpacing: '0.2em', textShadow: won ? '0 0 20px rgba(46,204,113,0.7)' : 'none', marginBottom: '8px' }}>
              {won ? '✦ 永恒之种已苏醒 ✦' : '灰雾占领了棋盘'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(168,230,207,0.7)', marginBottom: '4px' }}>
              得分：{score}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,224,167,0.7)', marginBottom: '16px' }}>
              获得 {Math.floor(score / 100)} 枚星光碎片
            </p>
            <button onClick={restart}
              style={{ padding: '8px 20px', background: 'rgba(46,204,113,0.2)', border: '1px solid rgba(46,204,113,0.5)', borderRadius: '8px', color: '#A8E6CF', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
              {won ? '继续折叠' : '再次抵抗'}
            </button>
          </div>
        )}
      </div>

      {/* 进化链图例 */}
      <div className="mt-4 flex gap-2 flex-wrap justify-center px-4">
        {SEED_NAMES.map((name, i) => (
          <div key={name} className="flex items-center gap-1">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEED_COLORS[i], boxShadow: SEED_GLOW[i] }}/>
            <span style={{ fontSize: '0.6rem', color: 'rgba(168,230,207,0.5)' }}>{name}</span>
            {i < SEED_NAMES.length - 1 && <span style={{ color: 'rgba(78,205,196,0.3)', fontSize: '0.6rem' }}>›</span>}
          </div>
        ))}
      </div>

      {/* 操作提示 */}
      <p className="mt-3" style={{ fontSize: '0.6rem', color: 'rgba(78,205,196,0.3)', letterSpacing: '0.1em' }}>
        方向键 / WASD / 滑动 控制
      </p>
    </div>
  );
}
