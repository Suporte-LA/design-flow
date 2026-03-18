import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';
import type { Database } from '@/integrations/supabase/types';

type Chamado = Database['public']['Tables']['chamados']['Row'];

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChamados = async () => {
      const query = supabase.from('chamados').select('*');
      if (!isAdmin && user) {
        query.eq('solicitante_id', user.id);
      }
      const { data } = await query.order('data_abertura', { ascending: false });
      setChamados(data || []);
      setLoading(false);
    };
    fetchChamados();
  }, [isAdmin, user]);

  const stats = [
    {
      label: 'Total',
      value: chamados.length,
      icon: LayoutDashboard,
      className: 'border-l-primary',
    },
    {
      label: 'Abertos',
      value: chamados.filter((c) => c.status === 'aberto').length,
      icon: AlertTriangle,
      className: 'border-l-blue-500',
    },
    {
      label: 'Em Andamento',
      value: chamados.filter((c) => c.status === 'em_andamento').length,
      icon: Clock,
      className: 'border-l-amber-500',
    },
    {
      label: 'Finalizados',
      value: chamados.filter((c) => c.status === 'finalizado').length,
      icon: CheckCircle2,
      className: 'border-l-emerald-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos chamados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className={`p-4 border-l-4 ${stat.className}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
              </div>
              <stat.icon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </Card>
        ))}
      </div>

      {/* Recent tickets */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Chamados Recentes</h2>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground w-12">Foto</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Chamado</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Local</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Urgência</th>
              </tr>
            </thead>
            <tbody>
              {chamados.slice(0, 10).map((chamado) => (
                <tr key={chamado.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    {chamado.foto_url ? (
                      <img
                        src={chamado.foto_url}
                        alt=""
                        className="h-10 w-10 rounded object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxUrl(chamado.foto_url)}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
                    )}
                  </td>
                  <td className="p-3 text-foreground font-medium">{chamado.titulo}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{chamado.local}</td>
                  <td className="p-3">
                    <StatusBadge status={chamado.status} />
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <UrgencyBadge urgency={chamado.urgencia} />
                  </td>
                </tr>
              ))}
              {chamados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nenhum chamado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    aberto: { label: 'Aberto', className: 'status-badge-open' },
    em_andamento: { label: 'Em Andamento', className: 'status-badge-in-progress' },
    aguardando: { label: 'Aguardando', className: 'status-badge-waiting' },
    finalizado: { label: 'Finalizado', className: 'status-badge-done' },
  };
  const info = map[status] || { label: status, className: '' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, { label: string; className: string }> = {
    baixa: { label: 'Baixa', className: 'urgency-badge-low' },
    media: { label: 'Média', className: 'urgency-badge-medium' },
    alta: { label: 'Alta', className: 'urgency-badge-high' },
    critica: { label: 'Crítica', className: 'urgency-badge-critical' },
  };
  const info = map[urgency] || { label: urgency, className: '' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}
