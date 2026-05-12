// 意识光灵 —— 本地词库聊天系统
import type { CompanionId } from '@/types/types';

export interface Companion {
  id: CompanionId;
  name: string;
  color: string;
  glowColor: string;
  description: string;
  personality: string;
  keywords: string[];
  responses: string[];
  idleLines: string[];
}

export const COMPANIONS: Record<CompanionId, Companion> = {
  glow: {
    id: 'glow',
    name: '微光',
    color: '#A8E6CF',
    glowColor: 'rgba(168,230,207,0.7)',
    description: '薄荷绿萤火虫/水母，源核旁小窝',
    personality: '温柔护短',
    keywords: ['今天', '累', '开心', '难过', '好', '坏', '怎么', '帮', '谢'],
    responses: [
      '嗯……我听到了。不用强撑，在这里软一会儿也没关系的。',
      '你回来了。我一直在等你。',
      '有什么放不下的，说给源核听，它会记住的。',
      '今天辛苦了。你已经做得很好了。',
      '灰雾很难熬，但你还在这里——这本身就是了不起的事。',
    ],
    idleLines: [
      '（微光在鸟巢里蜷成一团，微微发光）',
      '……Zzzz……（打盹）',
      '（用触须拨弄金缮脉络，玩得很专注）',
      '（偷看你，发现你看它，迅速假装睡着）',
    ],
  },
  nan: {
    id: 'nan',
    name: '阿南',
    color: '#CC4400',
    glowColor: 'rgba(204,68,0,0.6)',
    description: '暗红跳动岩浆火团，薪火炉门旁',
    personality: '沉稳务实',
    keywords: ['冥想', '焦虑', '睡', '休息', '身体', '感觉', '痛', '烦', '静'],
    responses: [
      '坐下来。先呼吸。四秒吸，六秒呼。把脑子里的杂音先烧掉。',
      '感知力迟钝了。去做一次感知仪式，摸摸皮肤温度，数数心跳。',
      '你上次冥想是什么时候？炉火快暗了。',
      '焦虑是信号，不是结论。先把身体稳住，其他的再说。',
      '没关系，炉火变暗了可以再生。重要的是你还在这里。',
    ],
    idleLines: [
      '（阿南静静地燃烧着，发出低沉的蒸汽声）',
      '……（沉默，但炉火稳稳地跳动着）',
      '炉膛温度正常。（低沉地）',
    ],
  },
  ying: {
    id: 'ying',
    name: '阿萤',
    color: '#88CC00',
    glowColor: 'rgba(136,204,0,0.6)',
    description: '黄绿发光飞虫群，树皮日记旁',
    personality: '多愁善感',
    keywords: ['记忆', '过去', '忘', '日记', '写', '那时', '想起', '怀念', '以前'],
    responses: [
      '把它写下来。哪怕只是只言片语，也不会真正消失。',
      '我也曾经很害怕被遗忘……但你在这里记录，这就是最好的抵抗。',
      '如果你看到了这些，请替我好好活着。',
      '记忆是会流失的，但你记录的那一刻是真实的。那一刻永远在。',
      '有些话不用说得完整，碎片也有碎片的美。',
    ],
    idleLines: [
      '（阿萤盘旋在日记旁，若有所思）',
      '（轻声叹气）……有些东西，再不写就忘了。',
      '（静静地看着记忆年轮，微微发光）',
    ],
  },
  che: {
    id: 'che',
    name: '阿澈',
    color: '#4499FF',
    glowColor: 'rgba(68,153,255,0.6)',
    description: '冷蓝几何线条二十面体，树皮仪表上',
    personality: '绝对理性',
    keywords: ['逻辑', '理解', '知识', '学习', '系统', '为什么', '原因', '如何', '思维'],
    responses: [
      '数据不足。请先记录更多节点，再进行推断。',
      '你的认知体系有空缺。建议补充相关节点，使逻辑链完整。',
      '情绪是信号，也是数据。不要忽视，但也不要被淹没。理性处理它。',
      '一个观念只有经过足够的反驳，才算真正理解。试着挑战你自己的结论。',
      '认知迭代完成，旧版本已封存。你比昨天更精准了。',
    ],
    idleLines: [
      '（阿澈旋转着，扫描数据）',
      '逻辑链完整。（快速旋转）',
      '（几何棱角微微发蓝，静待指令）',
    ],
  },
  child: {
    id: 'child',
    name: '那个孩子',
    color: '#88AAFF',
    glowColor: 'rgba(136,170,255,0.6)',
    description: '粉蓝闪电球，风铃/星星旁',
    personality: '天真混沌',
    keywords: ['玩', '游戏', '有趣', '无聊', '星星', '梦', '奇怪', '好玩'],
    responses: [
      '嘿嘿——你也觉得有趣吗！',
      '我也不知道，就是感觉……应该是这样的。',
      '灰雾也有好看的地方的！（噼啪一下）那边那朵像不像一只兔子？',
      '别想太多啦，就做嘛！',
      '……我忘了我要说什么了。但反正没关系！',
    ],
    idleLines: [
      '（那个孩子噼里啪啦地弹跳着）',
      '嘿嘿嘿~~',
      '（盯着风铃，若有所思，然后忽然消失又出现）',
    ],
  },
  man: {
    id: 'man',
    name: '小满',
    color: '#44AA66',
    glowColor: 'rgba(68,170,102,0.6)',
    description: '幽绿发光真菌/水草，源核泥土旁',
    personality: '包容安静',
    keywords: ['接受', '平静', '够了', '好像', '可以', '慢', '没事', '还好'],
    responses: [
      '够了。今天这样就够了。',
      '慢慢来。根系会扎得很深的。',
      '不是每天都要有收获，有时候只是……在场，就很好了。',
      '你不需要每次都有答案。',
      '我在这里。就这样。',
    ],
    idleLines: [
      '（小满安静地生长着，没有动静）',
      '……（发出极微弱的幽绿光）',
      '（像在冥想，也像只是存在着）',
    ],
  },
  jingzhe: {
    id: 'jingzhe',
    name: '惊蛰',
    color: '#9944CC',
    glowColor: 'rgba(153,68,204,0.6)',
    description: '紫色微型雷雨云，折光水面上方',
    personality: '敏锐暴躁',
    keywords: ['愤怒', '气', '烦透了', '凭什么', '为什么', '不公', '忍', '爆发'],
    responses: [
      '那就发火！把它写下来！那是真实的！',
      '气愤不是坏事，它是你还在乎的证明。',
      '你说得对，那确实不公平。别压着它。',
      '（劈下一道闪电）——说出来，别藏着！',
      '愤怒也是能量。用对了，能劈开很多东西。',
    ],
    idleLines: [
      '（惊蛰低沉地滚雷，不满地旋转）',
      '……（电闪，又平息了）',
      '没什么大事，别烦我。（但其实在偷听）',
    ],
  },
};

export function matchCompanion(input: string): CompanionId {
  const lc = input.toLowerCase();
  for (const [id, c] of Object.entries(COMPANIONS)) {
    if (c.keywords.some(kw => lc.includes(kw))) return id as CompanionId;
  }
  return 'glow';
}

export function getResponse(id: CompanionId, input: string): string {
  const c = COMPANIONS[id];
  if (!input.trim()) return c.idleLines[Math.floor(Math.random() * c.idleLines.length)];
  return c.responses[Math.floor(Math.random() * c.responses.length)];
}
