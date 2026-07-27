import React, { useState } from "react";
import { Truck, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) setError("E-mail ou senha inválidos.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F4F6F9" }}>
      <div className="w-full max-w-sm bg-panel border border-line rounded-xl p-7 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-navy flex items-center justify-center mb-3">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-lg uppercase tracking-wide text-text">
            Painel Integrado
          </h1>
          <p className="text-xs text-muted mt-1">Portaria · Logística · PCP · Supervisão</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-bad rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">
              E-mail
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1 font-semibold">
              Senha
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-semibold py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #F4F6F9;
          border: 1px solid #E1E6ED;
          border-radius: 6px;
          padding: 9px 11px;
          font-size: 13.5px;
          color: #152238;
          outline: none;
        }
        .input:focus { border-color: #0B2A4A; }
      `}</style>
    </div>
  );
}
