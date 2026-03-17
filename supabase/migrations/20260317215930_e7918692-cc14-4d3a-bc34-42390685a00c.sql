
-- Fix permissive INSERT policy on notificacoes
DROP POLICY "Authenticated can create notifications" ON public.notificacoes;
CREATE POLICY "Authenticated can create notifications" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
