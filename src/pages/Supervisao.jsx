import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowUp, ArrowDown, AlertTriangle, Loader2, AlertCircle, Download, Search, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

const AREAS = ["Embutimento", "Embalagem", "Revisão", "Congelamento"];

function hoje() { return new Date().toISOString().slice(0, 10); }

export default function Supervisao() {
  const { perfil, session } = useAuth();
  const somenteLeitura = perfil?.papel === "consulta";

  const [aba, setAba] = useState(somenteLeitura ? "historico" : "lancamento");
  const [data, setData] = useState(hoje());
  const [areaAtiva, setAreaAtiva] = useState("Embutimento");
  const [metas, setMetas] = useState([]);
  const [resultados, setResultados] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const carregarLancamento = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: metasData, error: e1 } = await supabase.from("pcp_metas").select("*").eq("data", data).eq("area", areaAtiva);
    if (e1) { setError(e1.message); setLoading(false); return; }
    const idsMetas = (metasData || []).map((m) => m.id);
    let resultadosData = [];
    if (idsMetas.length > 0) {
      const { data: resData, error: e2 } = await supabase.from("producao_resultados").select("*").in("meta_id", idsMetas);
      if (e2) { setError(e2.message); setLoading(false); return; }
      resultadosData = resData || [];
    }
    setMetas(metasData || []);
    const mapa = {};
    resultadosData.forEach((r) => { mapa[r.meta_id] = { resultado: String(r.resultado), justificativa: r.justificativa || "" }; });
    setResultados(mapa);
    setLoading(false);
  }, [data, areaAtiva]);

  useEffect(() => { if (aba === "lancamento") carregarLancamento(); }, [aba, carregarLancamento]);

  function setResultado(metaId, val) {
    setResultados((r) => ({ ...r, [metaId]: { ...r[metaId], resultado: val } }));
  }
  function setJustificativa(metaId, val) {
    setResultados((r) => ({ ...r, [metaId]: { ...r[metaId], justificativa: val } }));
  }

  async function salvarTudo() {
    setSalvando(true);
    setError(null);
    setSucesso(null);
    const linhas = metas
      .map((m) => {
        const r = resultados[m.id];
        if (!r || r.resultado === "" || r.resultado === undefined) return null;
        return {
          meta_id: m.id,
          data: m.data,
          item: m.item,
          resultado: Number(r.resultado),
          justificativa: r.justificativa || null,
          usuario_id: session?.user?.id,
        };
      })
      .filter(Boolean);

    if (linhas.length === 0) { setError("Preencha ao menos um resultado antes de salvar."); setSalvando(false); return; }

    const faltaJustificativa = linhas.some((l, i) => {
      const meta = metas.find((m) => m.id === l.meta_id);
      return meta && l.resultado < meta.meta && !l.justificativa;
    });
    if (faltaJustificativa) {
      setError("Existe item abaixo da meta sem justificativa preenchida.");
      setSalvando(false);
      return;
    }

    const { error } = await supabase.from("producao_resultados").upsert(linhas, { onConflict: "meta_id" });
    setSalvando(false);
    if (error) return setError(error.message);
    setSucesso("Resultados salvos com sucesso.");
    carregarLancamento();
  }

  return (
    <div>
      <div className="flex gap-1 bg-panel border border-line rounded-lg p-1 w-fit mb-4 flex-wrap">
        {!somenteLeitura && <AbaButton active={aba === "lancamento"} onClick={() => setAba("lancamento")} label="Lançamento do dia" />}
        <AbaButton active={aba === "historico"} onClick={() => setAba("historico")} label="Histórico de lançamentos" />
      </div>

      {aba === "lancamento" && !somenteLeitura ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <h2 className="font-display uppercase tracking-wide text-text text-lg">Lançamento de resultado</h2>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input w-auto" />
          </div>

          <div className="flex gap-1.5 flex-wrap mb-4">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setAreaAtiva(a)} className={`text-sm px-3.5 py-1.5 rounded-full border transition ${areaAtiva === a ? "bg-navy border-navy text-white font-semibold" : "border-line text-muted"}`}>
                {a}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          {sucesso && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-good rounded-lg px-3 py-2 text-sm">
              <Check className="w-4 h-4" /> {sucesso}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>
          ) : metas.length === 0 ? (
            <div className="text-center py-16 text-muted">Nenhuma meta cadastrada para {areaAtiva} nesta data. Peça ao PCP para importar a planilha.</div>
          ) : (
            <>
              <div className="grid gap-3">
                {metas.map((m) => {
                  const r = resultados[m.id] || { resultado: "", justificativa: "" };
                  const resultadoNum = r.resultado === "" ? null : Number(r.resultado);
                  const diferenca = resultadoNum === null ? null : resultadoNum - m.meta;
                  const abaixo = diferenca !== null && diferenca < 0;
                  return (
                    <div key={m.id} className="bg-panel border border-line rounded-lg p-4">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[180px]">
                          <div className="font-semibold text-sm text-text">{m.nome_item}</div>
                          <div className="text-xs text-muted">Item {m.item} · Meta: {m.meta}</div>
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">Resultado</label>
                          <input type="number" className="input" value={r.resultado} onChange={(e) => setResultado(m.id, e.target.value)} />
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-medium">Diferença</label>
                          <div className={`flex items-center gap-1.5 h-9 font-bold ${diferenca === null ? "text-muted" : abaixo ? "text-bad" : "text-good"}`}>
                            {diferenca !== null && (abaixo ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
                            {diferenca === null ? "—" : diferenca > 0 ? `+${diferenca}` : diferenca}
                          </div>
                        </div>
                      </div>
                      {abaixo && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-bad font-medium mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Justificativa (obrigatória — meta não atingida)
                          </label>
                          <textarea className="input" rows={2} value={r.justificativa} onChange={(e) => setJustificativa(m.id, e.target.value)} placeholder="Explique o motivo..." />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={salvarTudo} disabled={salvando} className="mt-4 flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar resultados do dia
              </button>
            </>
          )}
        </>
      ) : (
        <HistoricoSupervisao />
      )}

      <style>{`.input{width:100%;background:#F4F6F9;border:1px solid #E1E6ED;border-radius:6px;padding:8px 10px;font-size:13.5px;color:#152238;outline:none;} .input:focus{border-color:#0B2A4A;}`}</style>
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

function HistoricoSupervisao() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [somenteAnomalias, setSomenteAnomalias] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("producao_resultados").select("*, pcp_metas(nome_item)").order("data", { ascending: false }).limit(200);
      if (error) setError(error.message);
      else setDados(data || []);
      setLoading(false);
    })();
  }, []);

  const filtrado = useMemo(() => {
    return dados.filter((l) => {
      if (areaFiltro !== "todas" && l.area !== areaFiltro) return false;
      if (somenteAnomalias && l.diferenca >= 0) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return [l.item, l.pcp_metas?.nome_item].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [dados, areaFiltro, somenteAnomalias, search]);

  function exportar() {
    const linhas = filtrado.map((l) => ({
      Data: l.data, Área: l.area, Item: l.item, "Nome do item": l.pcp_metas?.nome_item || "",
      Resultado: l.resultado, Diferença: l.diferenca, Justificativa: l.justificativa || "",
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supervisão");
    XLSX.writeFile(wb, `historico-supervisao-${Date.now()}.xlsx`);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4 flex-wrap">
        <h2 className="font-display uppercase tracking-wide text-text text-lg">Histórico de lançamentos</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="input w-auto">
            <option value="todas">Todas as áreas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={somenteAnomalias} onChange={(e) => setSomenteAnomalias(e.target.checked)} /> Só anomalias
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar item..." className="input pl-8 w-44" />
          </div>
          <button onClick={exportar} className="flex items-center gap-2 border border-line text-text text-sm px-3 py-2 rounded-lg hover:bg-bg transition">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-panel text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Data</th><th className="text-left px-3 py-2">Área</th><th className="text-left px-3 py-2">Item</th>
                <th className="text-left px-3 py-2">Nome</th><th className="text-left px-3 py-2">Resultado</th><th className="text-left px-3 py-2">Diferença</th><th className="text-left px-3 py-2">Justificativa</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((l) => {
                const abaixo = l.diferenca < 0;
                return (
                  <tr key={l.id} className={`border-t border-line ${abaixo ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-2 font-mono">{l.data}</td>
                    <td className="px-3 py-2"><span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold">{l.area}</span></td>
                    <td className="px-3 py-2 font-mono">{l.item}</td>
                    <td className="px-3 py-2">{l.pcp_metas?.nome_item}</td>
                    <td className="px-3 py-2">{l.resultado}</td>
                    <td className={`px-3 py-2 font-bold flex items-center gap-1 ${abaixo ? "text-bad" : "text-good"}`}>
                      {abaixo ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                      {l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca}
                    </td>
                    <td className="px-3 py-2 text-muted max-w-[220px] truncate">{l.justificativa || "—"}</td>
                  </tr>
                );
              })}
              {filtrado.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Nenhum lançamento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
                          }
