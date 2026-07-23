CREATE TABLE public.coach_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ref_type TEXT,
  ref_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coach_notifications_user_ref_kind_idx
  ON public.coach_notifications(user_id, kind, ref_id)
  WHERE ref_id IS NOT NULL;
CREATE INDEX coach_notifications_user_created_idx
  ON public.coach_notifications(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_notifications TO authenticated;
GRANT ALL ON public.coach_notifications TO service_role;

ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.coach_notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS coach_analysis TEXT,
  ADD COLUMN IF NOT EXISTS coach_verdict TEXT;
