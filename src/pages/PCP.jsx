import React, { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, Check, Loader2, AlertCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

const AREAS = ["Embutimento", "Embalagem", "Revisão", "Congelamento"];

function excelDateToISO(value) {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const partsBr = value.split("/");
    if (partsBr.length === 3) return `${partsBr[2]}-${partsBr[1].padStart(2, "0")}-${partsBr[0].padStart(2, "0")}`;
    return value;
  }
  return null;
}

export default function PCP() {
  const { perfil } = useAuth();
  const somenteLeitura = perfil?.papel === "consulta";
  const fileInputRef = useRef(null);

  const [metasCadastradas, setMetasCadastradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pcp_metas").select("*").order("data", { ascending: false }).limit(100);
    if (error) setError(error.message);
    else setMetasCadastradas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSucesso(null);
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const linhas = rows.map((r) => {
          const data = excelDateToISO(r["Data"] ?? r["data"]);
          const area = String(r["Área"] ?? r["area"] ?? r["Area"] ?? "").trim();
          const item = String(r["Item"] ?? r["item"] ?? "").trim();
          const nome_item = String(r["Nome item"] ?? r["Nome Item"] ?? r["nome_item"] ?? "").trim();
          const meta = Number(r["Meta"] ?? r["meta"] ?? 0);
          return { data, area, item, nome_item, meta };
        }).filter((l) => l.item);
        if (linhas.length === 0) {
          setError("Não encontrei linhas válidas. Confira se a planilha tem as colunas: Data, Área, Item, Nome item, Meta.");
          return;
        }
        const areasInvalidas = linhas.filter((l) => !AREAS.includes(l.area));
        if (areasInvalidas.length > 0) {
          setError(`Algumas linhas têm área inválida (esperado: ${AREAS.join(", ")}). Confira a coluna "Área".`);
          return;
        }
        setPreview(linhas);
      } catch (err) {
        setError("Não consegui ler essa planilha. Confira se é um arquivo .xlsx ou .csv válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function confirmarImportacao() {
    if (!preview) return;
    setSalvando(true);
    setError(null);
    const { error } = await supabase.from("pcp_metas").upsert(preview, { onConflict: "data,item" });
    setSalvando(false);
    if (error) return setError(error.message);
    setSucesso(`${preview.length} metas importadas com sucesso.`);
    setPreview(null);
    setNomeArquivo("");
    carregar();
  }

  if (somenteLeitura) {
    return (
      <div>
        <h2 className="font-display uppercase tracking-wide text-text text-lg mb-4">PCP — metas cadastradas</h2>
        <TabelaMetas metas={metasCadastradas} loading={loading} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display uppercase tracking-wide text-text text-lg mb-4">PCP — importação de metas</h2>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {sucesso && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-good rounded-lg px-3 py-2 text-sm">
          <Check className="w-4 h-4" /> {sucesso}
        </div>
      )}

      {!preview ? (
        <div className="bg-panel border-2 border-dashed border-line rounded-xl text-center py-10 px-4">
          <FileSpreadsheet className="w-8 h-8 text-navy mx-auto mb-3" />
          <p className="text-sm text-text mb-1">Selecione a planilha de metas</p>
          <p className="text-xs text-muted mb-1">Colunas esperadas na planilha:</p>
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {["Data", "Área", "Item", "Nome item", "Meta"].map((c) => (
              <span key={c} className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold">{c}</span>
            ))}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
            <Upload className="w-4 h-4" /> Selecionar planilha
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3 text-sm text-good">
            <Check className="w-4 h-4" /> {nomeArquivo} — {preview.length} linhas prontas para importar
          </div>
          <TabelaMetas metas={preview} loading={false} />
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setPreview(null); setNomeArquivo(""); }} className="border border-line text-text text-sm px-4 py-2 rounded-lg hover:bg-bg transition">
              Importar outra planilha
            </button>
            <button onClick={confirmarImportacao} disabled={salvando} className="flex items-center gap-2 bg-navy text-white font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition disabled:opacity-60">
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar e salvar metas
            </button>
          </div>
        </>
      )}

      {!preview && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-text mb-2">Últimas metas cadastradas</h3>
          <TabelaMetas metas={metasCadastradas} loading={loading} />
        </div>
      )}
    </div>
  );
}

function TabelaMetas({ metas, loading }) {
  if (loading) return <div className="flex items-center justify-center gap-2 text-muted py-12"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>;
  if (metas.length === 0) return <div className="text-center py-12 text-muted">Nenhuma meta cadastrada ainda.</div>;
  return (
    <div className="overflow-x-auto border border-line rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-panel text-muted text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2">Data</th>
            <th className="text-left px-3 py-2">Área</th>
            <th className="text-left px-3 py-2">Item</th>
            <th className="text-left px-3 py-2">Nome do item</th>
            <th className="text-left px-3 py-2">Meta</th>
          </tr>
        </thead>
        <tbody>
          {metas.map((l, i) => (
            <tr key={l.id || i} className="border-t border-line">
              <td className="px-3 py-2 font-mono">{l.data}</td>
              <td className="px-3 py-2"><span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-navy border border-blue-200 font-semibold">{l.area}</span></td>
              <td className="px-3 py-2 font-mono">{l.item}</td>
              <td className="px-3 py-2">{l.nome_item}</td>
              <td className="px-3 py-2 font-semibold">{l.meta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
              }
