import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "../api";

// ─── Constants ───────────────────────────────────────────────────────────────
const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;

const NODE_META = {
  http_request: {
    label: "HTTP Request",
    color: "#00d4ff",
    bg: "#00d4ff18",
    icon: "⬡",
    desc: "Fetch data from URL",
  },
  condition: {
    label: "Condition",
    color: "#f59e0b",
    bg: "#f59e0b18",
    icon: "◇",
    desc: "Branch on field value",
  },
  delay: {
    label: "Delay",
    color: "#a78bfa",
    bg: "#a78bfa18",
    icon: "◎",
    desc: "Wait N seconds",
  },
  notify: {
    label: "Notify",
    color: "#34d399",
    bg: "#34d39918",
    icon: "◈",
    desc: "Send notification",
  },
};

const DEFAULT_CONFIGS = {
  http_request: { url: "", method: "GET" },
  condition: { field: "", operator: "equals", value: "" },
  delay: { seconds: 1 },
  notify: { channel: "email", to: "", message: "" },
};

let nodeCounter = 1;
const uid = () => `node_${Date.now()}_${nodeCounter++}`;

function getBezierPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const cx = Math.max(dx * 0.5, 80);
  return `M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`;
}

// ─── Config Panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ node, onChange, onDelete, onClose }) {
  if (!node) return null;
  const meta = NODE_META[node.type];
  const cfg = node.config;
  const set = (key, val) =>
    onChange({ ...node, config: { ...cfg, [key]: val } });

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 300,
        background: "#0d1117",
        borderLeft: "1px solid #1e2d3d",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1e2d3d",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20, color: meta.color }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: meta.color,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {meta.label}
          </div>
          <input
            value={node.name}
            onChange={(e) => onChange({ ...node, name: e.target.value })}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "inherit",
              width: "100%",
            }}
          />
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#4a5568",
            cursor: "pointer",
            fontSize: 18,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {node.type === "http_request" && (
          <>
            <Field
              label="URL"
              value={cfg.url}
              onChange={(v) => set("url", v)}
              placeholder="https://api.example.com/data"
            />
            <SelectField
              label="Method"
              value={cfg.method}
              onChange={(v) => set("method", v)}
              options={["GET", "POST", "PUT", "PATCH", "DELETE"]}
              color={meta.color}
            />
          </>
        )}
        {node.type === "condition" && (
          <>
            <Field
              label="Field"
              value={cfg.field}
              onChange={(v) => set("field", v)}
              placeholder="data.userId"
            />
            <SelectField
              label="Operator"
              value={cfg.operator}
              onChange={(v) => set("operator", v)}
              options={[
                "equals",
                "not_equals",
                "gt",
                "lt",
                "contains",
                "exists",
              ]}
              color={meta.color}
            />
            <Field
              label="Value"
              value={cfg.value}
              onChange={(v) => set("value", v)}
              placeholder="1"
            />
          </>
        )}
        {node.type === "delay" && (
          <>
            <Field
              label="Seconds"
              value={cfg.seconds}
              onChange={(v) => set("seconds", Number(v))}
              type="number"
              placeholder="2"
            />
          </>
        )}
        {node.type === "notify" && (
          <>
            <SelectField
              label="Channel"
              value={cfg.channel}
              onChange={(v) => set("channel", v)}
              options={["email", "sms", "slack"]}
              color={meta.color}
            />
            <Field
              label="To"
              value={cfg.to}
              onChange={(v) => set("to", v)}
              placeholder="user@example.com"
            />
            <Field
              label="Message"
              value={cfg.message}
              onChange={(v) => set("message", v)}
              placeholder="Your message..."
              multiline
            />
          </>
        )}
      </div>

      <div style={{ padding: "16px 20px", borderTop: "1px solid #1e2d3d" }}>
        <button
          onClick={onDelete}
          style={{
            width: "100%",
            padding: "8px",
            background: "#1a0a0a",
            border: "1px solid #7f1d1d",
            color: "#f87171",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
}) {
  const style = {
    width: "100%",
    background: "#0a0f1a",
    border: "1px solid #1e2d3d",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    padding: "8px 10px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: "#4a6580",
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={style}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={style}
        />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: "#4a6580",
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "#0a0f1a",
          border: `1px solid ${color}44`,
          color,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          padding: "8px 10px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Workflow to API payload ──────────────────────────────────────────────────
function buildPayload(nodes, edges, workflowName, triggerType, cronExpr, secretKey) {

  // ── Find the root node — the one with no incoming edges ──
  const hasIncoming = new Set(edges.map(e => e.to))
  const rootNode = nodes.find(n => !hasIncoming.has(n.id))

  if (!rootNode) {
    // fallback to x position sort if no clear root
    return buildPayloadByPosition(nodes, edges, workflowName, triggerType, cronExpr, secretKey)
  }

  // ── Walk edges to get correct order ──
  const orderMap = {}
  const visited  = new Set()
  const queue    = [rootNode.id]
  let order      = 1

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (visited.has(currentId)) continue
    visited.add(currentId)
    orderMap[currentId] = order++

    // Push all outgoing nodes — default first, then true, then false
    const outEdges = edges.filter(e => e.from === currentId)
    const defEdge  = outEdges.find(e => e.handle === "default")
    const trueEdge = outEdges.find(e => e.handle === "true")
    const falseEdge= outEdges.find(e => e.handle === "false")

    if (defEdge)  queue.push(defEdge.to)
    if (trueEdge) queue.push(trueEdge.to)
    if (falseEdge)queue.push(falseEdge.to)
  }

  // Any unvisited nodes (disconnected) get appended at end
  nodes.forEach(n => {
    if (!orderMap[n.id]) orderMap[n.id] = order++
  })

  // ── Build API nodes using correct order ──
  const apiNodes = nodes.map(n => {
    const outEdges  = edges.filter(e => e.from === n.id)
    const defEdge   = outEdges.find(e => e.handle === "default")
    const trueEdge  = outEdges.find(e => e.handle === "true")
    const falseEdge = outEdges.find(e => e.handle === "false")

    const obj = {
      name:   n.name,
      type:   n.type,
      order:  orderMap[n.id],
      config: n.config,
    }
    if (trueEdge)  obj.nextOnTrue  = { order: orderMap[trueEdge.to] }
    if (falseEdge) obj.nextOnFalse = { order: orderMap[falseEdge.to] }
    if (defEdge)   obj.nextNodeId  = { order: orderMap[defEdge.to] }

    return obj
  })

  return {
    name: workflowName,
    trigger: triggerType === "webhook"
      ? { type: "webhook", secretKey }
      : { type: "schedule", cronExpression: cronExpr },
    nodes: apiNodes,
  }
}

// Fallback — original position-based sort
function buildPayloadByPosition(nodes, edges, workflowName, triggerType, cronExpr, secretKey) {
  const sorted = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y)
  const orderMap = {}
  sorted.forEach((n, i) => { orderMap[n.id] = i + 1 })

  const apiNodes = sorted.map(n => {
    const outEdges  = edges.filter(e => e.from === n.id)
    const defEdge   = outEdges.find(e => e.handle === "default")
    const trueEdge  = outEdges.find(e => e.handle === "true")
    const falseEdge = outEdges.find(e => e.handle === "false")

    const obj = { name: n.name, type: n.type, order: orderMap[n.id], config: n.config }
    if (trueEdge)  obj.nextOnTrue  = { order: orderMap[trueEdge.to] }
    if (falseEdge) obj.nextOnFalse = { order: orderMap[falseEdge.to] }
    if (defEdge)   obj.nextNodeId  = { order: orderMap[defEdge.to] }
    return obj
  })

  return {
    name: workflowName,
    trigger: triggerType === "webhook"
      ? { type: "webhook", secretKey }
      : { type: "schedule", cronExpression: cronExpr },
    nodes: apiNodes,
  }
}

