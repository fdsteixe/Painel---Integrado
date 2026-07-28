import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, Search, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Historico() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("historico_unificado").select("*");
    if (error) setError(error.message);
    else setDados(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrada = useMemo(() => {
    if (!search.trim()) return dados;
    const q = search.trim().toLowerCase();
    return dados.filter((r) => [r.placa_cavalo, r.transportadora, r.motorista, r.numero_viagem].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [dados, search]);

  function exportar() {
    const linhas = filtrada.map((r) => ({
      "Placa Cavalo": r.placa_cavalo,
      "Placa Carreta": r.placa_carreta || "",
      Transportadora: r.transportadora,
      Motorista: r.motorista,
      Telefone: r.telefone || "",
      "Carga (entrada)": r.carga_status_entrada,
      "Carga (saída)": r.carga_status_saida || "",
      Chegada: formatDate(r.data_chegada),
      Saída: formatDate(r.data_saida),
      "Permanência (h)": r.tempo_permanencia_horas ? Number(r.tempo_permanencia_horas).toFixed(1) : "",
      "Nº Viagem": r.numero_viagem || "",
      "Data viagem": r.data_viagem || "",
      "Status logística": r.status_logistica || "",
      "Viagem finalizada": r.viagem_finalizada ? "Sim" : "Não",
      "Observação logística": r.observacao_logistica || "",
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `historico-unificado-${Date.now()}.xlsx`);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-1">
        <h2 className="font-display uppercase tracking-wide text-text text-lg">Histórico unificado</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="input pl-8 w-56" />
          </div>
          <button onClick={exportar} className="flex items-center gap-2 border border-line text-text text-sm px-3 py-2 rounded-lg hover:bg-bg transition">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>
      <p className="text-xs text-muted mb-4">
        A exportação inclui dados da portaria (entrada e saída) e da viagem associada na logística, com observações.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>
      ) : filtrada.length === 0 ? (
        <div className="text-center py-16 text-muted">Nenhum registro no histórico ainda.</div>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-panel text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Placa</th>
                <th className="text-left px-3 py-2">Transportadora</th>
                <th className="text-left px-3 py-2">Motorista</th>
                <th className="text-left px-3 py-2">Chegada</th>
                <th className="text-left px-3 py-2">Saída</th>
                <th className="text-left px-3 py-2">Permanência</th>
                <th className="text-left px-3 py-2">Carga saída</th>
                <th className="text-left px-3 py-2">Viagem</th>
                <th className="text-left px-3 py-2">Status log.</th>
                <th className="text-left px-3 py-2">Obs. logística</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((r) => (
                <tr key={r.portaria_id} className="border-t border-line">
                  <td className="px-3 py-2 font-mono">{r.placa_cavalo}</td>
                  <td className="px-3 py-2">{r.transportadora}</td>
                  <td className="px-3 py-2">{r.motorista}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(r.data_chegada)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(r.data_saida)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.tempo_permanencia_horas ? `${Number(r.tempo_permanencia_horas).toFixed(1)}h` : "—"}</td>
                  <td className="px-3 py-2 capitalize">{r.carga_status_saida || "—"}</td>
                  <td className="px-3 py-2">{r.numero_viagem || "—"}</td>
                  <td className="px-3 py-2">{r.status_logistica || "—"}</td>
                  <td className="px-3 py-2 text-muted max-w-[200px] truncate">{r.observacao_logistica || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
