import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints";
import { apiError } from "@/api/client";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("admin@excel2tableau.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await authApi.login(email, password);
      useAuthStore.setState({ token: token.access_token });
      const user = await authApi.me();
      setAuth(token.access_token, user);
      navigate("/");
    } catch (err) {
      useAuthStore.getState().logout();
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-2xl" />
        <img src="/exl-logo-white.svg" alt="EXL" className="relative h-9 w-auto" />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Turn Excel dashboards into Tableau, automatically.
          </h1>
          <p className="mt-4 text-base text-white/80">
            AI-powered conversion — parse workbooks, translate formulas, and
            generate Tableau worksheets, dashboards and extracts in minutes.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} EXL Service · Excel2Tableau
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/exl-logo.svg" alt="EXL" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-ink-800">Excel2Tableau</span>
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-500">Sign in to your workspace</p>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <label className="mt-6 mb-1.5 block text-sm font-medium text-ink-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink-100 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            required
          />

          <label className="mt-4 mb-1.5 block text-sm font-medium text-ink-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-100 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
