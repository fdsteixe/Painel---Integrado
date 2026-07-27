import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) carregarPerfil(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) carregarPerfil(newSession.user.id);
      else {
        setPerfil(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function carregarPerfil(userId) {
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error) setPerfil(data);
    setLoading(false);
  }

  async function login(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, perfil, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Papéis que podem acessar/editar cada tela
export const PERMISSOES = {
  portaria: ["portaria", "admin"],
  logistica: ["logistica", "admin"],
  pcp: ["pcp", "admin"],
  supervisao: ["supervisao", "admin"],
  admin: ["admin"],
  dashboard: ["portaria", "logistica", "pcp", "supervisao", "consulta", "admin"],
  historico: ["portaria", "logistica", "pcp", "supervisao", "consulta", "admin"],
};

export function podeAcessar(tela, papel) {
  return PERMISSOES[tela]?.includes(papel) ?? false;
}
