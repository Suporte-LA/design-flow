import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, UrgencyBadge } from './DashboardPage';
import TicketDetailDrawer from '@/components/TicketDetailDrawer';
import { Search } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Chamado = Database['public']['Tables']['chamados']['Row'];

export default function ChamadosPage() {
  const { isAdmin, user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [urgenciaFilter, setUrgenciaFilter] = useState('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchChamados = async () => {
    let query = supabase.from('chamados').select('*');
    if (!isAdmin && user) {
      query = query.eq('solicitante_id', user.id);
    }
    const { data } = await query.order('data_abertura', { ascending: false });
    setChamados(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchChamados();
  }, [isAdmin, user]);

  const filtered = chamados.filter((c) => {
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (urgenciaFilter !== 'todos' && c.urgencia !== urgenciaFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.titulo.toLowerCase().includes(s) || c.local.toLowerCase().includes(s);
    }
    return true;
  });

  const selectedChamado = chamados.find((c) => c.id === selectedId) || null;

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
        <h1 className="text-lg font-semibold text-foreground">Chamados</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Todos os chamados do sistema' : 'Seus chamados'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Urgências</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground w-12">Foto</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Chamado</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Local</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Urgência</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Concluído</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((chamado) => (
              <tr
                key={chamado.id}
                onClick={() => setSelectedId(chamado.id)}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="p-3 text-foreground font-medium">{chamado.titulo}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{chamado.local}</td>
                <td className="p-3"><StatusBadge status={chamado.status} /></td>
                <td className="p-3 hidden md:table-cell"><UrgencyBadge urgency={chamado.urgencia} /></td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs">
                  {new Date(chamado.data_abertura).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3 hidden md:table-cell text-xs">
                  {chamado.conclusao ? (
                    <span className="text-emerald-600 font-medium">Sim</span>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nenhum chamado encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TicketDetailDrawer
        chamado={selectedChamado}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={fetchChamados}
      />
    </div>
  );
}
