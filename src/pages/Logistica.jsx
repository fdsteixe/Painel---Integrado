import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, X, Loader2, AlertCircle, Search, Truck, Check } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

const STATUS_OPCOES = [
  { value: "aguardando_carregamento", label: "Aguardando carregamento" },
  { value: "aguardando_descarga", label: "Aguardando descarga" },
  { value: "carregado", label: "Carregado" },
  { value: "descarregado", label: "Descarregado" },
  { value: "aguardando_faturamento", label: "Aguardando faturamento" },
];

function statusInfo(value) { return STATUS_OPCOES.find((s) => s.value === value) || { label: value }; }
function formatDate(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("pt-BR"); }

export default function Logistica() {
  const { perfil } = useAuth();
  const somenteLeitura = perfil?.papel === "consulta";

  const [aba, setAba] = useState("viagens");
  const [viagens, setViagens] = useState([]);
  const [portariaAtiva, setPortariaAtiva] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editAlvo, setEditAlvo] = useState(null);
  const [search, setSearch] = useState("");
  const [searchFinal, setSearchFinal] = useState("");
  const [searchPatio, setSearchPatio] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: viagensData, error: e1 }, { data: portariaData, error: e2 }] = await Promise.all([
      supabase.from("logistica").select("*, portaria(placa_cavalo, placa_carreta, transportadora, motorista, telefone, status)").order("created_at", { ascending: false }),
      supabase.from("portaria").select("id, placa_cavalo, placa_carreta, transportadora, motorista, telefone").eq("status", "patio"),
    ]);
    if (e1 || e2) setError((e1 || e2).message);
    else { setViagens(viagensData || []); setPortariaAtiva(portariaData || []); }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const emOperacao = useMemo(() => viagens.filter((v) => !v.finalizada), [viagens]);
  const finalizadas = useMemo(() => viagens.filter((v) => v.finalizada), [viagens]);

  const filtrada = useMemo(() => {
    if (!search.trim()) return emOperacao;
    const q = search.trim().toLowerCase();
    return emOperacao.filter((v) => [v.numero_viagem, v.portaria?.placa_cavalo, v.portaria?.transportadora].filter(Boolean).some((val) => val.toLowerCase().includes(q)));
  }, [emOperacao, search]);

  const finalizadasFiltradas = useMemo(() => {
    if (!searchFinal.trim()) return finalizadas;
    const q = searchFinal.trim().toLowerCase();
    return finalizadas.filter((v) => [v.numero_viagem, v.portaria?.placa_cavalo, v.portaria?.transportadora].filter(Boolean).some((val) => val.toLowerCase().includes(q)));
  }, [finalizadas, searchFinal]);

  const patioFiltrado = useMemo(() => {
    if (!searchPatio.trim()) return portariaAtiva;
    const q = searchPatio.trim().toLowerCase();
    return portariaAtiva.filter((p) => [p.placa_cavalo, p.placa_carreta, p.transportadora, p.motorista].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [portariaAtiva, searchPatio]);

  async function criarViagem(dados) {
    const { error } = await supabase.from("logistica").insert(dados);
    if (error) return setError(error.message);
    setShowForm(false);
    carregar();
  }

  async function salvarEdicao(id, dados) {
    const { error } = await supabase.from("logistica").update({ ...dados, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setError(error.message);
    setEditAlvo(null);
    carregar();
  }

  async function finalizarViagem(id, dados) {
    const { error } = await supabase.from("logistica").update({
      ...dados, finalizada: true, finalizada_em: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return setError(error.message);
    setEditAlvo(null);
    setAba("finalizadas");
    carregar();
  }

  return (
    <div>
      <div className="flex gap-1 bg-panel border border-line rounded-lg p-1 w-fit mb-4 flex-wrap">
        <AbaButton active={aba === "viagens"} onClick={() => setAba("viagens")} label={`Em operação (${emOperacao.length})`} />
        <AbaButton active={aba === "finalizadas"} onClick={() => setAba("finalizadas")} label={`Operações finalizadas (${finalizadas.length})`} />
        <AbaButton active={aba === "patio"} onClick={() => setAba("patio")} label="Consulta — veículos no pátio" />
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
      ) : aba === "viagens" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <h2 className="font-display uppercase tracking-wide text-text text-lg">Logística — em operação</h2>
            <div className="flex gap-2">
              <SearchBox value={search} onChange={setSearch} placeholder="Buscar viagem, placa..." />
              {!somenteLeitura && (
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
                  <Plus className="w-4 h-4" /> Adicionar viagem
                </button>
              )}
            </div>
          </div>
          {filtrada.length === 0 ? (
            <div className="text-center py-16 text-muted">Nenhuma viagem em operação.</div>
          ) : (
            <div className="grid gap-3">
              {filtrada.map((v) => (
                <div key={v.id} className="bg-panel border border-line rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="min-w-[140px]">
                    <div className="font-mono text-base font-semibold text-text">{v.portaria?.placa_cavalo || "—"}</div>
                    <div className="text-xs text-muted">Viagem {v.numero_viagem}</div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                    <Info label="Transportadora" value={v.portaria?.transportadora} />
                    <Info label="Data viagem" value={formatDate(v.data_viagem)} mono />
                    <Info label="Observação" value={v.observacao} />
                  </div>
                  <Badge>{statusInfo(v.status).label}</Badge>
                  {!somenteLeitura && (
                    <button onClick={() => setEditAlvo(v)} className="border border-line text-text text-sm px-3 py-2 rounded-lg hover:bg-bg transition">Editar</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : aba === "finalizadas" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <h2 className="font-display uppercase tracking-wide text-text text-lg">Operações finalizadas</h2>
            <SearchBox value={searchFinal} onChange={setSearchFinal} placeholder="Buscar viagem, placa..." />
          </div>
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-panel text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Placa</th>
                  <th className="text-left px-3 py-2">Transportadora</th>
                  <th className="text-left px-3 py-2">Viagem</th>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Status final</th>
                  <th className="text-left px-3 py-2">Observação</th>
                </tr>
              </thead>
              <tbody>
                {finalizadasFiltradas.map((v) => (
                  <tr key={v.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono">{v.portaria?.placa_cavalo}</td>
                    <td className="px-3 py-2">{v.portaria?.transportadora}</td>
                    <td className="px-3 py-2">{v.numero_viagem}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(v.data_viagem)}</td>
                    <td className="px-3 py-2">{statusInfo(v.status).label}</td>
                    <td className="px-3 py-2 text-muted">{v.observacao || "—"}</td>
                  </tr>
                ))}
                {finalizadasFiltradas.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">Nenhuma operação finalizada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-1">
            <h2 className="font-display uppercase tracking-wide text-text text-lg">Veículos no pátio agora ({portariaAtiva.length})</h2>
            <SearchBox value={searchPatio} onChange={setSearchPatio} placeholder="Buscar placa, motorista..." />
          </div>
          <p className="text-xs text-muted mb-4">Consulta rápida (somente leitura) para checar telefone do motorista, placas e transportadora.</p>
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-panel text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Placa cavalo</th>
                  <th className="text-left px-3 py-2">Placa carreta</th>
                  <th className="text-left px-3 py-2">Transportadora</th>
                  <th className="text-left px-3 py-2">Motorista</th>
                  <th className="text-left px-3 py-2">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {patioFiltrado.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono font-semibold">{p.placa_cavalo}</td>
                    <td className="px-3 py-2 font-mono">{p.placa_carreta || "—"}</td>
                    <td className="px-3 py-2">{p.transportadora}</td>
                    <td className="px-3 py-2">{p.motorista}</td>
                    <td className="px-3 py-2 font-mono">{p.telefone || "—"}</td>
                  </tr>
                ))}
                {patioFiltrado.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Nenhum veículo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && <NovaViagemModal portariaAtiva={portariaAtiva} onClose={() => setShowForm(false)} onSalvar={criarViagem} />}
      {editAlvo && <EditarViagemModal viagem={editAlvo} onClose={() => setEditAlvo(null)} onSalvar={(dados) => salvarEdicao(editAlvo.id, dados)} onFinalizar={(dados) => finalizarViagem(editAlvo.id, dados)} />}
    </div>
  );
}

function AbaButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition ${active ? "bg-navy text-white font-semibold" : "text-muted hover:text-text"}`}>
      {label}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-8 w-56" />
    </div>
  );
}

function Badge({ children }) {
  return <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold whitespace-nowrap">{children}</span>;
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-text ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function NovaViagemModal({ portariaAtiva, onClose, onSalvar }) {
  const [portariaId, setPortariaId] = useState("");
  const [numeroViagem, setNumeroViagem] = useState("");
  const [dataViagem, setDataViagem] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("aguardando_carregamento");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!portariaId || !numeroViagem) { setError("Selecione a placa e informe o número da viagem."); return; }
    setSaving(true);
    await onSalvar({ portaria_id: portariaId, numero_viagem: numeroViagem, data_viagem: dataViagem, status, observacao });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-4 z-20 overflow-y-auto">
      <div className="bg-panel border border-line rounded-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display uppercase tracking-wide text-text flex items-center gap-2"><Truck className="w-4 h-4 text-navy" /> Nova viagem</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
          {error && <div className="col-span-2 flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
          <Field label="Placa (veículo no pátio) *" className="col-span-2">
            <select className="input" value={portariaId} onChange={(e) => setPortariaId(e.target.value)} required>
              <option value="">Selecione...</option>
              {portariaAtiva.map((p) => <option key={p.id} value={p.id}>{p.placa_cavalo} — {p.transportadora}</option>)}
            </select>
          </Field>
          <Field label="Número da viagem *"><input className="input font-mono" value={numeroViagem} onChange={(e) => setNumeroViagem(e.target.value)} required /></Field>
          <Field label="Data da viagem"><input type="date" className="input" value={dataViagem} onChange={(e) => setDataViagem(e.target.value)} /></Field>
          <Field label="Status" className="col-span-2">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPCOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Observação" className="col-span-2"><textarea className="input" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></Field>
          <div className="col-span-2 flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-line text-text py-2 rounded-lg hover:bg-bg transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-navy text-white font-semibold py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;background:#F4F6F9;border:1px solid #E1E6ED;border-radius:6px;padding:8px 10px;font-size:13.5px;color:#152238;outline:none;} .input:focus{border-color:#0B2A4A;}`}</style>
    </div>
  );
}

function EditarViagemModal({ viagem, onClose, onSalvar, onFinalizar }) {
  const [status, setStatus] = useState(viagem.status);
  const [dataViagem, setDataViagem] = useState(viagem.data_viagem || "");
  const [observacao, setObservacao] = useState(viagem.observacao || "");
  const [saving, setSaving] = useState(false);
  const podeFinalizar = status === "carregado" || status === "descarregado";

  async function salvar() { setSaving(true); await onSalvar({ status, data_viagem: dataViagem, observacao }); setSaving(false); }
  async function finalizar() { setSaving(true); await onFinalizar({ status, data_viagem: dataViagem, observacao }); setSaving(false); }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-4 z-20 overflow-y-auto">
      <div className="bg-panel border border-line rounded-xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display uppercase tracking-wide text-text flex items-center gap-2"><Truck className="w-4 h-4 text-navy" /> Editar viagem — {viagem.numero_viagem}</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 grid gap-3">
          <div className="text-sm text-muted">
            Placa <strong className="text-text font-mono">{viagem.portaria?.placa_cavalo}</strong> · {viagem.portaria?.transportadora}
          </div>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPCOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Data da viagem"><input type="date" className="input" value={dataViagem} onChange={(e) => setDataViagem(e.target.value)} /></Field>
          <Field label="Observação"><textarea rows={3} className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} /></Field>

          {podeFinalizar && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-good flex gap-2">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Carregamento/descarga concluído — se não há mais nada pendente, finalize a operação para movê-la ao histórico.
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="flex-1 border border-line text-text py-2 rounded-lg hover:bg-bg transition">Cancelar</button>
            <button onClick={salvar} disabled={saving} className="flex-1 border border-navy text-navy font-semibold py-2 rounded-lg hover:bg-blue-50 transition disabled:opacity-60">Salvar alterações</button>
          </div>
          <button onClick={finalizar} disabled={saving} className="w-full bg-good text-white font-semibold py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Finalizar viagem
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:#F4F6F9;border:1px solid #E1E6ED;border-radius:6px;padding:8px 10px;font-size:13.5px;color:#152238;outline:none;} .input:focus{border-color:#0B2A4A;}`}</style>
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
