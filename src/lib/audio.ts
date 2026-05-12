// Web Audio API 音效系统 —— 全局音效管理器

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // 恢复被浏览器暂停的上下文
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 创建增益节点
function gain(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

// 播放单音
function playTone(freq: number, type: OscillatorType, duration: number, volume = 0.3, fadeOut = true) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = gain(ctx, volume);
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    if (fadeOut) {
      g.gain.setValueAtTime(volume, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    }
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore */ }
}

// 白噪声生成器
function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

// 打字音效
export function playTypeSound() {
  try {
    const ctx = getCtx();
    // 机械敲击
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.08);
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 200;
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);

    // 木质空腔回声
    const osc2 = ctx.createOscillator();
    const g2 = gain(ctx, 0.03);
    osc2.type = 'sine';
    osc2.frequency.value = 200 + Math.random() * 100;
    osc2.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.03, ctx.currentTime + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc2.start(ctx.currentTime + 0.02);
    osc2.stop(ctx.currentTime + 0.15);
  } catch (e) { /* ignore */ }
}

// 破壳音效
export function playBreakSound() {
  try {
    const ctx = getCtx();
    // 上升音阶
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.2);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) { /* ignore */ }
}

// 心跳音效
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
export function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    try {
      const ctx = getCtx();
      [0, 0.3].forEach(delay => {
        const osc = ctx.createOscillator();
        const g = gain(ctx, 0.15);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + delay + 0.2);
        osc.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.25);
      });
    } catch (e) { /* ignore */ }
  }, 1400);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// 风铃玻璃音
export function playWindChime() {
  try {
    const ctx = getCtx();
    const freqs = [1047, 1175, 1319, 1397, 1568];
    const freq = freqs[Math.floor(Math.random() * freqs.length)];
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.25);
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.start();
    osc.stop(ctx.currentTime + 2);
  } catch (e) { /* ignore */ }
}

// 植物生长音效
export function playGrowSound() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.15);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.8);
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) { /* ignore */ }
}

// 织梦虫音效（8-bit）
export function playWormSound() {
  try {
    const ctx = getCtx();
    [0, 0.1, 0.2].forEach(delay => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.06);
      osc.type = 'square';
      osc.frequency.value = 440 + delay * 200;
      osc.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.06, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.08);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.08);
    });
  } catch (e) { /* ignore */ }
}

// 2048合并音效
export function playMergeSound() {
  try {
    playTone(523, 'sine', 0.15, 0.2);
  } catch (e) { /* ignore */ }
}

// 齿轮咔哒声
export function playGearClick() {
  try {
    const ctx = getCtx();
    const noise = createWhiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const g = gain(ctx, 0.3);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.start();
    noise.stop(ctx.currentTime + 0.15);
  } catch (e) { /* ignore */ }
}

// 白噪音系统
let noiseNode: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;

export function startWhiteNoise(type: 'rain' | 'fire' | 'deep') {
  stopWhiteNoise();
  try {
    const ctx = getCtx();
    noiseNode = createWhiteNoise(ctx);
    noiseGain = gain(ctx, 0);

    if (type === 'rain') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      noiseNode.connect(filter);
      filter.connect(noiseGain);

      // 雨滴间歇脉冲
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 8;
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(noiseGain.gain);
      lfo.start();
    } else if (type === 'fire') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.3;
      noiseNode.connect(filter);
      filter.connect(noiseGain);
    } else {
      // deep space
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 80;
      noiseNode.connect(filter);
      filter.connect(noiseGain);

      // 极低频振荡器
      const sub = ctx.createOscillator();
      const subGain = gain(ctx, 0.1);
      sub.type = 'sine';
      sub.frequency.value = 30;
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start();
    }

    noiseGain.connect(ctx.destination);
    noiseNode.start();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 2);
  } catch (e) { /* ignore */ }
}

export function stopWhiteNoise() {
  try {
    if (noiseGain) {
      noiseGain.gain.linearRampToValueAtTime(0, (audioCtx?.currentTime || 0) + 1);
    }
    setTimeout(() => {
      try { noiseNode?.stop(); } catch (e) { /* ignore */ }
      noiseNode = null;
      noiseGain = null;
    }, 1100);
  } catch (e) { /* ignore */ }
}

