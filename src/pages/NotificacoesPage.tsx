import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Notificacao = Database['public']['Tables']['notificacoes']['Row'];

export default function NotificacoesPage() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotificacoes = async () => {
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false });
    setNotificacoes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotificacoes();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    fetchNotificacoes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Notificações</h1>
        <p className="text-sm text-muted-foreground">Alertas sobre novos chamados</p>
      </div>

      <div className="space-y-2">
        {notificacoes.map((n) => (
          <div
            key={n.id}
            className={`bg-card border border-border rounded-md p-4 flex items-start gap-3 transition-colors ${
              !n.lida ? 'border-l-4 border-l-primary' : 'opacity-70'
            }`}
          >
            <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{n.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            {!n.lida && (
              <button
                onClick={() => markAsRead(n.id)}
                className="text-primary hover:text-primary/80 shrink-0"
                title="Marcar como lida"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {notificacoes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  );
}
