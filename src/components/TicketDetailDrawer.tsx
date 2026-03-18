import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, UrgencyBadge } from '@/pages/DashboardPage';
import { toast } from 'sonner';
import { Loader2, Clock, ArrowRight, ImageIcon } from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';
import type { Database } from '@/integrations/supabase/types';

type Chamado = Database['public']['Tables']['chamados']['Row'];
type Historico = Database['public']['Tables']['historico_chamados']['Row'];

interface TicketDetailDrawerProps {
  chamado: Chamado | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  aguardando: 'Aguardando',
  finalizado: 'Finalizado',
};

export default function TicketDetailDrawer({ chamado, open, onClose, onUpdate }: TicketDetailDrawerProps) {
  const { isAdmin, user } = useAuth();
  const [status, setStatus] = useState('');
  const [conclusao, setConclusao] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<Historico[]>([]);

  useEffect(() => {
    if (chamado) {
      setStatus(chamado.status);
      setConclusao(chamado.conclusao);
      setObservacoes('');
      setResponsavel(chamado.responsavel || '');
      fetchHistorico(chamado.id);
    }
  }, [chamado]);

  const fetchHistorico = async (chamadoId: string) => {
    const { data } = await supabase
      .from('historico_chamados')
      .select('*')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true });
    setHistorico(data || []);
  };

  const handleSave = async () => {
    if (!chamado || !user) return;

    if (conclusao && status !== 'finalizado') {
      toast.error('O chamado só pode ser concluído quando o status for "Finalizado"');
      return;
    }

    // Require observation when changing status
    const statusChanged = status !== chamado.status;
    if (statusChanged && !observacoes.trim()) {
      toast.error('Informe uma observação ao alterar o status do chamado');
      return;
    }

    setSaving(true);

    const updates: Database['public']['Tables']['chamados']['Update'] = {
      status: status as Chamado['status'],
      conclusao,
      observacoes_adm: observacoes || chamado.observacoes_adm || null,
      responsavel: responsavel || null,
      data_conclusao: conclusao ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('chamados')
      .update(updates)
      .eq('id', chamado.id);

    if (error) {
      toast.error('Erro ao atualizar chamado');
    } else {
      const changes: string[] = [];
      if (statusChanged) changes.push(`Status: ${STATUS_LABELS[chamado.status] || chamado.status} → ${STATUS_LABELS[status] || status}`);
      if (conclusao !== chamado.conclusao) changes.push(`Conclusão: ${chamado.conclusao ? 'Sim' : 'Não'} → ${conclusao ? 'Sim' : 'Não'}`);
      if (responsavel !== (chamado.responsavel || '')) changes.push(`Responsável: ${responsavel}`);

      if (changes.length > 0 || observacoes.trim()) {
        await supabase.from('historico_chamados').insert({
          chamado_id: chamado.id,
          user_id: user.id,
          alteracao: changes.length > 0 ? changes.join('; ') : 'Observação adicionada',
          observacao: observacoes.trim() || null,
        });
      }

      toast.success('Chamado atualizado!');
      setObservacoes('');
      onUpdate();
      fetchHistorico(chamado.id);
    }
    setSaving(false);
  };

  if (!chamado) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">{chamado.titulo}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Photo */}
          {chamado.foto_url ? (
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <ImageIcon className="h-3 w-3" /> Foto anexada
              </span>
              <img
                src={chamado.foto_url}
                alt="Foto do chamado"
                className="rounded-md border border-border w-full max-h-64 object-cover"
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <ImageIcon className="h-6 w-6 mb-1" />
              Sem foto anexada
            </div>
          )}

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Local</span>
              <p className="font-medium text-foreground">{chamado.local}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Urgência</span>
              <div className="mt-0.5"><UrgencyBadge urgency={chamado.urgencia} /></div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <div className="mt-0.5"><StatusBadge status={chamado.status} /></div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Abertura</span>
              <p className="font-medium text-foreground text-xs">
                {new Date(chamado.data_abertura).toLocaleString('pt-BR')}
              </p>
            </div>
            {chamado.responsavel && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Responsável</span>
                <p className="font-medium text-foreground">{chamado.responsavel}</p>
              </div>
            )}
          </div>

          {chamado.descricao && (
            <div>
              <span className="text-xs text-muted-foreground">Descrição</span>
              <p className="text-sm text-foreground mt-1">{chamado.descricao}</p>
            </div>
          )}

          {/* Timeline History — visible to everyone */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Acompanhamento
            </h3>
            {historico.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma movimentação registrada ainda.</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-border space-y-4">
                {historico.map((h) => (
                  <div key={h.id} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-[calc(1rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                    <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{h.alteracao}</span>
                      </div>
                      {h.observacao && (
                        <p className="text-foreground/80 bg-background/60 rounded px-2 py-1.5 mt-1">
                          <span className="font-medium text-muted-foreground">Obs: </span>
                          {h.observacao}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {new Date(h.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Ações do Administrador</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome do responsável"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Observação {status !== chamado.status && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Aguardando orçamento da gráfica..."
                    rows={3}
                    maxLength={2000}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Descreva o que foi feito ou o motivo da alteração. Isso ficará visível no acompanhamento.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={conclusao}
                    onCheckedChange={setConclusao}
                    disabled={status !== 'finalizado'}
                  />
                  <Label className="text-xs">Marcar como concluído</Label>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