// ─── Reconstruct canvas nodes+edges from stored workflow ─────────────────────
function hydrateCanvas(wf) {
  if (!wf?.nodes?.length) return { nodes: [], edges: [] };

  // Build order→canvasId map so we can reconstruct edges
  const canvasNodes = wf.nodes.map((ref, i) => {
    // Config stored on the workflow node ref (we saved it in localStorage with full node data)
    const type = ref.type || "http_request";
    return {
      id: uid(),
      _order: ref.order ?? i + 1,
      type,
      name: ref.name || NODE_META[type]?.label || type,
      config: ref.config || { ...DEFAULT_CONFIGS[type] },
      x:      ref.x ?? 80 + i * 260,
      y:      ref.y ?? 200,
    };
  });

  const orderToId = {};
  canvasNodes.forEach((n) => {
    orderToId[n._order] = n.id;
  });

  const edges = [];
  wf.nodes.forEach((ref) => {
    const fromId = orderToId[ref.order];
    if (!fromId) return;
    if (ref.nextNodeId?.order) {
      const toId = orderToId[ref.nextNodeId.order];
      if (toId)
        edges.push({ id: uid(), from: fromId, handle: "default", to: toId });
    }
    if (ref.nextOnTrue?.order) {
      const toId = orderToId[ref.nextOnTrue.order];
      if (toId)
        edges.push({ id: uid(), from: fromId, handle: "true", to: toId });
    }
    if (ref.nextOnFalse?.order) {
      const toId = orderToId[ref.nextOnFalse.order];
      if (toId)
        edges.push({ id: uid(), from: fromId, handle: "false", to: toId });
    }
  });

  return { nodes: canvasNodes, edges };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkflowBuilder() {
  const { id } = useParams(); // "new" or an existing workflow id
  const nav = useNavigate();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [zoom, setZoom] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [triggerType, setTriggerType] = useState("webhook");
  const [cronExpr, setCronExpr] = useState("*/5 * * * *");
  const [secretKey, setSecretKey] = useState("secret123");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [savedId, setSavedId] = useState(id !== "new" ? id : null);
  const [isPublished, setIsPublished] = useState(false);

  // ── Load existing workflow from localStorage on mount ──
  useEffect(() => {
    if (id === "new") return;
    const stored = JSON.parse(localStorage.getItem("workflows") || "[]");
    const wf = stored.find((w) => w._id === id);
    if (!wf) return;

    setWorkflowName(wf.name || "My Workflow");
    setTriggerType(wf.trigger?.type || "webhook");
    if (wf.trigger?.type === "schedule")
      setCronExpr(wf.trigger.cronExpression || "*/5 * * * *");
    if (wf.trigger?.type === "webhook")
      setSecretKey(wf.trigger.secretKey || "secret123");
    if (wf.status === "published") setIsPublished(true);

    const { nodes: hydratedNodes, edges: hydratedEdges } = hydrateCanvas(wf);
    setNodes(hydratedNodes);
    setEdges(hydratedEdges);
  }, [id]);

  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const draggingNode = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const showToast = (msg, err) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const toCanvas = useCallback(
    (cx, cy) => ({ x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom }),
    [pan, zoom],
  );
  const getCanvasRect = () =>
    canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };

  const getHandlePos = useCallback(
    (node, handle) => {
      const cx = node.x * zoom + pan.x;
      const cy = node.y * zoom + pan.y;
      const w = NODE_WIDTH * zoom;
      const h = NODE_HEIGHT * zoom;
      if (handle === "input") return { x: cx, y: cy + h / 2 };
      if (handle === "default") return { x: cx + w, y: cy + h / 2 };
      if (handle === "true") return { x: cx + w, y: cy + h * 0.35 };
      if (handle === "false") return { x: cx + w, y: cy + h * 0.65 };
      return { x: cx + w, y: cy + h / 2 };
    },
    [zoom, pan],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => {
        const nz = Math.min(Math.max(z * delta, 0.3), 2);
        setPan((p) => ({
          x: mx - (mx - p.x) * (nz / z),
          y: my - (my - p.y) * (nz / z),
        }));
        return nz;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      ) {
        deleteNode(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const onMouseMove = useCallback(
    (e) => {
      const rect = getCanvasRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (isPanning.current)
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
      if (draggingNode.current) {
        const { id: nodeId } = draggingNode.current;
        const canvasX =
          (e.clientX - rect.left - pan.x) / zoom - dragOffset.current.x;
        const canvasY =
          (e.clientY - rect.top - pan.y) / zoom - dragOffset.current.y;
        setNodes((ns) =>
          ns.map((n) =>
            n.id === nodeId ? { ...n, x: canvasX, y: canvasY } : n,
          ),
        );
      }
    },
    [pan, zoom],
  );

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    draggingNode.current = null;
  }, []);

  const onCanvasMouseDown = useCallback(
    (e) => {
      if (
        e.target === canvasRef.current ||
        e.target.classList.contains("canvas-bg")
      ) {
        isPanning.current = true;
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        setSelected(null);
        setConnecting(null);
      }
    },
    [pan],
  );

  const startNodeDrag = useCallback(
    (e, nodeId) => {
      e.stopPropagation();
      if (isPublished) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const rect = getCanvasRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      dragOffset.current = { x: canvasX - node.x, y: canvasY - node.y };
      draggingNode.current = { id: nodeId };
      setSelected(nodeId);
    },
    [nodes, pan, zoom],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (isPublished) return;
      const type = e.dataTransfer.getData("nodeType");
      if (!type) return;
      const rect = getCanvasRect();
      const pos = toCanvas(e.clientX - rect.left, e.clientY - rect.top);
      const newId = uid();
      setNodes((ns) => [
        ...ns,
        {
          id: newId,
          type,
          name: NODE_META[type].label,
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
          config: { ...DEFAULT_CONFIGS[type] },
        },
      ]);
      setSelected(newId);
    },
    [toCanvas],
  );

  const startConnect = useCallback(
    (e, nodeId, handle) => {
      e.stopPropagation();
      if (isPublished) return;
      setConnecting({ nodeId, handle });
    },
    [isPublished],
  );

  const finishConnect = useCallback(
    (e, toNodeId) => {
      e.stopPropagation();
      if (!connecting || connecting.nodeId === toNodeId) {
        setConnecting(null);
        return;
      }
      setEdges((es) => {
        const filtered = es.filter(
          (e) =>
            !(e.from === connecting.nodeId && e.handle === connecting.handle),
        );
        return [
          ...filtered,
          {
            id: uid(),
            from: connecting.nodeId,
            handle: connecting.handle,
            to: toNodeId,
          },
        ];
      });
      setConnecting(null);
    },
    [connecting],
  );

  const updateNode = useCallback(
    (updated) =>
      setNodes((ns) => ns.map((n) => (n.id === updated.id ? updated : n))),
    [],
  );

  const deleteNode = useCallback((nodeId) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelected(null);
  }, []);

  // ── Save workflow ──
  const handleSave = async () => {
    if (isPublished)
      return showToast("Published workflows cannot be edited", true);
    if (nodes.length === 0) return showToast("Add at least one node", true);
    setSaving(true);
    try {
      const payload = buildPayload(
        nodes,
        edges,
        workflowName,
        triggerType,
        cronExpr,
        secretKey,
      );
      let wfId = savedId;
      let wfData;
      if (!wfId) {
        const { data } = await api.createWorkflow(payload);
        wfId = data.workflow._id;
        wfData = data.workflow;
        setSavedId(wfId);
        nav(`/builder/${wfId}`, { replace: true });
      } else {
        const { data } = await api.editWorkflow(wfId, payload);
        wfData = data.workflow;
      }
      // Store locally — enrich with canvas node type/config so we can re-hydrate
      const localNodes = [...nodes]
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .map((n, i) => {
          const order = i + 1;
          const outEdges = edges.filter((e) => e.from === n.id);
          const defEdge = outEdges.find((e) => e.handle === "default");
          const trueEdge = outEdges.find((e) => e.handle === "true");
          const falseEdge = outEdges.find((e) => e.handle === "false");
          const orderMap = {};
          [...nodes]
            .sort((a, b) => a.x - b.x || a.y - b.y)
            .forEach((nd, idx) => {
              orderMap[nd.id] = idx + 1;
            });
          return {
            order,
            type: n.type,
            name: n.name,
            config: n.config,
            x:      n.x,   
            y:      n.y,   
            nextNodeId: defEdge ? { order: orderMap[defEdge.to] } : undefined,
            nextOnTrue: trueEdge ? { order: orderMap[trueEdge.to] } : undefined,
            nextOnFalse: falseEdge
              ? { order: orderMap[falseEdge.to] }
              : undefined,
          };
        });
      const localWf = {
        _id: wfId,
        name: workflowName,
        status: "draft",
        trigger:
          triggerType === "webhook"
            ? { type: "webhook", secretKey }
            : { type: "schedule", cronExpression: cronExpr },
        nodes: localNodes,
        updatedAt: new Date().toISOString(),
      };
      const stored = JSON.parse(localStorage.getItem("workflows") || "[]");
      const exists = stored.findIndex((w) => w._id === wfId);
      if (exists >= 0) stored[exists] = localWf;
      else stored.unshift(localWf);
      localStorage.setItem("workflows", JSON.stringify(stored));
      showToast("Workflow saved ✓");
    } catch (e) {
      showToast(e.response?.data?.message || "Save failed", true);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!savedId) return showToast("Save first", true);
    if (isPublished) return showToast("Already published", true);
    try {
      await api.publishWorkflow(savedId);
      const stored = JSON.parse(localStorage.getItem("workflows") || "[]");
      const idx = stored.findIndex((w) => w._id === savedId);
      if (idx >= 0) stored[idx] = { ...stored[idx], status: "published" };
      localStorage.setItem("workflows", JSON.stringify(stored));
      setIsPublished(true);
      showToast("Published! ✓");
    } catch (e) {
      showToast(e.response?.data?.message || "Publish failed", true);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selected);

  const renderPreviewEdge = () => {
    if (!connecting) return null;
    const fromNode = nodes.find((n) => n.id === connecting.nodeId);
    if (!fromNode) return null;
    const { x: x1, y: y1 } = getHandlePos(fromNode, connecting.handle);
    const color =
      connecting.handle === "true"
        ? "#34d399"
        : connecting.handle === "false"
          ? "#f87171"
          : "#00d4ff";
    return (
      <path
        d={getBezierPath(x1, y1, mousePos.x, mousePos.y)}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeDasharray="5,3"
        opacity={0.8}
      />
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060a10; }
        input::placeholder, textarea::placeholder { color: #2a3a4a; }
        input:focus, textarea:focus, select:focus { border-color: #2a4a6a !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0f1a; } ::-webkit-scrollbar-thumb { background: #1e2d3d; }
      `}</style>

      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#060a10",
          fontFamily: "'Outfit', sans-serif",
          overflow: "hidden",
          color: "#e2e8f0",
        }}
      >
        {/* ── Top Bar ── */}
        <div
          style={{
            height: 52,
            background: "#080d14",
            borderBottom: "1px solid #1e2d3d",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 16,
            flexShrink: 0,
            zIndex: 50,
          }}
        >
          <button
            onClick={() => nav("/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "#4a6580",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono'",
              fontSize: 18,
              padding: 0,
            }}
          >
            ←
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginRight: 8,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                background: "#00d4ff",
                clipPath:
                  "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
              }}
            />
            <span
              style={{
                color: "#00d4ff",
                fontFamily: "'JetBrains Mono'",
                fontSize: 12,
                letterSpacing: 2,
              }}
            >
              FLOWCRAFT
            </span>
          </div>

          <div style={{ width: 1, height: 24, background: "#1e2d3d" }} />

          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: 14,
              fontFamily: "'Outfit'",
              fontWeight: 500,
              width: 220,
            }}
          />

          <div style={{ width: 1, height: 24, background: "#1e2d3d" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                color: "#4a6580",
                fontSize: 11,
                fontFamily: "'JetBrains Mono'",
                letterSpacing: 1,
              }}
            >
              TRIGGER
            </span>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              style={{
                background: "#0a0f1a",
                border: "1px solid #1e2d3d",
                color: "#e2e8f0",
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              <option value="webhook">webhook</option>
              <option value="schedule">schedule</option>
            </select>
            {triggerType === "webhook" ? (
              <input
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="secretKey"
                style={{
                  background: "#0a0f1a",
                  border: "1px solid #1e2d3d",
                  color: "#a78bfa",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  padding: "4px 8px",
                  width: 120,
                  outline: "none",
                }}
              />
            ) : (
              <input
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="*/5 * * * *"
                style={{
                  background: "#0a0f1a",
                  border: "1px solid #1e2d3d",
                  color: "#f59e0b",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  padding: "4px 8px",
                  width: 130,
                  outline: "none",
                }}
              />
            )}
            {/* ✅ ADD THIS BLOCK right here */}
            {isPublished && triggerType === "schedule" && (
              <button
                onClick={async () => {
                  try {
                    await api.rescheduleWorkflow(savedId, cronExpr);
                    showToast("Rescheduled ✓");
                  } catch (e) {
                    showToast(
                      e.response?.data?.message || "Reschedule failed",
                      true,
                    );
                  }
                }}
                style={{
                  background: "#f59e0b11",
                  border: "1px solid #f59e0b44",
                  color: "#f59e0b",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                  letterSpacing: 1,
                }}
              >
                RESCHEDULE
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#2a3a4a",
              fontFamily: "'JetBrains Mono'",
              fontSize: 10,
            }}
          >
            <span>{nodes.length} nodes</span>
            <span>·</span>
            <span>{edges.length} edges</span>
            <span>·</span>
            <span>{Math.round(zoom * 100)}%</span>
            {savedId && (
              <>
                <span>·</span>
                <span style={{ color: "#34d39966" }}>saved</span>
              </>
            )}
          </div>

          {isPublished ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#34d39911",
                border: "1px solid #34d39944",
                padding: "6px 14px",
              }}
            >
              <span
                style={{
                  color: "#34d399",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                  letterSpacing: 1.5,
                }}
              >
                ● PUBLISHED
              </span>
              <span
                style={{
                  color: "#4a6580",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                }}
              >
                · read-only
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "linear-gradient(135deg,#00d4ff22,#00d4ff11)",
                  border: "1px solid #00d4ff66",
                  color: "#00d4ff",
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                onClick={handlePublish}
                style={{
                  background: "linear-gradient(135deg,#34d39922,#34d39911)",
                  border: "1px solid #34d39966",
                  color: "#34d399",
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: 1.5,
                }}
              >
                PUBLISH
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── Left Palette ── */}
          <div
            style={{
              width: 200,
              background: "#080d14",
              borderRight: "1px solid #1e2d3d",
              display: "flex",
              flexDirection: "column",
              padding: "16px 12px",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                color: "#2a3a4a",
                fontSize: 10,
                letterSpacing: 2,
                fontFamily: "'JetBrains Mono'",
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              NODE TYPES
            </div>
            {Object.entries(NODE_META).map(([type, meta]) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("nodeType", type)}
                style={{
                  padding: "10px 12px",
                  border: `1px solid ${meta.color}33`,
                  background: meta.bg,
                  cursor: "grab",
                  userSelect: "none",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = meta.color)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = `${meta.color}33`)
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: meta.color, fontSize: 14 }}>
                    {meta.icon}
                  </span>
                  <span
                    style={{
                      color: meta.color,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono'",
                      fontWeight: 600,
                    }}
                  >
                    {type}
                  </span>
                </div>
                <div
                  style={{ color: "#4a6580", fontSize: 10, paddingLeft: 22 }}
                >
                  {meta.desc}
                </div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div
              style={{
                borderTop: "1px solid #1e2d3d",
                paddingTop: 12,
                color: "#2a3a4a",
                fontSize: 9,
                fontFamily: "'JetBrains Mono'",
                lineHeight: 1.8,
              }}
            >
              <div>DRAG to canvas</div>
              <div>CLICK to configure</div>
              <div>SCROLL to zoom</div>
              <div>DRAG canvas to pan</div>
              <div>DEL to remove</div>
            </div>
          </div>

          {/* ── Canvas ── */}
          <div
            style={{ flex: 1, position: "relative", overflow: "hidden" }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <div
              ref={canvasRef}
              className="canvas-bg"
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                cursor: "grab",
              }}
              onMouseDown={onCanvasMouseDown}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={connecting ? () => setConnecting(null) : undefined}
            >
              {/* Grid */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                <defs>
                  <pattern
                    id="sg"
                    width={20 * zoom}
                    height={20 * zoom}
                    x={pan.x % (20 * zoom)}
                    y={pan.y % (20 * zoom)}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`}
                      fill="none"
                      stroke="#0d1520"
                      strokeWidth="0.5"
                    />
                  </pattern>
                  <pattern
                    id="bg"
                    width={100 * zoom}
                    height={100 * zoom}
                    x={pan.x % (100 * zoom)}
                    y={pan.y % (100 * zoom)}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width={100 * zoom}
                      height={100 * zoom}
                      fill="url(#sg)"
                    />
                    <path
                      d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`}
                      fill="none"
                      stroke="#111d2b"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#bg)" />
              </svg>

              {/* Edges */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                {edges.map((edge) => {
                  const fn = nodes.find((n) => n.id === edge.from);
                  const tn = nodes.find((n) => n.id === edge.to);
                  if (!fn || !tn) return null;
                  const { x: x1, y: y1 } = getHandlePos(fn, edge.handle);
                  const { x: x2, y: y2 } = getHandlePos(tn, "input");
                  const color =
                    edge.handle === "true"
                      ? "#34d399"
                      : edge.handle === "false"
                        ? "#f87171"
                        : "#00d4ff";
                  const hl = selected === edge.from || selected === edge.to;
                  return (
                    <g key={edge.id}>
                      <path
                        d={getBezierPath(x1, y1, x2, y2)}
                        stroke={color}
                        strokeWidth={hl ? 2.5 : 1.5}
                        fill="none"
                        opacity={hl ? 1 : 0.5}
                      />
                      <circle
                        cx={x2}
                        cy={y2}
                        r={3}
                        fill={color}
                        opacity={hl ? 1 : 0.5}
                      />
                      {edge.handle !== "default" && (
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 6}
                          fill={color}
                          fontSize={9}
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                          opacity={0.8}
                        >
                          {edge.handle.toUpperCase()}
                        </text>
                      )}
                    </g>
                  );
                })}
                {renderPreviewEdge()}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => {
                const meta = NODE_META[node.type];
                const isSel = selected === node.id;
                const sx = node.x * zoom + pan.x;
                const sy = node.y * zoom + pan.y;
                const w = NODE_WIDTH * zoom;
                const h = NODE_HEIGHT * zoom;
                return (
                  <div
                    key={node.id}
                    style={{
                      position: "absolute",
                      left: sx,
                      top: sy,
                      width: w,
                      height: h,
                      cursor: "move",
                      userSelect: "none",
                      zIndex: isSel ? 10 : 2,
                    }}
                    onMouseDown={(e) => startNodeDrag(e, node.id)}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: isSel ? meta.bg : "#0a0f1a",
                        border: `1px solid ${isSel ? meta.color : meta.color + "44"}`,
                        boxShadow: isSel
                          ? `0 0 20px ${meta.color}33, 0 0 0 1px ${meta.color}22`
                          : "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: `0 ${14 * zoom}px`,
                        transition: "box-shadow 0.15s, background 0.15s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3 * zoom,
                          background: meta.color,
                          opacity: 0.8,
                        }}
                      />
                      <div style={{ paddingLeft: 8 * zoom }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6 * zoom,
                            marginBottom: 2 * zoom,
                          }}
                        >
                          <span
                            style={{ color: meta.color, fontSize: 12 * zoom }}
                          >
                            {meta.icon}
                          </span>
                          <span
                            style={{
                              color: "#4a6580",
                              fontSize: 8 * zoom,
                              fontFamily: "'JetBrains Mono'",
                              letterSpacing: 1,
                            }}
                          >
                            {node.type}
                          </span>
                        </div>
                        <div
                          style={{
                            color: "#e2e8f0",
                            fontSize: 11 * zoom,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {node.name}
                        </div>
                      </div>
                    </div>

                    {/* Input handle */}
                    <div
                      style={{
                        position: "absolute",
                        left: -6 * zoom,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 12 * zoom,
                        height: 12 * zoom,
                        background: "#0a0f1a",
                        border: `2px solid ${meta.color}88`,
                        borderRadius: "50%",
                        cursor: "crosshair",
                        zIndex: 5,
                      }}
                      onMouseUp={(e) => finishConnect(e, node.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = meta.color;
                        e.currentTarget.style.borderColor = meta.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#0a0f1a";
                        e.currentTarget.style.borderColor = `${meta.color}88`;
                      }}
                    />

                    {/* Output handles */}
                    {node.type === "condition" ? (
                      <>
                        {[
                          ["true", "35%", "#34d399", "T"],
                          ["false", "65%", "#f87171", "F"],
                        ].map(([h, top, clr, lbl]) => (
                          <div
                            key={h}
                            style={{
                              position: "absolute",
                              right: -6 * zoom,
                              top,
                              transform: "translateY(-50%)",
                              width: 12 * zoom,
                              height: 12 * zoom,
                              background: "#0a0f1a",
                              border: `2px solid ${clr}88`,
                              borderRadius: "50%",
                              cursor: "crosshair",
                              zIndex: 5,
                            }}
                            onMouseDown={(e) => startConnect(e, node.id, h)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = clr;
                              e.currentTarget.style.borderColor = clr;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#0a0f1a";
                              e.currentTarget.style.borderColor = `${clr}88`;
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                right: 14 * zoom,
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: 7 * zoom,
                                color: clr,
                                fontFamily: "'JetBrains Mono'",
                                pointerEvents: "none",
                              }}
                            >
                              {lbl}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          right: -6 * zoom,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 12 * zoom,
                          height: 12 * zoom,
                          background: "#0a0f1a",
                          border: `2px solid ${meta.color}88`,
                          borderRadius: "50%",
                          cursor: "crosshair",
                          zIndex: 5,
                        }}
                        onMouseDown={(e) => startConnect(e, node.id, "default")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = meta.color;
                          e.currentTarget.style.borderColor = meta.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#0a0f1a";
                          e.currentTarget.style.borderColor = `${meta.color}88`;
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {nodes.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      border: "1px dashed #1e2d3d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ color: "#1e2d3d", fontSize: 24 }}>+</span>
                  </div>
                  <div
                    style={{
                      color: "#2a3a4a",
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono'",
                    }}
                  >
                    drag nodes from the left panel
                  </div>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                display: "flex",
                gap: 4,
                zIndex: 10,
              }}
            >
              {[
                ["−", () => setZoom((z) => Math.max(z * 0.85, 0.3))],
                [
                  "⊡",
                  () => {
                    setZoom(1);
                    setPan({ x: 60, y: 60 });
                  },
                ],
                ["+", () => setZoom((z) => Math.min(z * 1.15, 2))],
              ].map(([lbl, fn]) => (
                <button
                  key={lbl}
                  onClick={fn}
                  style={{
                    width: 28,
                    height: 28,
                    background: "#080d14",
                    border: "1px solid #1e2d3d",
                    color: "#4a6580",
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono'",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#e2e8f0")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#4a6580")
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>

            {connecting && (
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#0a0f1a",
                  border: "1px solid #1e2d3d",
                  color: "#4a6580",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 10,
                  letterSpacing: 1,
                  padding: "6px 14px",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                click an input handle to connect · click canvas to cancel
              </div>
            )}
          </div>

          {/* ── Config Panel ── */}
          <div
            style={{
              position: "relative",
              width: selectedNode ? 300 : 0,
              flexShrink: 0,
              transition: "width 0.2s",
            }}
          >
            <ConfigPanel
              node={selectedNode}
              onChange={updateNode}
              onDelete={() => deleteNode(selected)}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#080d14",
            border: `1px solid ${toast.err ? "#7f1d1d" : "#1e2d3d"}`,
            color: toast.err ? "#f87171" : "#34d399",
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            padding: "10px 16px",
            zIndex: 1000,
            letterSpacing: 1,
          }}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
