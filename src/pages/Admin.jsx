import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, X, Search, Trash2, Loader2, AlertCircle, Copy, Check, Crown, Truck, Package, Upload, ClipboardCheck, Eye, ShieldCheck } from "lucide-react";
import { supabase } from "../supabaseClient";

const PAPEIS = [
  { value: "admin", label: "Administrador", icon: Crown },
  { value: "portaria", label: "Portaria", icon: Truck },
  { value: "logistica", label: "Logística", icon: Package },
  { value: "pcp", label: "PCP", icon: Upload },
  { value: "supervisao", label: "Supervisão", icon: ClipboardCheck },
  { value: "consulta", label: "Consulta (só leitura)", icon: Eye },
];

function papelInfo(v) { return PAPEIS.find((p) => p.value === v) || PAPEIS[5]; }

function gerarSenha() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("perfis").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setUsuarios(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    if (!search.trim()) return usuarios;
    const q = search.trim().toLowerCase();
    return usuarios.filter((u) => [u.nome, u.email].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [usuarios, search]);

  async function toggleAtivo(u) {
    const { error } = await supabase.from("perfis").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) setError(error.message);
    else carregar();
  }

  async function excluir(id) {
    const { error } = await supabase.from("perfis").delete().eq("id", id);
    setConfirmarExclusao(null);
    if (error) setError(error.message);
    else carregar();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <h2 className="font-display uppercase tracking-wide text-text text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-navy" /> Administração — usuários ({usuarios.length})
        </h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="input pl-8 w-56" />
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
            <Plus className="w-4 h-4" /> Novo usuário
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted">Nenhum usuário encontrado.</div>
      ) : (
        <div className="grid gap-2.5">
          {filtrados.map((u) => {
            const info = papelInfo(u.papel);
            const Icon = info.icon;
            return (
              <div key={u.id} className={`bg-panel border border-line rounded-lg px-4 py-3 flex flex-wrap items-center gap-4 ${!u.ativo ? "opacity-50" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-bg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-navy" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-semibold text-sm text-text">{u.nome}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold whitespace-nowrap">{info.label}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                  <input type="checkbox" checked={u.ativo} onChange={() => toggleAtivo(u)} /> Ativo
                </label>
                <button onClick={() => setConfirmarExclusao(u)} className="text-bad hover:bg-red-50 p-1.5 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <NovoUsuarioModal onClose={() => setShowForm(false)} onCriado={() => { setShowForm(false); carregar(); }} />}

      {confirmarExclusao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-panel border border-line rounded-xl w-full max-w-sm p-5">
            <p className="text-sm mb-4">Remover o acesso de <strong>{confirmarExclusao.nome}</strong>? Isso remove o perfil dele, mas não apaga o login em si.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarExclusao(null)} className="flex-1 border border-line text-text py-2 rounded-lg hover:bg-bg transition">Cancelar</button>
              <button onClick={() => excluir(confirmarExclusao.id)} className="flex-1 bg-bad text-white font-semibold py-2 rounded-lg hover:brightness-110 transition">Remover</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;background:#F4F6F9;border:1px solid #E1E6ED;border-radius:6px;padding:8px 10px;font-size:13.5px;color:#152238;outline:none;} .input:focus{border-color:#0B2A4A;}`}</style>
    </div>
  );
}

function NovoUsuarioModal({ onClose, onCriado }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("portaria");
  const [senha, setSenha] = useState(gerarSenha());
  const [copiado, setCopiado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function copiarSenha() {
    navigator.clipboard?.writeText(senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome || !email) return;
    setSaving(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { nome, email, senha, papel },
      headers: { Authorization: `Bearer ${token}` },
    });

    setSaving(false);
    if (error || data?.ok === false) {
      setError(data?.error || error?.message || "Erro ao criar usuário.");
      return;
    }
    onCriado();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-4 z-20 overflow-y-auto">
      <div className="bg-panel border border-line rounded-xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display uppercase tracking-wide text-text flex items-center gap-2"><Plus className="w-4 h-4 text-navy" /> Novo usuário</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 grid gap-3">
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">Nome completo *</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">E-mail (será o login) *</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">Perfil de acesso *</label>
            <div className="grid grid-cols-2 gap-2">
              {PAPEIS.map((p) => {
                const Icon = p.icon;
                const ativo = papel === p.value;
                return (
                  <button type="button" key={p.value} onClick={() => setPapel(p.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left border transition ${ativo ? "bg-blue-50 border-navy text-navy font-semibold" : "border-line text-muted"}`}>
                    <Icon className="w-3.5 h-3.5" /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">Senha temporária</label>
            <div className="flex gap-2">
              <input className="input font-mono" value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button type="button" onClick={copiarSenha} className="flex items-center gap-1.5 border border-line text-text px-3 rounded-lg text-xs hover:bg-bg transition">
                {copiado ? <Check className="w-3.5 h-3.5 text-good" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-muted mt-1">Repasse essa senha à pessoa por um canal seguro.</p>
          </div>

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-line text-text py-2 rounded-lg hover:bg-bg transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-navy text-white font-semibold py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
            }
