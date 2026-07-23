
ALTER TABLE public.onboarding_responses
  ADD COLUMN IF NOT EXISTS diet_type text,
  ADD COLUMN IF NOT EXISTS allergies_list text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sensitivities_list text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disliked_foods text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS fiber_g integer,
  ADD COLUMN IF NOT EXISTS water_ml integer,
  ADD COLUMN IF NOT EXISTS meals_per_day integer,
  ADD COLUMN IF NOT EXISTS excluded jsonb NOT NULL DEFAULT '[]'::jsonb;
