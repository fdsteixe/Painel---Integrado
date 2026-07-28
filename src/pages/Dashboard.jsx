import React, { useState, useEffect, useMemo } from "react";
import { Package, PackageOpen, Clock, AlertTriangle, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";

const STATUS_LOG = [
  { value: "aguardando_carregamento", label: "Aguardando carregamento" },
  { value: "aguardando_descarga", label: "Aguardando descarga" },
  { value: "carregado", label: "Carregado" },
  { value: "descarregado", label: "Descarregado" },
  { value: "aguardando_faturamento", label: "Aguardando faturamento" },
];

function horasDesde(iso) { return (Date.now() - new Date(iso).getTime()) / 3_600_000; }
function hoje() { return new Date().toISOString().slice(0, 10); }

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [patio, setPatio] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [metas, setMetas] = useState([]);
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = hoje();
      const [{ data: patioData }, { data: viagensData }, { data: metasData }, { data: resultadosData }] = await Promise.all([
        supabase.from("portaria").select("*").eq("status", "patio"),
        supabase.from("logistica").select("*").eq("finalizada", false),
        supabase.from("pcp_metas").select("*").eq("data", data),
        supabase.from("producao_resultados").select("*").eq("data", data),
      ]);
      setPatio(patioData || []);
      setViagens(viagensData || []);
      setMetas(metasData || []);
      setResultados(resultadosData || []);
      setLoading(false);
    })();
  }, []);

  const patioComTempo = useMemo(() => patio.map((v) => ({ ...v, horas: horasDesde(v.data_chegada) })).sort((a, b) => b.horas - a.horas), [patio]);
  const carregados = patio.filter((v) => v.carga_status_entrada === "carregado").length;
  const vazios = patio.filter((v) => v.carga_status_entrada === "vazio").length;
  const alertaPermanencia = patioComTempo.filter((v) => v.horas >= 4);
  const permanenciaMedia = patioComTempo.length ? patioComTempo.reduce((s, v) => s + v.horas, 0) / patioComTempo.length : 0;

  const viagensPorStatus = STATUS_LOG.map((s) => ({ ...s, count: viagens.filter((v) => v.status === s.value).length }));

  const producao = metas.map((m) => {
    const r = resultados.find((res) => res.meta_id === m.id);
    return { item: m.nome_item, meta: m.meta, realizado: r ? r.resultado : null };
  });
  const maxProd = Math.max(1, ...producao.map((p) => Math.max(p.meta, p.realizado || 0)));
  const anomaliasHoje = resultados.filter((r) => r.diferenca < 0).length;

  if (loading) {
    return <div className="flex items-center justify-center gap-2 text-muted py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>;
  }

  const stats = [
    { label: "Veículos no pátio", value: String(patio.length) },
    { label: "Permanência média", value: `${permanenciaMedia.toFixed(1)}h` },
    { label: "Viagens em operação", value: String(viagens.length) },
    { label: "Itens abaixo da meta hoje", value: String(anomaliasHoje) },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-panel border border-line rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1.5">{s.label}</div>
            <div className="font-display text-2xl font-semibold text-navy">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-[minmax(220px,1fr)_2fr] gap-4">
        <div className="bg-panel border border-line rounded-xl p-4">
          <h3 className="font-display uppercase tracking-wide text-text text-sm mb-3">Composição do pátio</h3>
          <div className="grid gap-3">
            <ComposicaoBar label="Carregados" value={carregados} total={patio.length} icon={Package} />
            <ComposicaoBar label="Vazios" value={vazios} total={patio.length} icon={PackageOpen} muted />
          </div>
        </div>

        <div className="bg-panel border border-line rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display uppercase tracking-wide text-text text-sm">Veículos no pátio agora</h3>
            {alertaPermanencia.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-bad border border-red-200 font-semibold">{alertaPermanencia.length} acima de 4h</span>
            )}
          </div>
          <div className="grid gap-2">
            {patioComTempo.length === 0 && <div className="text-sm text-muted py-4 text-center">Nenhum veículo no pátio.</div>}
            {patioComTempo.map((v) => {
              const alerta = v.horas >= 4;
              return (
                <div key={v.id} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${alerta ? "bg-red-50" : "bg-bg"}`}>
                  {v.carga_status_entrada === "carregado" ? <Package className="w-4 h-4 text-navy" /> : <PackageOpen className="w-4 h-4 text-muted" />}
                  <span className="font-mono font-bold min-w-[90px]">{v.placa_cavalo}</span>
                  <span className="flex-1 text-muted text-xs truncate">{v.transportadora}</span>
                  <span className={`flex items-center gap-1 font-semibold ${alerta ? "text-bad" : "text-text"}`}>
                    {alerta && <AlertTriangle className="w-3.5 h-3.5" />}
                    <Clock className="w-3.5 h-3.5" /> {v.horas.toFixed(1)}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-xl p-4">
        <h3 className="font-display uppercase tracking-wide text-text text-sm mb-3">Viagens por status ({viagens.length} em operação)</h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {viagensPorStatus.map((s) => (
            <div key={s.value} className="border border-line rounded-lg p-3">
              <div className="text-xs text-muted mb-1.5">{s.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-navy">{s.count}</span>
                <span className="text-xs text-muted">{viagens.length > 0 ? Math.round((s.count / viagens.length) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg overflow-hidden mt-2">
                <div className="h-full bg-navy rounded-full" style={{ width: `${viagens.length > 0 ? (s.count / viagens.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-panel border border-line rounded-xl p-4">
        <h3 className="font-display uppercase tracking-wide text-text text-sm mb-3">Produção — meta x realizado (hoje)</h3>
        {producao.length === 0 ? (
          <div className="text-sm text-muted py-4 text-center">Nenhuma meta cadastrada para hoje.</div>
        ) : (
          <div className="grid gap-3.5">
            {producao.map((p) => {
              const abaixo = p.realizado !== null && p.realizado < p.meta;
              return (
                <div key={p.item}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{p.item}</span>
                    <span className={`flex items-center gap-1 font-semibold ${p.realizado === null ? "text-muted" : abaixo ? "text-bad" : "text-good"}`}>
                      {p.realizado !== null && (abaixo ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
                      {p.realizado === null ? "sem lançamento" : `${p.realizado} / ${p.meta}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg overflow-hidden">
                    <div className={`h-full rounded-full ${abaixo ? "bg-bad" : "bg-navy"}`} style={{ width: `${((p.realizado || 0) / maxProd) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ComposicaoBar({ label, value, total, icon: Icon, muted }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-1">
        <Icon className={`w-3.5 h-3.5 ${muted ? "text-muted" : "text-navy"}`} />
        <span className="flex-1">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-bg overflow-hidden">
        <div className={`h-full rounded-full ${muted ? "bg-muted" : "bg-navy"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
                      }
