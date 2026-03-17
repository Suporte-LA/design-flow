
-- Create enum types
CREATE TYPE public.ticket_urgency AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'aguardando', 'finalizado');
CREATE TYPE public.app_role AS ENUM ('admin', 'solicitante');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table (must be created before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking (after user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Tickets table
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  local TEXT NOT NULL,
  foto_url TEXT,
  urgencia ticket_urgency NOT NULL DEFAULT 'media',
  status ticket_status NOT NULL DEFAULT 'aberto',
  conclusao BOOLEAN NOT NULL DEFAULT false,
  observacoes_adm TEXT,
  responsavel TEXT,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_conclusao TIMESTAMPTZ
);

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can view own tickets" ON public.chamados FOR SELECT TO authenticated USING (auth.uid() = solicitante_id);
CREATE POLICY "Admins can view all tickets" ON public.chamados FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can create tickets" ON public.chamados FOR INSERT TO authenticated WITH CHECK (auth.uid() = solicitante_id);
CREATE POLICY "Admins can update all tickets" ON public.chamados FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ticket history
CREATE TABLE public.historico_chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alteracao TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can view own ticket history" ON public.historico_chamados FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chamados WHERE id = chamado_id AND solicitante_id = auth.uid())
);
CREATE POLICY "Admins can view all history" ON public.historico_chamados FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert history" ON public.historico_chamados FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notifications table
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  destinatario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notificacoes FOR SELECT TO authenticated USING (destinatario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can create notifications" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notificacoes FOR UPDATE TO authenticated USING (destinatario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'solicitante');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-notify admins on new ticket
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notificacoes (chamado_id, titulo, mensagem, destinatario_id)
  SELECT
    NEW.id,
    'Novo chamado: ' || NEW.titulo,
    'Local: ' || NEW.local || ' | Urgência: ' || NEW.urgencia::text || ' | Aberto em: ' || to_char(NEW.data_abertura, 'DD/MM/YYYY HH24:MI'),
    ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();

-- Storage bucket for ticket photos
INSERT INTO storage.buckets (id, name, public) VALUES ('chamados-fotos', 'chamados-fotos', true);

CREATE POLICY "Anyone can view ticket photos" ON storage.objects FOR SELECT USING (bucket_id = 'chamados-fotos');
CREATE POLICY "Authenticated can upload ticket photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chamados-fotos');
