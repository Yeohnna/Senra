
-- 用户类型
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- profiles 表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  guardian_name text NOT NULL DEFAULT 'Lyla',
  created_at timestamptz NOT NULL DEFAULT now(),
  first_login boolean NOT NULL DEFAULT true,
  star_fragments integer NOT NULL DEFAULT 0
);

-- 自动同步新用户
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 日记表（心壤）
CREATE TABLE public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  entry_type text NOT NULL DEFAULT 'short' CHECK (entry_type IN ('short', 'long')),
  emotion text NOT NULL DEFAULT 'calm' CHECK (emotion IN ('calm', 'dim', 'storm', 'happy', 'angry', 'sad')),
  plant_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 灵感/知识碎片表（折光）
CREATE TABLE public.light_fragments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  fragment_type text NOT NULL DEFAULT 'inspiration' CHECK (fragment_type IN ('inspiration', 'knowledge')),
  category text,
  front_text text,
  back_text text,
  review_count integer NOT NULL DEFAULT 0,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  ease_factor float NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 感知仪式记录（薪火）
CREATE TABLE public.sense_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ritual_type text NOT NULL CHECK (ritual_type IN ('touch', 'smell', 'listen', 'gaze', 'pulse')),
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- 冥想记录（薪火）
CREATE TABLE public.meditation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anchor_type text NOT NULL DEFAULT 'fire' CHECK (anchor_type IN ('rain', 'fire', 'deep')),
  duration_seconds integer NOT NULL DEFAULT 0,
  depth text NOT NULL DEFAULT 'shallow' CHECK (depth IN ('shallow', 'deep', 'ultra')),
  amber_size text NOT NULL DEFAULT 'small' CHECK (amber_size IN ('small', 'medium', 'large')),
  is_dark_mode boolean NOT NULL DEFAULT false,
  ash_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 灰烬/余烬（薪火）
CREATE TABLE public.ash_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'meditation' CHECK (source_type IN ('meditation', 'diary')),
  collected boolean NOT NULL DEFAULT false,
  resilience_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 神经节点（重构）
CREATE TABLE public.neural_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  category text DEFAULT '',
  is_lit boolean NOT NULL DEFAULT false,
  position_x float NOT NULL DEFAULT 0,
  position_y float NOT NULL DEFAULT 0,
  cocoon_start_at timestamptz,
  skill_icon text,
  ghost_versions jsonb NOT NULL DEFAULT '[]',
  from_fragment_id uuid REFERENCES public.light_fragments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 神经脉络（重构）
CREATE TABLE public.neural_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES public.neural_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES public.neural_nodes(id) ON DELETE CASCADE,
  relation_word text DEFAULT '',
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 游戏得分（基因折叠）
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  max_tile integer NOT NULL DEFAULT 0,
  star_fragments integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.light_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sense_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ash_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neural_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neural_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- 用户角色辅助函数
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Profiles 策略
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "profiles_user_select" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_user_update" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- 日记策略
CREATE POLICY "diary_own" ON diary_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 碎片策略
CREATE POLICY "fragments_own" ON light_fragments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 感知仪式策略
CREATE POLICY "rituals_own" ON sense_rituals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 冥想策略
CREATE POLICY "meditation_own" ON meditation_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 灰烬策略
CREATE POLICY "ash_own" ON ash_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 神经节点策略
CREATE POLICY "nodes_own" ON neural_nodes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 神经脉络策略
CREATE POLICY "connections_own" ON neural_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 游戏得分策略
CREATE POLICY "scores_own" ON game_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 公开视图
CREATE VIEW public_profiles AS SELECT id, role, guardian_name FROM profiles;
