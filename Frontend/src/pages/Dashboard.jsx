import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api";

const mono = "'JetBrains Mono', monospace";
const outfit = "'Outfit', sans-serif";

const STATUS_COLORS = {
  draft: { color: "#f59e0b", bg: "#f59e0b18", border: "#f59e0b44" },
  published: { color: "#34d399", bg: "#34d39918", border: "#34d39944" },
};

function WorkflowCard({ wf, onDelete, onPublish, onRun, onOpen, onViewRuns }) {
  const [actionLoading, setActionLoading] = useState(null);
  const sc = STATUS_COLORS[wf.status] || STATUS_COLORS.draft;

  const wrap = async (fn, label) => {
    setActionLoading(label);
    try { await fn(); } finally { setActionLoading(null); }
  };

  const triggerIcon = wf.trigger?.type === "schedule" ? "◷" : "⬡";

  return (
    <div style={{
      background: "#080d14", border: "1px solid #1e2d3d",
      padding: "20px 22px", position: "relative",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a3a4a")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e2d3d")}
    >
      {/* Accent */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: sc.color }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, fontFamily: outfit, marginBottom: 4, cursor: "pointer" }}
            onClick={() => onOpen(wf._id)}>{wf.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontFamily: mono, fontSize: 9, letterSpacing: 1.5, padding: "2px 8px" }}>
              {wf.status.toUpperCase()}
            </span>
            <span style={{ color: "#4a6580", fontFamily: mono, fontSize: 10 }}>
              {triggerIcon} {wf.trigger?.type}
              {wf.trigger?.type === "schedule" && ` · ${wf.trigger.cronExpression}`}
            </span>
            <span style={{ color: "#2a3a4a", fontFamily: mono, fontSize: 10 }}>
              {wf.nodes?.length || 0} nodes
            </span>
          </div>
        </div>
        <div style={{ color: "#2a3a4a", fontFamily: mono, fontSize: 9 }}>
          {new Date(wf.updatedAt || wf.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Btn label="EDIT" onClick={() => onOpen(wf._id)} color="#00d4ff" />
        {wf.status === "draft" && (
          <Btn label={actionLoading === "publish" ? "..." : "PUBLISH"} onClick={() => wrap(onPublish, "publish")} color="#34d399" />
        )}
        {wf.status === "published" && (
          <Btn label={actionLoading === "run" ? "QUEUED" : "▶ RUN"} onClick={() => wrap(onRun, "run")} color="#a78bfa" />
        )}
        <Btn label="RUNS" onClick={onViewRuns} color="#4a6580" />
        <Btn label={actionLoading === "delete" ? "..." : "DELETE"} onClick={() => wrap(onDelete, "delete")} color="#f87171" danger />
      </div>
    </div>
  );
}

function Btn({ label, onClick, color, danger }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "#1a0a0a" : `${color}11`,
      border: `1px solid ${danger ? "#7f1d1d" : color + "44"}`,
      color: danger ? "#f87171" : color,
      padding: "5px 12px", cursor: "pointer",
      fontFamily: mono, fontSize: 10, letterSpacing: 1,
      transition: "all 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = danger ? "#1a0a0a" : `${color}11`; e.currentTarget.style.borderColor = danger ? "#7f1d1d" : `${color}44`; }}
    >{label}</button>
  );
}

