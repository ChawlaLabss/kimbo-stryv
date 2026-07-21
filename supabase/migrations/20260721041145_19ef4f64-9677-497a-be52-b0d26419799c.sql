
-- ROLES
CREATE TYPE public.app_role AS ENUM ('user', 'coach', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ONBOARDING
CREATE TABLE public.onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age_range TEXT,
  sex TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  units TEXT DEFAULT 'metric',
  goal TEXT,
  target_weight_kg NUMERIC,
  timeline_weeks INT,
  experience TEXT,
  days_per_week INT,
  session_minutes INT,
  location TEXT,
  equipment TEXT[],
  split_preference TEXT,
  priority_muscles TEXT[],
  injuries TEXT,
  avoid_exercises TEXT,
  sleep_hours NUMERIC,
  stress_level INT,
  activity_level TEXT,
  dietary_preferences TEXT,
  allergies TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_own" ON public.onboarding_responses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER onb_updated BEFORE UPDATE ON public.onboarding_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXERCISE LIBRARY
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT,
  instructions TEXT,
  cues TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_read" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercises_admin_write" ON public.exercises FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TRAINING PROGRAMS
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  split TEXT,
  days_per_week INT,
  goal TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;
GRANT ALL ON public.training_programs TO service_role;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs_own" ON public.training_programs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER programs_updated BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  name TEXT NOT NULL,
  muscle_groups TEXT[],
  is_rest BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_days TO authenticated;
GRANT ALL ON public.program_days TO service_role;
ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_days_own" ON public.program_days FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_programs p WHERE p.id = program_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_programs p WHERE p.id = program_id AND p.user_id = auth.uid()));

CREATE TABLE public.program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  sets INT NOT NULL DEFAULT 3,
  rep_range TEXT DEFAULT '8-12',
  target_rir INT DEFAULT 2,
  rest_seconds INT DEFAULT 90,
  tempo TEXT,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_exercises TO authenticated;
GRANT ALL ON public.program_exercises TO service_role;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_ex_own" ON public.program_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.program_days d JOIN public.training_programs p ON p.id = d.program_id WHERE d.id = program_day_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.program_days d JOIN public.training_programs p ON p.id = d.program_id WHERE d.id = program_day_id AND p.user_id = auth.uid()));

-- WORKOUT SESSIONS
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_day_id UUID REFERENCES public.program_days(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  difficulty INT,
  energy INT,
  performance INT,
  soreness_notes TEXT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.workout_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.logged_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  set_index INT NOT NULL,
  weight NUMERIC,
  reps INT,
  rir INT,
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logged_sets TO authenticated;
GRANT ALL ON public.logged_sets TO service_role;
ALTER TABLE public.logged_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets_own" ON public.logged_sets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- WEEKLY CHECKINS
CREATE TABLE public.weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  body_weight_kg NUMERIC,
  workouts_completed INT,
  workouts_planned INT,
  sleep_quality INT,
  stress_level INT,
  soreness INT,
  motivation INT,
  energy INT,
  pain_notes TEXT,
  recovery INT,
  notes TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_checkins TO authenticated;
GRANT ALL ON public.weekly_checkins TO service_role;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_own" ON public.weekly_checkins FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- BODY MEASUREMENTS
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  lean_mass_kg NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  arm_cm NUMERIC,
  thigh_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meas_own" ON public.body_measurements FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AI
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_own" ON public.ai_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER conv_updated BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_own" ON public.ai_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- KNOWLEDGE
CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  published_date DATE,
  category TEXT,
  tags TEXT[],
  file_path TEXT,
  summary TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_sources TO authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_read" ON public.knowledge_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_admin_write" ON public.knowledge_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER kb_updated BEFORE UPDATE ON public.knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED EXERCISE LIBRARY
INSERT INTO public.exercises (name, primary_muscle, secondary_muscles, equipment, instructions, cues) VALUES
('Barbell Bench Press','Chest',ARRAY['Triceps','Front Delts'],'Barbell','Lie flat, grip slightly wider than shoulders, lower to mid chest, press up.','Retract shoulder blades. Feet planted. Bar path over lower chest.'),
('Incline Dumbbell Press','Upper Chest',ARRAY['Front Delts','Triceps'],'Dumbbells','Incline bench 30°, press dumbbells up and slightly in.','Elbows ~45°. Don''t flare. Controlled eccentric.'),
('Barbell Back Squat','Quads',ARRAY['Glutes','Hamstrings'],'Barbell','Bar on upper back, feet shoulder-width, squat to depth, drive up.','Brace core. Knees track over toes. Chest up.'),
('Romanian Deadlift','Hamstrings',ARRAY['Glutes','Lower Back'],'Barbell','Hinge at hips with soft knees, lower to mid-shin, drive hips forward.','Neutral spine. Bar close to legs. Push hips back.'),
('Pull-Up','Lats',ARRAY['Biceps','Upper Back'],'Bodyweight','Hang from bar, pull chest to bar, control down.','Drive elbows down. Don''t swing. Full ROM.'),
('Barbell Row','Mid Back',ARRAY['Lats','Biceps'],'Barbell','Hinge ~45°, pull bar to lower chest, control down.','Squeeze scaps. Neutral spine.'),
('Overhead Press','Shoulders',ARRAY['Triceps'],'Barbell','Bar at shoulders, press overhead, lockout.','Glutes tight. Head through at top.'),
('Lateral Raise','Side Delts',ARRAY[]::TEXT[],'Dumbbells','Slight lean, raise dumbbells to shoulder height.','Lead with elbows. Slow eccentric.'),
('Triceps Pushdown','Triceps',ARRAY[]::TEXT[],'Cable','Elbows pinned, extend forearms down.','Only elbows move. Full extension.'),
('Barbell Curl','Biceps',ARRAY['Forearms'],'Barbell','Curl bar with elbows pinned to sides.','No swing. Squeeze at top.'),
('Leg Press','Quads',ARRAY['Glutes'],'Machine','Feet shoulder-width, lower until 90°, press up without locking.','Full ROM. Don''t round lower back.'),
('Seated Cable Row','Mid Back',ARRAY['Lats','Biceps'],'Cable','Neutral spine, row handle to torso, squeeze back.','Elbows drive back. Chest up.'),
('Face Pull','Rear Delts',ARRAY['Upper Back'],'Cable','Pull rope to face with high elbows, external rotation.','Elbows high. Squeeze rear delts.'),
('Leg Curl','Hamstrings',ARRAY[]::TEXT[],'Machine','Curl heels to glutes on machine.','Controlled tempo. Full range.'),
('Standing Calf Raise','Calves',ARRAY[]::TEXT[],'Machine','Press through balls of feet, full stretch and squeeze.','Pause at top. Full stretch.');
