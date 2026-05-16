import vm from "vm"
import Run from "../models/run.js"
import Node from "../models/node.js"

// ── Registry — add new node type = add 1 import + 1 line here ──────────────
import http_request from "./nodes/httprequest.js"
import condition    from "./nodes/condition.js"
import delay        from "./nodes/delay.js"
import notify       from "./nodes/notify.js"

export const nodeRegistry = {
  http_request,
  condition,
  delay,
  notify,
}

const MAX_RETRIES    = 3
const NODE_TIMEOUT   = 10_000  // 10 seconds per node

// ── Main entry point ────────────────────────────────────────────────────────
export async function executeWorkflow(workflow, run) {
  // Mark run as running
  await Run.findByIdAndUpdate(run._id, { status: "running" })

  // Sort nodes by order
  const sortedNodes = [...workflow.nodes].sort((a, b) => a.order - b.order)

  // This carries output from one node to the next
  let currentOutput = run.triggerPayload || {}

  // Track which node to execute next (used for condition branching)
  let nodeIndex = 0

  while (nodeIndex < sortedNodes.length) {
    const nodeRef  = sortedNodes[nodeIndex]
    const node     = await Node.findById(nodeRef.nodeId)

    if (!node) {
      await failRun(run._id, `Node ${nodeRef.nodeId} not found`)
      return
    }

    // Apply transformQuery if set — lets user reshape output between nodes
    // e.g. transformQuery = "output.data.userId" pulls just that field
    if (node.transformQuery) {
      try {
        currentOutput = vm.runInNewContext(
          node.transformQuery,
          { output: currentOutput },
          { timeout: 1000 }  // 1s sandbox timeout
        )
      } catch (err) {
        await failRun(run._id, `transformQuery failed: ${err.message}`)
        return
      }
    }

    // ── Execute node with retry loop ───────────────────────────────────────
    const { result, error, retryCount } = await executeWithRetry(node, currentOutput)
    const startedAt = new Date()
    const endedAt   = new Date()

    // Save this node's log entry
    await Run.findByIdAndUpdate(run._id, {
      $push: {
        nodeLogs: {
          nodeId:     node._id,
          order:      nodeRef.order,
          status:     error ? "failed" : "success",
          input:      currentOutput,
          output:     result ?? null,
          error:      error ? { message: error.message, stack: error.stack } : undefined,
          retryCount,
          startedAt,
          endedAt,
          duration:   endedAt - startedAt,
        }
      }
    })

    if (error) {
      await failRun(run._id, error.message)
      return
    }

    currentOutput = result

    // ── Handle condition branching ─────────────────────────────────────────
    if (node.type === "condition") {
      const tookTrueBranch = result.conditionResult

      // nodeRef has nextOnTrue / nextOnFalse pointing to specific node orders
      const branchRef = tookTrueBranch ? nodeRef.nextOnTrue : nodeRef.nextOnFalse

      if (!branchRef) {
        // No branch defined — end of workflow
        break
      }

      // Jump to the branch node by finding its index
      nodeIndex = sortedNodes.findIndex(n => n.order === branchRef.order)
      if (nodeIndex === -1) break
      continue  // skip nodeIndex++ below
    }

    nodeIndex++
  }

  // ── Mark run as success ────────────────────────────────────────────────
  const endedAt = new Date()
  await Run.findByIdAndUpdate(run._id, {
    status:   "success",
    endedAt,
    duration: endedAt - new Date(run.startedAt),
  })
}

// ── Retry wrapper ────────────────────────────────────────────────────────────
async function executeWithRetry(node, input) {
  const handler = nodeRegistry[node.type]
  if (!handler) {
    return { result: null, error: new Error(`Unknown node type: "${node.type}"`), retryCount: 0 }
  }

  let retryCount = 0
  let lastError

  while (retryCount <= MAX_RETRIES) {
    try {
      const result = await Promise.race([
        handler(node.config, input),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Node timed out after ${NODE_TIMEOUT}ms`)), NODE_TIMEOUT)
        )
      ])
      return { result, error: null, retryCount }
    } catch (err) {
      lastError = err
      retryCount++
      if (retryCount <= MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)))
      }
    }
  }

  return { result: null, error: lastError, retryCount }
}

// ── Helper ───────────────────────────────────────────────────────────────────
async function failRun(runId, reason) {
  await Run.findByIdAndUpdate(runId, {
    status:  "failed",
    endedAt: new Date(),
  })
  console.error(`Run ${runId} failed: ${reason}`)
}