function RunsModal({ workflowId, workflowName, onClose }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    api.getRunHistory(workflowId).then(({ data }) => {
      setRuns(data.runs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [workflowId]);

  const loadDetail = async (runId) => {
    try {
      const { data } = await api.getRunDetail(workflowId, runId);
      setSelectedRun(data.run);
    } catch { }
  };

  const STATUS_C = { success: "#34d399", failed: "#f87171", pending: "#f59e0b", running: "#00d4ff" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 700, maxHeight: "85vh", background: "#0d1117", border: "1px solid #1e2d3d",
        display: "flex", flexDirection: "column", fontFamily: mono, overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2d3d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 2 }}>RUN HISTORY</span>
            <div style={{ color: "#4a6580", fontSize: 10, marginTop: 2 }}>{workflowName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Run list */}
          <div style={{ width: 280, borderRight: "1px solid #1e2d3d", overflowY: "auto" }}>
            {loading && <div style={{ padding: 20, color: "#4a6580", fontSize: 11 }}>Loading...</div>}
            {!loading && runs.length === 0 && <div style={{ padding: 20, color: "#2a3a4a", fontSize: 11 }}>No runs yet</div>}
            {runs.map((run) => (
              <div key={run._id}
                onClick={() => loadDetail(run._id)}
                style={{
                  padding: "12px 16px", borderBottom: "1px solid #0d1520", cursor: "pointer",
                  background: selectedRun?._id === run._id ? "#0a0f1a" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (selectedRun?._id !== run._id) e.currentTarget.style.background = "#080d14"; }}
                onMouseLeave={(e) => { if (selectedRun?._id !== run._id) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: STATUS_C[run.status] || "#4a6580", fontSize: 10, letterSpacing: 1 }}>{run.status?.toUpperCase()}</span>
                  <span style={{ color: "#2a3a4a", fontSize: 9 }}>{run.triggerType}</span>
                </div>
                <div style={{ color: "#4a6580", fontSize: 9 }}>{new Date(run.startedAt).toLocaleString()}</div>
                {run.duration && <div style={{ color: "#2a3a4a", fontSize: 9, marginTop: 2 }}>{run.duration}ms</div>}
              </div>
            ))}
          </div>

          {/* Run detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {!selectedRun && <div style={{ color: "#2a3a4a", fontSize: 11, textAlign: "center", marginTop: 40 }}>Select a run to view logs</div>}
            {selectedRun && (
              <>
                <div style={{ marginBottom: 16, color: "#4a6580", fontSize: 10 }}>
                  Run ID: <span style={{ color: "#00d4ff" }}>{selectedRun._id}</span>
                </div>
                {(selectedRun.nodeLogs || []).map((log, i) => (
                  <div key={i} style={{ marginBottom: 12, background: "#080d14", border: `1px solid ${STATUS_C[log.status] || "#1e2d3d"}22`, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#e2e8f0", fontSize: 11 }}>#{log.order} {log.nodeName}</span>
                      <span style={{ color: STATUS_C[log.status], fontSize: 10, letterSpacing: 1 }}>{log.status?.toUpperCase()}</span>
                    </div>
                    <div style={{ color: "#4a6580", fontSize: 9, marginBottom: 4 }}>{log.nodeType} · {log.duration}ms{log.branchTaken ? ` · branch: ${log.branchTaken}` : ""}</div>
                    {log.error?.message && (
                      <div style={{ color: "#f87171", fontSize: 10, fontFamily: mono, background: "#1a0a0a", padding: "6px 8px", marginTop: 6 }}>{log.error.message}</div>
                    )}
                    {log.output && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ color: "#4a6580", fontSize: 9, cursor: "pointer" }}>output</summary>
                        <pre style={{ color: "#7dd3fc", fontSize: 9, marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [runsModal, setRunsModal] = useState(null); // {id, name}

  const showToast = (msg, err) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    // Backend doesn't have a list endpoint — we store locally created workflow IDs
    const ids = JSON.parse(localStorage.getItem("workflowIds") || "[]");
    // Fetch each workflow from run history or use stored list
    // Since there's no GET /workflows list endpoint, we maintain local state
    const stored = JSON.parse(localStorage.getItem("workflows") || "[]");
    setWorkflows(stored);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await api.deleteWorkflow(id);
      const updated = workflows.filter((w) => w._id !== id);
      setWorkflows(updated);
      localStorage.setItem("workflows", JSON.stringify(updated));
      showToast("Workflow deleted");
    } catch (e) { showToast(e.response?.data?.message || "Delete failed", true); }
  };

  const handlePublish = async (id) => {
    try {
      const { data } = await api.publishWorkflow(id);
      const updated = workflows.map((w) => w._id === id ? { ...w, status: "published" } : w);
      setWorkflows(updated);
      localStorage.setItem("workflows", JSON.stringify(updated));
      showToast("Workflow published!");
    } catch (e) { showToast(e.response?.data?.message || "Publish failed", true); }
  };

  const handleRun = async (id) => {
    try {
      const { data } = await api.runWorkflow(id);
      showToast(`Run queued · ${data.runId}`);
    } catch (e) { showToast(e.response?.data?.message || "Run failed", true); }
  };

  const handleCreate = () => {
    nav("/builder/new");
  };

  const handleOpen = (id) => {
    nav(`/builder/${id}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#e2e8f0", fontFamily: outfit }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Topbar */}
      <div style={{
        height: 52, background: "#080d14", borderBottom: "1px solid #1e2d3d",
        display: "flex", alignItems: "center", padding: "0 24px", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, background: "#00d4ff", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }} />
          <span style={{ color: "#00d4ff", fontFamily: mono, fontSize: 12, letterSpacing: 2 }}>FLOWCRAFT</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#4a6580", fontFamily: mono, fontSize: 11 }}>{user?.name}</span>
        <button onClick={logout} style={{
          background: "none", border: "1px solid #1e2d3d", color: "#4a6580",
          padding: "5px 12px", cursor: "pointer", fontFamily: mono, fontSize: 10, letterSpacing: 1,
        }}>LOGOUT</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Workflows</div>
            <div style={{ color: "#4a6580", fontFamily: mono, fontSize: 11 }}>{workflows.length} total</div>
          </div>
          <button onClick={handleCreate} style={{
            background: "linear-gradient(135deg, #00d4ff22, #00d4ff11)",
            border: "1px solid #00d4ff66", color: "#00d4ff",
            padding: "9px 20px", cursor: "pointer",
            fontFamily: mono, fontSize: 11, letterSpacing: 1.5,
          }}>+ NEW WORKFLOW</button>
        </div>

        {loading && <div style={{ color: "#4a6580", fontFamily: mono, fontSize: 12 }}>Loading...</div>}

        {!loading && workflows.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 56, height: 56, border: "1px dashed #1e2d3d", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <span style={{ color: "#1e2d3d", fontSize: 24 }}>+</span>
            </div>
            <div style={{ color: "#2a3a4a", fontFamily: mono, fontSize: 12, marginBottom: 16 }}>No workflows yet</div>
            <button onClick={handleCreate} style={{
              background: "none", border: "1px solid #1e2d3d", color: "#4a6580",
              padding: "8px 18px", cursor: "pointer", fontFamily: mono, fontSize: 11,
            }}>Create your first workflow</button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf._id}
              wf={wf}
              onDelete={() => handleDelete(wf._id)}
              onPublish={() => handlePublish(wf._id)}
              onRun={() => handleRun(wf._id)}
              onOpen={handleOpen}
              onViewRuns={() => setRunsModal({ id: wf._id, name: wf.name })}
            />
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "#080d14", border: `1px solid ${toast.err ? "#7f1d1d" : "#1e2d3d"}`,
          color: toast.err ? "#f87171" : "#34d399",
          fontFamily: mono, fontSize: 11, padding: "10px 16px", zIndex: 1000,
          letterSpacing: 1,
        }}>{toast.msg}</div>
      )}

      {runsModal && (
        <RunsModal workflowId={runsModal.id} workflowName={runsModal.name} onClose={() => setRunsModal(null)} />
      )}
    </div>
  );
}
