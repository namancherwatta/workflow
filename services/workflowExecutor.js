import vm from "vm"
import Run from "../models/run.js"
import Node from "../models/node.js"

// ── Registry — add new node type = add 1 import + 1 line here ──────────────
import http_request from "./nodes/httpRequest.js"
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

function getNextNodeRef(node, currentNodeRef, sortedNodes, result, arrivedViaBranch = false) {

  if (node.type === "condition") {
    // ❌ old — reads nested object
    // const branchRef = result.conditionResult
    //   ? currentNodeRef.nextOnTrue
    //   : currentNodeRef.nextOnFalse
    // if (branchRef?.order == null) return { nodeRef: null, viaBranch: false }
    // const found = sortedNodes.find(n => n.order === branchRef.order) || null

    // ✅ new — reads flat number directly
    const branchOrder = result.conditionResult
      ? currentNodeRef.nextOnTrueOrder
      : currentNodeRef.nextOnFalseOrder

    if (branchOrder == null) return { nodeRef: null, viaBranch: false }

    const found = sortedNodes.find(n => n.order === branchOrder) || null
    return { nodeRef: found, viaBranch: true }
  }

  // ❌ old — reads nested object
  // if (currentNodeRef.nextNodeId?.order != null) {
  //   const found = sortedNodes.find(n => n.order === currentNodeRef.nextNodeId.order) || null

  // ✅ new — reads flat number directly
  if (currentNodeRef.nextNodeIdOrder != null) {
    const found = sortedNodes.find(n => n.order === currentNodeRef.nextNodeIdOrder) || null
    return { nodeRef: found, viaBranch: arrivedViaBranch }
  }

  if (arrivedViaBranch) {
    return { nodeRef: null, viaBranch: false }
  }

  const currentOrder = currentNodeRef.order
  const nextInOrder  = sortedNodes
    .filter(n => n.order > currentOrder)
    .sort((a, b) => a.order - b.order)[0]

  return { nodeRef: nextInOrder || null, viaBranch: false }
}

// ── Main entry point ────────────────────────────────────────────────────────
export async function executeWorkflow(workflow, run) {
  await Run.findByIdAndUpdate(run._id, { status: "running" })

  const sortedNodes    = [...workflow.nodes].sort((a, b) => a.order - b.order)
  let currentOutput    = run.triggerPayload || {}
  let currentNodeRef   = sortedNodes[0]
  let arrivedViaBranch = false   

  while (currentNodeRef) {
    const node = await Node.findById(currentNodeRef.nodeId)

    if (!node) {
      await failRun(run._id, `Node ${currentNodeRef.nodeId} not found`)
      return
    }

    if (node.transformQuery) {
      try {
        currentOutput = vm.runInNewContext(
          node.transformQuery,
          { output: currentOutput },
          { timeout: 1000 }
        )
      } catch (err) {
        await failRun(run._id, `transformQuery failed: ${err.message}`)
        return
      }
    }

    const startedAt = new Date()
    const { result, error, retryCount } = await executeWithRetry(node, currentOutput)
    const endedAt = new Date()

    await Run.findByIdAndUpdate(run._id, {
      $push: {
        nodeLogs: {
          nodeId:      node._id,
          nodeName:    node.name,
          nodeType:    node.type,
          order:       currentNodeRef.order,
          status:      error ? "failed" : "success",
          input:       currentOutput,
          output:      result ?? null,
          error:       error ? { message: error.message, stack: error.stack } : undefined,
          retryCount,
          startedAt,
          endedAt,
          duration:    endedAt - startedAt,
          branchTaken: node.type === "condition"
            ? (result?.conditionResult ? "true branch" : "false branch")
            : undefined,
        }
      }
    })

    if (error) {
      await failRun(run._id, error.message)
      return
    }

    currentOutput = result

    const { nodeRef: nextRef, viaBranch } = getNextNodeRef(
      node, currentNodeRef, sortedNodes, result, arrivedViaBranch
    )

    currentNodeRef   = nextRef
    arrivedViaBranch = viaBranch  
  }

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