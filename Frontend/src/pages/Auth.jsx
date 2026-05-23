import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const mono = "'JetBrains Mono', monospace";
const outfit = "'Outfit', sans-serif";

function AuthInput({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: "#4a6580", fontSize: 10, letterSpacing: 1.5, fontFamily: mono, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#0a0f1a", border: "1px solid #1e2d3d",
          color: "#e2e8f0", fontFamily: mono, fontSize: 13,
          padding: "10px 14px", outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#00d4ff66")}
        onBlur={(e) => (e.target.style.borderColor = "#1e2d3d")}
      />
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handle = async () => {
    if (!email || !password) return setErr("All fields required");
    setLoading(true); setErr("");
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e) {
      setErr(e.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  return <AuthShell title="Sign in" subtitle="Welcome back" onSubmit={handle} loading={loading} err={err} btnLabel="SIGN IN"
    footer={<>No account? <Link to="/register" style={{ color: "#00d4ff", textDecoration: "none" }}>Register</Link></>}>
    <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
    <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
  </AuthShell>;
}

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const handle = async () => {
    if (!name || !email || !password) return setErr("All fields required");
    setLoading(true); setErr("");
    try {
      await register(name, email, password);
      nav("/login");
    } catch (e) {
      setErr(e.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return <AuthShell title="Create account" subtitle="Start automating" onSubmit={handle} loading={loading} err={err} btnLabel="REGISTER"
    footer={<>Have an account? <Link to="/login" style={{ color: "#00d4ff", textDecoration: "none" }}>Sign in</Link></>}>
    <AuthInput label="Name" value={name} onChange={setName} placeholder="Your name" />
    <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
    <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
  </AuthShell>;
}

function AuthShell({ title, subtitle, onSubmit, loading, err, btnLabel, footer, children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#060a10", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: outfit,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ width: 400, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center" }}>
          <div style={{ width: 24, height: 24, background: "#00d4ff", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }} />
          <span style={{ color: "#00d4ff", fontFamily: mono, fontSize: 13, letterSpacing: 2 }}>FLOWCRAFT</span>
        </div>

        <div style={{ background: "#080d14", border: "1px solid #1e2d3d", padding: "36px 32px" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{title}</div>
            <div style={{ color: "#4a6580", fontSize: 13, fontFamily: mono }}>{subtitle}</div>
          </div>

          {children}

          {err && (
            <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", color: "#f87171", fontFamily: mono, fontSize: 11, padding: "8px 12px", marginBottom: 16 }}>
              {err}
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "11px", background: loading ? "#0a0f1a" : "linear-gradient(135deg, #00d4ff22, #00d4ff11)",
              border: "1px solid #00d4ff66", color: "#00d4ff",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: mono, fontSize: 12, letterSpacing: 2,
              transition: "all 0.2s",
            }}
          >{loading ? "..." : btnLabel}</button>

          <div style={{ marginTop: 20, textAlign: "center", color: "#4a6580", fontSize: 12, fontFamily: mono }}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
