import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, LogIn, LogOut, Plus, Package, PackageOpen, X, Loader2, AlertCircle, History, Clock,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

const emptyForm = {
  placa_cavalo: "", placa_carreta: "", transportadora: "", motorista: "", telefone: "", carga_status_entrada: "vazio",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function tempoPermanencia(chegada, saida) {
  const fim = saida ? new Date(saida) : new Date();
  const inicio = new Date(chegada);
  const ms = fim - inicio;
  const horas = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return `${horas}h${min.toString().padStart(2, "0")}`;
}

export default function Portaria() {
  const { perfil } = useAuth();
  const somenteLeitura = perfil?.papel === "consulta";

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editAlvo, setEditAlvo] = useState(null);
  const [saidaAlvo, setSaidaAlvo] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("patio");

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("portaria").select("*").order("data_chegada", { ascending: false });
    if (error) setError(error.message);
    else setRegistros(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const noPatio = useMemo(() => registros.filter((r) => r.status === "patio"), [registros]);
  const historico = useMemo(() => registros.filter((r) => r.status === "finalizado"), [registros]);
  const lista = tab === "patio" ? noPatio : historico;

  const filtrada = useMemo(() => {
    if (!search.trim()) return lista;
    const q = search.trim().toLowerCase();
    return lista.filter((r) => [r.placa_cavalo, r.placa_carreta, r.transportadora, r.motorista].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [lista, search]);

  async function salvarEntrada(dados) {
    const { error } = await supabase.from("portaria").insert({ ...dados, status: "patio", data_chegada: new Date().toISOString() });
    if (error) return setError(error.message);
    setShowForm(false);
    carregar();
  }

  async function salvarEdicao(id, dados) {
    const { error } = await supabase.from("portaria").update(dados).eq("id", id);
    if (error) return setError(error.message);
    setEditAlvo(null);
    carregar();
  }

  async function confirmarSaida(cargaStatusSaida) {
    if (!saidaAlvo) return;
    const { error } = await supabase.from("portaria").update({
      status: "finalizado", data_saida: new Date().toISOString(), carga_status_saida: cargaStatusSaida,
    }).eq("id", saidaAlvo.id);
    if (error) return setError(error.message);
    setSaidaAlvo(null);
    carregar();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <div className="flex gap-1 bg-panel border border-line rounded-lg p-1 w-fit">
          <TabButton active={tab === "patio"} onClick={() => setTab("patio")} icon={Clock} label={`No pátio (${noPatio.length})`} />
          <TabButton active={tab === "historico"} onClick={() => setTab("historico")} icon={History} label={`Histórico (${historico.length})`} />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar placa, transportadora..." className="input pl-8 w-56" />
          </div>
          {!somenteLeitura && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
              <Plus className="w-4 h-4" /> Nova entrada
            </button>
          )}
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
      ) : filtrada.length === 0 ? (
        <div className="text-center py-16 text-muted">{tab === "patio" ? "Nenhum veículo no pátio." : "Nenhum registro no histórico."}</div>
      ) : (
        <div className="grid gap-3">
          {filtrada.map((r) => (
            <RegistroCard key={r.id} r={r} tab={tab} somenteLeitura={somenteLeitura} onEditar={() => setEditAlvo(r)} onSaida={() => setSaidaAlvo(r)} />
          ))}
        </div>
      )}

      {showForm && <FormPortariaModal onClose={() => setShowForm(false)} onSalvar={salvarEntrada} />}
      {editAlvo && <FormPortariaModal registro={editAlvo} onClose={() => setEditAlvo(null)} onSalvar={(dados) => salvarEdicao(editAlvo.id, dados)} />}
      {saidaAlvo && <SaidaModal registro={saidaAlvo} onConfirm={confirmarSaida} onClose={() => setSaidaAlvo(null)} />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition ${active ? "bg-navy text-white font-semibold" : "text-muted hover:text-text"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function RegistroCard({ r, tab, somenteLeitura, onEditar, onSaida }) {
  const carregado = r.carga_status_entrada === "carregado";
  return (
    <div className="bg-panel border border-line rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex items-center gap-3 min-w-[140px]">
        {carregado ? <Package className="w-5 h-5 text-navy flex-shrink-0" /> : <PackageOpen className="w-5 h-5 text-muted flex-shrink-0" />}
        <div>
          <div className="font-mono text-base font-semibold text-text leading-tight">{r.placa_cavalo}</div>
          {r.placa_carreta && <div className="font-mono text-xs text-muted">{r.placa_carreta}</div>}
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-sm">
        <Info label="Transportadora" value={r.transportadora} />
        <Info label="Motorista" value={r.motorista} />
        <Info label="Chegada" value={formatDate(r.data_chegada)} mono />
        {tab === "patio" ? (
          <Info label="Permanência" value={tempoPermanencia(r.data_chegada, null)} mono />
        ) : (
          <>
            <Info label="Saída" value={formatDate(r.data_saida)} mono />
            <Info label="Permanência" value={tempoPermanencia(r.data_chegada, r.data_saida)} mono />
          </>
        )}
      </div>
      {!somenteLeitura && tab === "patio" && (
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEditar} className="border border-line text-text text-sm px-3 py-2 rounded-lg hover:bg-bg transition">Editar</button>
          <button onClick={onSaida} className="flex items-center gap-2 border border-green-300 text-good text-sm px-3 py-2 rounded-lg hover:bg-green-50 transition">
            <LogOut className="w-4 h-4" /> Registrar saída
          </button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-text ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function FormPortariaModal({ registro, onClose, onSalvar }) {
  const editando = !!registro;
  const [form, setForm] = useState(registro ? {
    placa_cavalo: registro.placa_cavalo, placa_carreta: registro.placa_carreta || "", transportadora: registro.transportadora,
    motorista: registro.motorista, telefone: registro.telefone || "", carga_status_entrada: registro.carga_status_entrada,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const carregado = form.carga_status_entrada === "carregado";

  function handleChange(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.placa_cavalo || !form.transportadora || !form.motorista) {
      setError("Preencha placa cavalo, transportadora e motorista.");
      return;
    }
    setSaving(true);
    await onSalvar(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-4 z-20 overflow-y-auto">
      <div className="bg-panel border border-line rounded-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display uppercase tracking-wide text-text flex items-center gap-2">
            <LogIn className="w-4 h-4 text-navy" /> {editando ? `Editar registro — ${registro.placa_cavalo}` : "Nova entrada"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
          {error && (
            <div className="col-span-2 flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <Field label="Placa cavalo *"><input className="input font-mono" value={form.placa_cavalo} onChange={(e) => handleChange("placa_cavalo", e.target.value.toUpperCase())} required /></Field>
          <Field label="Placa carreta"><input className="input font-mono" value={form.placa_carreta} onChange={(e) => handleChange("placa_carreta", e.target.value.toUpperCase())} /></Field>
          <Field label="Transportadora *" className="col-span-2"><input className="input" value={form.transportadora} onChange={(e) => handleChange("transportadora", e.target.value)} required /></Field>
          <Field label="Motorista *" className="col-span-2"><input className="input" value={form.motorista} onChange={(e) => handleChange("motorista", e.target.value)} required /></Field>
          <Field label="Telefone" className="col-span-2"><input className="input" value={form.telefone} onChange={(e) => handleChange("telefone", e.target.value)} /></Field>
          <Field label="Status da carga" className="col-span-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => handleChange("carga_status_entrada", "vazio")} className={`flex-1 py-2 rounded-lg text-sm border ${!carregado ? "bg-blue-50 border-navy text-navy" : "border-line text-muted"}`}>Vazio</button>
              <button type="button" onClick={() => handleChange("carga_status_entrada", "carregado")} className={`flex-1 py-2 rounded-lg text-sm border ${carregado ? "bg-blue-50 border-navy text-navy" : "border-line text-muted"}`}>Carregado</button>
            </div>
          </Field>
          <div className="col-span-2 flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-line text-text py-2 rounded-lg hover:bg-bg transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-navy text-white font-semibold py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editando ? "Salvar alterações" : "Registrar entrada"}
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;background:#F4F6F9;border:1px solid #E1E6ED;border-radius:6px;padding:8px 10px;font-size:13.5px;color:#152238;outline:none;} .input:focus{border-color:#0B2A4A;}`}</style>
    </div>
  );
}

function SaidaModal({ registro, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
      <div className="bg-panel border border-line rounded-xl w-full max-w-sm p-5">
        <h2 className="font-display uppercase tracking-wide text-text mb-1">Registrar saída</h2>
        <p className="text-sm text-muted mb-4 font-mono">{registro.placa_cavalo}</p>
        <p className="text-sm text-text mb-3">O veículo está saindo:</p>
        <div className="flex gap-2 mb-4">
          <button onClick={() => onConfirm("vazio")} className="flex-1 py-2 rounded-lg text-sm border border-line hover:border-navy hover:text-navy transition">Vazio</button>
          <button onClick={() => onConfirm("carregado")} className="flex-1 py-2 rounded-lg text-sm border border-line hover:border-navy hover:text-navy transition">Carregado</button>
        </div>
        <button onClick={onClose} className="w-full border border-line text-text py-2 rounded-lg hover:bg-bg transition text-sm">Cancelar</button>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">{label}</span>
      {children}
    </label>
  );
              }
