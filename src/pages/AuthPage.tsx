import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Enviamos um link de redefinição para seu e-mail.');
        setIsForgot(false);
        setIsLogin(true);
      }
    } else if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.session) {
        toast.success('Conta criada com sucesso!');
      } else {
        toast.success('Conta criada! Verifique seu e-mail.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-md p-6 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Design Ops</h1>
            <p className="text-sm text-muted-foreground">
              {isForgot
                ? 'Informe seu e-mail para redefinir a senha'
                : isLogin
                ? 'Faça login para continuar'
                : 'Crie sua conta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgot && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>
            {!isForgot && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isForgot ? 'Enviar link de redefinição' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <div className="text-center">
            {isForgot ? (
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="text-sm text-primary hover:underline"
              >
                Voltar para o login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
