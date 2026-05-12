// 云隙光：0号种子库 类型定义

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  guardian_name: string;
  created_at: string;
  first_login: boolean;
  star_fragments: number;
}

export type EmotionType = 'calm' | 'dim' | 'storm' | 'happy' | 'angry' | 'sad';
export type PlantType = 'breath_grass' | 'tear_lily' | 'wind_chime' | 'venus_fly' | 'hologram_flower' | null;
export type EntryType = 'short' | 'long';

export interface DiaryEntry {
  id: string;
  user_id: string;
  content: string;
  entry_type: EntryType;
  emotion: EmotionType;
  plant_type: PlantType;
  created_at: string;
}

export type FragmentType = 'inspiration' | 'knowledge';

export interface LightFragment {
  id: string;
  user_id: string;
  content: string;
  fragment_type: FragmentType;
  category: string | null;
  front_text: string;
  back_text: string;
  review_count: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  ease_factor: number;
  interval_days: number;
  created_at: string;
}

export type RitualType = 'touch' | 'smell' | 'listen' | 'gaze' | 'pulse';
export type AnchorType = 'rain' | 'fire' | 'deep';
export type MeditationDepth = 'shallow' | 'deep' | 'ultra';
export type AmberSize = 'small' | 'medium' | 'large';

export interface SenseRitual {
  id: string;
  user_id: string;
  ritual_type: RitualType;
  completed_at: string;
}

export interface MeditationRecord {
  id: string;
  user_id: string;
  anchor_type: AnchorType;
  duration_seconds: number;
  depth: MeditationDepth;
  amber_size: AmberSize;
  is_dark_mode: boolean;
  dark_mode: boolean;
  breath_mode: string;
  ash_count: number;
  created_at: string;
}

export interface AshRecord {
  id: string;
  user_id: string;
  source_type: 'meditation' | 'diary';
  collected: boolean;
  resilience_value: number;
  created_at: string;
}

export interface NeuralNode {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  is_lit: boolean;
  status: 'dim' | 'active' | 'cocoon' | 'butterfly';
  position_x: number;
  position_y: number;
  cocoon_start_at: string | null;
  skill_icon: string | null;
  ghost_content: string | null;
  ghost_versions: GhostVersion[];
  from_fragment_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GhostVersion {
  content: string;
  title?: string;
  updated_at: string;
}

export interface NodeConnection {
  id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  link_word: string;
  relation_word: string;
  is_hidden: boolean;
  created_at: string;
}

export interface GameScore {
  id: string;
  user_id: string;
  score: number;
  max_tile: number;
  star_fragments: number;
  created_at: string;
}

export type AppScreen = 'prologue' | 'login' | 'main' | 'hub' | 'heartsoil' | 'prism' | 'hearthfire' | 'reconstruct' | 'game';
export type GlowStage = 'tadpole' | 'jellyfish' | 'stardust';
export type BreathMode = 'basic' | 'deep' | 'free';
export type CompanionId = 'glow' | 'nan' | 'ying' | 'che' | 'child' | 'man' | 'jingzhe';
