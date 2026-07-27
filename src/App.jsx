import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";
import Shell from "./Shell";
import { Loader2 } from "lucide-react";

function Root() {
  const { session, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted gap-2" style={{ background: "#F4F6F9" }}>
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!session) return <Login />;

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-center px-4" style={{ background: "#F4F6F9" }}>
        Seu usuário não tem um perfil configurado ainda.<br />
        Peça ao administrador para cadastrar seu papel na tela Admin.
      </div>
    );
  }

  if (perfil.ativo === false) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-center px-4" style={{ background: "#F4F6F9" }}>
        Seu acesso foi desativado.<br />
        Fale com o administrador do sistema.
      </div>
    );
  }

  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
