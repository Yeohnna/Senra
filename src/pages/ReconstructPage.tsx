import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { playNodeActivate, playWeldSound, playSynapseBreak, playCoconBreak, resumeAudio } from '@/lib/audio';
import ReturnButton from '@/components/ReturnButton';
import type { AppScreen, NeuralNode, NodeConnection } from '@/types/types';

interface ReconstructProps { navigateTo: (s: AppScreen) => void; }

interface NodePos { x: number; y: number; }

const ACHENG_MESSAGES = [
  '认知迭代完成，旧版本已封存。你比昨天更精准了。',
  '节点已激活。逻辑链正在延伸。',
  '连结确认。脉络稳定。',
  '新的神经突触已形成。',
  '数据结构化完成。继续扩展知识体系。',
];

export default function ReconstructPage({ navigateTo }: ReconstructProps) {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [positions, setPositions] = useState<Record<string, NodePos>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNode, setEditingNode] = useState<NeuralNode | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkWord, setLinkWord] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pendingLinkTo, setPendingLinkTo] = useState<string | null>(null);
  const [achengMsg, setAchengMsg] = useState('');
  const [showGhosts, setShowGhosts] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cocoons, setCocoons] = useState<Set<string>>(new Set());
  const [butterflies, setButterflies] = useState<string[]>([]);

  const loadNodes = useCallback(async () => {
    if (!user) return;
    const [{ data: nodeData }, { data: connData }] = await Promise.all([
      supabase.from('neural_nodes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('node_connections').select('*').eq('user_id', user.id).limit(50),
    ]);
    if (nodeData) {
      setNodes(nodeData as NeuralNode[]);
      // 布局：随机散开
      const pos: Record<string, NodePos> = {};
      (nodeData as NeuralNode[]).forEach((n, i) => {
        const angle = (i / nodeData.length) * Math.PI * 2;
        const r = 80 + Math.random() * 60;
        pos[n.id] = {
          x: 50 + Math.cos(angle) * r * 0.4,
          y: 50 + Math.sin(angle) * r * 0.35,
        };
      });
      setPositions(pos);

      // 检测茧化
      if (connData) {
        const connArr = connData as NodeConnection[];
        const nodeIds = nodeData.map((n: NeuralNode) => n.id);
        const connectedPairs = new Set(connArr.map(c => `${c.from_node_id}-${c.to_node_id}`));
        // 找到成环的节点群（简化：连接数 >= 5 判定茧化）
        const nodeConnCount: Record<string, number> = {};
        connArr.forEach(c => {
          nodeConnCount[c.from_node_id] = (nodeConnCount[c.from_node_id] || 0) + 1;
          nodeConnCount[c.to_node_id] = (nodeConnCount[c.to_node_id] || 0) + 1;
        });
        const cocooned = new Set<string>();
        Object.entries(nodeConnCount).forEach(([id, count]) => {
          if (count >= 3) cocooned.add(id);
        });
        setCocoons(cocooned);
      }
    }
    if (connData) setConnections(connData as NodeConnection[]);
  }, [user]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  const showAcheng = (msg?: string) => {
    setAchengMsg(msg || ACHENG_MESSAGES[Math.floor(Math.random() * ACHENG_MESSAGES.length)]);
    setTimeout(() => setAchengMsg(''), 4000);
  };

  const createNode = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    const { data } = await supabase.from('neural_nodes').insert({
      user_id: user.id,
      title: '新节点',
      content: '',
      status: 'dim',
      version: 1,
    }).select().maybeSingle();
    if (data) {
      setNodes(prev => [data as NeuralNode, ...prev]);
      setPositions(prev => ({
        ...prev,
        [(data as NeuralNode).id]: { x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 },
      }));
    }
    setSubmitting(false);
  };

  const openEditor = (node: NeuralNode) => {
    setEditingNode(node);
    setEditorContent(node.content || '');
    setEditorTitle(node.title || '');
    setShowEditor(true);
  };

  const saveNode = async () => {
    if (!editingNode || !user || submitting) return;
    setSubmitting(true);
    resumeAudio();
    const isReconstructed = editingNode.content && editingNode.content.trim() !== editorContent.trim() && editorContent.length > 30;

    const ghostContent = isReconstructed ? editingNode.content : editingNode.ghost_content;

    await supabase.from('neural_nodes').update({
      title: editorTitle.trim() || '节点',
      content: editorContent,
      status: 'active',
      ghost_content: ghostContent,
      version: (editingNode.version || 1) + (isReconstructed ? 1 : 0),
    }).eq('id', editingNode.id);

    playNodeActivate();
    if (isReconstructed) {
      showAcheng('认知迭代完成，旧版本已封存。你比昨天更精准了。');
    } else {
      showAcheng();
    }
    setShowEditor(false);
    setEditingNode(null);
    loadNodes();
    setSubmitting(false);
  };

  const startLink = (nodeId: string) => {
    if (linkFrom === null) {
      setLinkFrom(nodeId);
      showAcheng('选择要连结的目标节点');
    } else if (linkFrom !== nodeId) {
      setPendingLinkTo(nodeId);
      setShowLinkInput(true);
    }
  };

  const confirmLink = async () => {
    if (!linkFrom || !pendingLinkTo || !user) return;
    resumeAudio();
    playWeldSound();
    await supabase.from('node_connections').insert({
      user_id: user.id,
      from_node_id: linkFrom,
      to_node_id: pendingLinkTo,
      link_word: linkWord || '关联',
    });
    showAcheng('连结确认。脉络稳定。');
    setLinkFrom(null);
    setPendingLinkTo(null);
    setLinkWord('');
    setShowLinkInput(false);
    loadNodes();
  };

  // 检测羽化
  const checkButterfly = async (nodeId: string) => {
    const nodeConns = connections.filter(c => c.from_node_id === nodeId || c.to_node_id === nodeId);
    if (nodeConns.length >= 3 && cocoons.has(nodeId)) {
      resumeAudio();
      playCoconBreak();
      const node = nodes.find(n => n.id === nodeId);
      setButterflies(prev => [...prev, node?.title || '技能']);
      await supabase.from('neural_nodes').update({ status: 'butterfly' }).eq('id', nodeId);
      loadNodes();
    }
  };

  const deleteNode = async (nodeId: string) => {
    if (!user) return;
    await supabase.from('neural_nodes').delete().eq('id', nodeId);
    await supabase.from('node_connections').delete()
      .or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`);
    loadNodes();
  };

  const exportMarkdown = () => {
    const lines = ['# 神经技能树', `导出时间：${new Date().toLocaleString()}`, ''];
    nodes.forEach(n => {
      lines.push(`## ${n.title}`, n.content || '（暂无内容）', '');
    });
    connections.forEach(c => {
      const from = nodes.find(n => n.id === c.from_node_id);
      const to = nodes.find(n => n.id === c.to_node_id);
      if (from && to) lines.push(`- ${from.title} →[${c.link_word}]→ ${to.title}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '神经技能树.md'; a.click();
  };

  return (
    <div className="fullscreen relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0A1A1A 0%, #004D40 100%)' }}
    >
      <ReturnButton onClick={() => navigateTo('hub')} />

      {/* 脑电波网格 */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.07 }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4ECDC4" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* 阿澈 */}
      <div className="absolute top-14 right-4 z-20">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <polygon points="20,2 38,10 38,30 20,38 2,30 2,10"
            fill="none" stroke="rgba(78,205,196,0.6)" strokeWidth="1.5"
            style={{ animation: linkFrom ? 'rotate-fast 1s linear infinite' : 'rotate-slow 8s linear infinite', transformOrigin: '20px 20px' }}/>
          {[0,1,2].map(i => (
            <polygon key={i} points="20,6 34,13 34,27 20,34 6,27 6,13"
              fill="none" stroke={`rgba(78,205,196,${0.2-i*0.05})`} strokeWidth="0.8"
              style={{ animation: `rotate-slow ${12+i*4}s linear infinite`, animationDirection: i%2===0?'normal':'reverse', transformOrigin: '20px 20px' }}/>
          ))}
          <circle cx="20" cy="20" r="3" fill="rgba(78,205,196,0.5)"/>
        </svg>
        {achengMsg && (
          <div className="absolute right-10 top-0 w-52"
            style={{ background: 'rgba(10,26,26,0.95)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '8px', padding: '8px 10px', animation: 'slideFromBottom 0.3s ease', zIndex: 30 }}>
            <p style={{ fontSize: '0.68rem', color: 'rgba(224,242,241,0.85)', lineHeight: 1.6 }}>{achengMsg}</p>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="absolute top-4 left-16 z-20 flex gap-2">
        <button onClick={createNode}
          style={{ padding: '5px 10px', background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.4)', borderRadius: '6px', color: '#4ECDC4', fontSize: '0.72rem', letterSpacing: '0.1em' }}>
          + 新建节点
        </button>
        <button onClick={exportMarkdown}
          style={{ padding: '5px 10px', background: 'rgba(10,26,26,0.7)', border: '1px solid rgba(78,205,196,0.2)', borderRadius: '6px', color: 'rgba(78,205,196,0.6)', fontSize: '0.72rem' }}>
          降维导出
        </button>
        {linkFrom && (
          <button onClick={() => { setLinkFrom(null); setShowLinkInput(false); }}
            style={{ padding: '5px 10px', background: 'rgba(180,50,50,0.2)', border: '1px solid rgba(200,80,80,0.4)', borderRadius: '6px', color: 'rgba(255,150,150,0.8)', fontSize: '0.72rem' }}>
            取消连结
          </button>
        )}
      </div>

      {/* 羽化成就 */}
      {butterflies.length > 0 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 z-20 justify-center">
          {butterflies.map((b, i) => (
            <div key={i} className="px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(78,205,196,0.2)', border: '1px solid rgba(78,205,196,0.5)', animation: 'float 3s ease-in-out infinite', animationDelay: `${i*0.3}s` }}>
              <span style={{ fontSize: '0.75rem', color: '#4ECDC4', textShadow: '0 0 10px rgba(78,205,196,0.5)' }}>✦ {b}</span>
            </div>
          ))}
        </div>
      )}

      {/* 神经树画布 */}
      <div ref={canvasRef} className="absolute inset-0 z-10" style={{ top: '50px' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {connections.map(c => {
            const from = positions[c.from_node_id];
            const to = positions[c.to_node_id];
            if (!from || !to) return null;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            return (
              <g key={c.id}>
                <line
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke="rgba(78,205,196,0.3)" strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(78,205,196,0.2))' }}/>
                <text x={`${mx}%`} y={`${my}%`} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(78,205,196,0.5)" fontSize="9" style={{ userSelect: 'none' }}>
                  {c.link_word}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 节点 */}
        {nodes.map(node => {
          const pos = positions[node.id] || { x: 50, y: 50 };
          const isActive = node.status === 'active';
          const isCocoon = cocoons.has(node.id);
          const isButterfly = node.status === 'butterfly';
          const isSelected = selectedNode === node.id;
          const isLinkSource = linkFrom === node.id;
          return (
            <div key={node.id}
              className="absolute cursor-pointer"
              style={{
                left: `${pos.x}%`, top: `${pos.y}%`,
                transform: 'translate(-50%,-50%)',
                zIndex: isSelected ? 15 : 10,
              }}>
              <div
                className="flex flex-col items-center"
                onClick={() => {
                  if (linkFrom && linkFrom !== node.id) {
                    startLink(node.id);
                  } else {
                    setSelectedNode(isSelected ? null : node.id);
                  }
                }}
                onDoubleClick={() => openEditor(node)}
              >
                {/* 茧 */}
                {isCocoon && !isButterfly && (
                  <div className="absolute inset-0 -m-3 rounded-full pointer-events-none z-0"
                    style={{ border: '2px solid rgba(78,205,196,0.6)', animation: 'pulse-glow 2s ease-in-out infinite', boxShadow: '0 0 15px rgba(78,205,196,0.3)' }}/>
                )}
                <div
                  style={{
                    width: isButterfly ? '48px' : '42px',
                    height: isButterfly ? '48px' : '42px',
                    borderRadius: '50%',
                    background: isButterfly
                      ? 'radial-gradient(circle at 35% 35%, rgba(78,205,196,0.9), rgba(0,77,64,0.5))'
                      : isActive
                        ? 'radial-gradient(circle at 35% 35%, rgba(46,204,113,0.8), rgba(20,46,42,0.5))'
                        : 'radial-gradient(circle at 35% 35%, rgba(40,80,60,0.5), rgba(10,26,26,0.6))',
                    border: `1px solid ${isLinkSource ? 'rgba(255,200,50,0.8)' : isActive ? 'rgba(46,204,113,0.6)' : 'rgba(78,205,196,0.3)'}`,
                    boxShadow: isActive ? '0 0 15px rgba(46,204,113,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                  }}>
                  {/* 全息幽灵（版本>1且有ghost内容） */}
                  {node.ghost_content && showGhosts[node.id] && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 z-20"
                      style={{ background: 'rgba(10,26,26,0.9)', border: '1px solid rgba(78,205,196,0.2)', borderRadius: '6px', padding: '6px 8px', animation: 'slideFromBottom 0.2s ease' }}>
                      <p style={{ fontSize: '0.6rem', color: 'rgba(78,205,196,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        旧版本：{node.ghost_content.slice(0, 60)}…
                      </p>
                    </div>
                  )}
                  <span style={{ fontSize: '0.6rem', color: isActive ? '#E0F2F1' : 'rgba(78,205,196,0.5)', textAlign: 'center', lineHeight: 1.3, maxWidth: '36px', overflow: 'hidden' }}>
                    {(node.title || '').slice(0, 4)}
                  </span>
                </div>
              </div>

              {/* 选中工具 */}
              {isSelected && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-24 z-20">
                  <button onClick={() => openEditor(node)}
                    style={{ padding: '3px 8px', background: 'rgba(46,204,113,0.2)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '4px', color: '#A8E6CF', fontSize: '0.65rem' }}>
                    编辑
                  </button>
                  <button onClick={() => { setLinkFrom(node.id); setSelectedNode(null); showAcheng('选择要连结的目标节点'); }}
                    style={{ padding: '3px 8px', background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '4px', color: '#4ECDC4', fontSize: '0.65rem' }}>
                    连结
                  </button>
                  {node.ghost_content && (
                    <button onClick={() => setShowGhosts(prev => ({ ...prev, [node.id]: !prev[node.id] }))}
                      style={{ padding: '3px 8px', background: 'rgba(50,30,80,0.3)', border: '1px solid rgba(120,80,160,0.3)', borderRadius: '4px', color: 'rgba(180,140,220,0.7)', fontSize: '0.65rem' }}>
                      {showGhosts[node.id] ? '隐藏' : '幽灵'}
                    </button>
                  )}
                  <button onClick={() => deleteNode(node.id)}
                    style={{ padding: '3px 8px', background: 'rgba(80,20,20,0.3)', border: '1px solid rgba(150,50,50,0.3)', borderRadius: '4px', color: 'rgba(200,100,100,0.7)', fontSize: '0.65rem' }}>
                    删除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <p style={{ color: 'rgba(78,205,196,0.4)', fontSize: '0.85rem', letterSpacing: '0.2em', marginBottom: '16px' }}>
              神经殿堂正在等待第一个节点
            </p>
            <button onClick={createNode}
              style={{ padding: '8px 24px', background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.4)', borderRadius: '8px', color: '#4ECDC4', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
              创建第一个神经突触
            </button>
          </div>
        </div>
      )}

      {/* 连结词输入 */}
      {showLinkInput && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-panel px-6 py-5 max-w-xs w-full mx-4"
            style={{ borderColor: 'rgba(78,205,196,0.4)', animation: 'slideFromBottom 0.3s ease' }}>
            <p style={{ color: '#4ECDC4', fontSize: '0.82rem', letterSpacing: '0.1em', marginBottom: '12px', textAlign: 'center' }}>
              阿澈发射焊接射线中…<br/>
              <span style={{ fontSize: '0.7rem', color: 'rgba(78,205,196,0.6)' }}>输入连结词（导致/属于/对立/包含）</span>
            </p>
            <input type="text" value={linkWord} onChange={e => setLinkWord(e.target.value)}
              onKeyUp={e => e.key === 'Enter' && confirmLink()}
              placeholder="连结词"
              className="w-full px-3 py-2 outline-none text-center mb-3"
              style={{ background: 'rgba(10,26,26,0.8)', border: '1px solid rgba(78,205,196,0.4)', borderRadius: '6px', color: '#E0F2F1', fontSize: '0.85rem' }}/>
            <div className="flex gap-2">
              <button onClick={() => { setShowLinkInput(false); setLinkFrom(null); }}
                style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid rgba(78,205,196,0.2)', borderRadius: '6px', color: 'rgba(78,205,196,0.5)', fontSize: '0.75rem' }}>
                取消
              </button>
              <button onClick={confirmLink}
                style={{ flex: 1, padding: '6px', background: 'rgba(78,205,196,0.2)', border: '1px solid rgba(78,205,196,0.5)', borderRadius: '6px', color: '#4ECDC4', fontSize: '0.75rem' }}>
                焊接
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全息书写舱 */}
      {showEditor && editingNode && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-xl mx-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span style={{ color: '#4ECDC4', fontSize: '0.8rem', letterSpacing: '0.15em' }}>◈ 全息书写舱 ◈</span>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '0.65rem', color: 'rgba(78,205,196,0.4)' }}>v{editingNode.version || 1}</span>
                <button onClick={() => setShowEditor(false)} style={{ color: 'rgba(78,205,196,0.5)', fontSize: '1.2rem' }}>×</button>
              </div>
            </div>
            <input type="text" value={editorTitle} onChange={e => setEditorTitle(e.target.value)}
              placeholder="节点标题"
              className="w-full px-4 py-2 outline-none"
              style={{ background: 'rgba(10,26,26,0.8)', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '8px', color: '#E0F2F1', fontSize: '0.95rem', letterSpacing: '0.05em' }}/>
            <textarea
              value={editorContent}
              onChange={e => setEditorContent(e.target.value)}
              placeholder="在此输入 Markdown 笔记…&#10;&#10;大幅修改内容会触发认知重构，旧版本将以全息幽灵形式封存。"
              className="w-full h-56 px-4 py-3 resize-none outline-none"
              style={{ background: 'rgba(10,26,26,0.9)', border: '1px solid rgba(78,205,196,0.2)', borderRadius: '8px', color: '#E0F2F1', fontSize: '0.85rem', lineHeight: 1.8, fontFamily: 'monospace' }}/>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: '0.65rem', color: 'rgba(78,205,196,0.4)' }}>{editorContent.length} 字</span>
              <button onClick={saveNode} disabled={submitting}
                style={{ padding: '8px 20px', background: 'rgba(78,205,196,0.2)', border: '1px solid rgba(78,205,196,0.5)', borderRadius: '8px', color: '#4ECDC4', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                {submitting ? '激活中…' : '激活节点'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