// 节点点亮音效
export function playNodeLight() {
  try {
    const ctx = getCtx();
    [261, 329, 392, 523].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.15);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.06;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (e) { /* ignore */ }
}

// 和弦结束音（计时器结束）
export function playTimerEnd() {
  try {
    const ctx = getCtx();
    [[523, 659, 784], [659, 784, 988], [784, 988, 1175]].forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const g = gain(ctx, 0.12);
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + ci * 0.3;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    });
  } catch (e) { /* ignore */ }
}

// 鲸鸣叹息（源核饥饿）
export function playWhaleSign() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.08);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 2);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 3.5);
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.5);
    osc.start();
    osc.stop(ctx.currentTime + 3.5);
  } catch (e) { /* ignore */ }
}

// 解锁/羽化音效
export function playTranscend() {
  try {
    const ctx = getCtx();
    // 玻璃碎裂 + 上升音阶
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.08);
      osc.type = 'sine';
      osc.frequency.value = 400 + i * 150;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.05;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  } catch (e) { /* ignore */ }
}

// 机械咔哒声（感知仪式）
export function playMechanicalClick() {
  try {
    const ctx = getCtx();
    // 沉重齿轮咬合
    const noise = createWhiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.8;
    const g = gain(ctx, 0.4);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    noise.start();
    noise.stop(ctx.currentTime + 0.25);

    // 金属撞击余韵
    const osc = ctx.createOscillator();
    const og = gain(ctx, 0.12);
    osc.type = 'triangle';
    osc.frequency.value = 180;
    osc.connect(og);
    og.connect(ctx.destination);
    og.gain.setValueAtTime(0.12, ctx.currentTime + 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* ignore */ }
}

// 琥珀凝结音效
export function playAmberSound() {
  try {
    const ctx = getCtx();
    // 低沉咕噜声
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.15);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.7);
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);

    // 风铃余韵
    setTimeout(() => {
      try {
        const ctx2 = getCtx();
        const osc2 = ctx2.createOscillator();
        const g2 = gain(ctx2, 0.1);
        osc2.type = 'sine';
        osc2.frequency.value = 1047;
        osc2.connect(g2);
        g2.connect(ctx2.destination);
        g2.gain.setValueAtTime(0.1, ctx2.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 1.5);
        osc2.start();
        osc2.stop(ctx2.currentTime + 1.5);
      } catch (e) { /* ignore */ }
    }, 400);
  } catch (e) { /* ignore */ }
}

// 节点激活音效
export function playNodeActivate() {
  try {
    const ctx = getCtx();
    // 清脆咔哒 + 上升
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.12);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.05;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch (e) { /* ignore */ }
}

// 焊接连结音效（神经脉络）
export function playWeldSound() {
  try {
    const ctx = getCtx();
    // 电焊滋滋声（温柔版）
    const noise = createWhiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    const g = gain(ctx, 0.06);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    noise.start();
    noise.stop(ctx.currentTime + 0.5);

    // 合成器拉长音
    const osc = ctx.createOscillator();
    const og = gain(ctx, 0.1);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.4);
    osc.connect(og);
    og.connect(ctx.destination);
    og.gain.setValueAtTime(0.1, ctx.currentTime);
    og.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* ignore */ }
}

// 突触断裂预警音
export function playSynapseBreak() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.15);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { /* ignore */ }
}

// 茧破裂·羽化音效
export function playCoconBreak() {
  try {
    const ctx = getCtx();
    // 玻璃碎裂
    const noise = createWhiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const g = gain(ctx, 0.2);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    noise.start();
    noise.stop(ctx.currentTime + 0.2);

    // 空灵上升音阶
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const og = gain(ctx, 0.1);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(og);
      og.connect(ctx.destination);
      const t = ctx.currentTime + 0.1 + i * 0.07;
      og.gain.setValueAtTime(0.1, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (e) { /* ignore */ }
}

// 灰雾击碎音效（心壤防卫战）
export function playFogBurst() {
  try {
    const ctx = getCtx();
    for (let i = 0; i < 5; i++) {
      const noise = createWhiteNoise(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200 + i * 300;
      const g = gain(ctx, 0.08);
      noise.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.04;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.start(t);
      noise.stop(t + 0.12);
    }
  } catch (e) { /* ignore */ }
}

export function resumeAudio() {
  try { getCtx(); } catch (e) { /* ignore */ }
}
