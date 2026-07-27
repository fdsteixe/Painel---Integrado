import React, { useState } from "react";
import { Truck, LogOut as LogOutIcon, Package, Upload, ClipboardCheck, LayoutDashboard, History, ShieldCheck } from "lucide-react";
import { useAuth, podeAcessar } from "./AuthContext";
import Dashboard from "./pages/Dashboard";
import Portaria from "./pages/Portaria";
import Logistica from "./pages/Logistica";
import Historico from "./pages/Historico";
import PCP from "./pages/PCP";
import Supervisao from "./pages/Supervisao";
import Admin from "./pages/Admin";

const TELAS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, Component: Dashboard },
  { key: "portaria", label: "Portaria", icon: Truck, Component: Portaria },
  { key: "logistica", label: "Logística", icon: Package, Component: Logistica },
  { key: "historico", label: "Histórico", icon: History, Component: Historico },
  { key: "pcp", label: "PCP", icon: Upload, Component: PCP },
  { key: "supervisao", label: "Supervisão", icon: ClipboardCheck, Component: Supervisao },
  { key: "admin", label: "Admin", icon: ShieldCheck, Component: Admin },
];

export default function Shell() {
  const { perfil, logout } = useAuth();
  const papel = perfil?.papel;

  const telasVisiveis = TELAS.filter((t) => podeAcessar(t.key, papel));
  const [ativa, setAtiva] = useState(telasVisiveis[0]?.key || "dashboard");
  const telaAtual = telasVisiveis.find((t) => t.key === ativa) || telasVisiveis[0];
  const TelaAtiva = telaAtual?.Component || Dashboard;

  return (
    <div className="min-h-screen" style={{ background: "#F4F6F9" }}>
      <header className="border-b border-line bg-panel sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-base tracking-wide text-text uppercase leading-tight">Painel Integrado</h1>
              <p className="text-xs text-muted leading-tight">{perfil?.nome} · {papel}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-muted hover:text-text transition">
            <LogOutIcon className="w-4 h-4" /> Sair
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {telasVisiveis.map((t) => (
            <button
              key={t.key}
              onClick={() => setAtiva(t.key)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                ativa === t.key ? "bg-navy text-white font-semibold" : "text-muted hover:text-text"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <TelaAtiva />
      </main>
    </div>
  );
}
