-- Add profiles table to realtime publication so the frontend can receive live updates for cash/reputation
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
