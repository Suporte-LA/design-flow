import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

export default function NovoChamadoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [urgencia, setUrgencia] = useState<string>('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são aceitas');
        return;
      }
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!urgencia) {
      toast.error('Selecione a urgência');
      return;
    }

    setLoading(true);
    let foto_url: string | null = null;

    if (foto) {
      const ext = foto.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chamados-fotos')
        .upload(path, foto);
      if (uploadError) {
        toast.error('Erro ao enviar foto');
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('chamados-fotos')
        .getPublicUrl(path);
      foto_url = urlData.publicUrl;
    }

    const { error } = await supabase.from('chamados').insert({
      titulo,
      descricao: descricao || null,
      local,
      urgencia: urgencia as 'baixa' | 'media' | 'alta' | 'critica',
      foto_url,
      solicitante_id: user.id,
    });

    if (error) {
      toast.error('Erro ao criar chamado');
    } else {
      toast.success('Chamado criado com sucesso!');
      navigate('/chamados');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Novo Chamado</h1>
        <p className="text-sm text-muted-foreground">Preencha os dados da solicitação</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-md p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Chamado *</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            placeholder="Descreva brevemente a solicitação"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes adicionais (opcional)"
            rows={3}
            maxLength={1000}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="local">Local *</Label>
          <Input
            id="local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            required
            placeholder="Local da solicitação"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Urgência *</Label>
          <Select value={urgencia} onValueChange={setUrgencia}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a urgência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Foto</Label>
          {fotoPreview ? (
            <div className="relative inline-block">
              <img src={fotoPreview} alt="Preview" className="h-32 rounded-md border border-border object-cover" />
              <button
                type="button"
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-6 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Abrir Chamado
        </Button>
      </form>
    </div>
  );
}
