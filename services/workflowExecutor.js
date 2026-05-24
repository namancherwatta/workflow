import vm from "vm"
import Run from "../models/run.js"
import Node from "../models/node.js"
import http_request from "./nodes/httpRequest.js"
import condition    from "./nodes/condition.js"
import delay        from "./nodes/delay.js"
import notify       from "./nodes/notify.js"

// Node registry — maps node type strings to their executor functions
// To add a new node type: create services/nodes/your_node.js and add it here
export const nodeRegistry = {
  http_request,
  condition,
  delay,
  notify,
}

const MAX_RETRIES  = 3
const NODE_TIMEOUT = 10_000 // ms — per-node execution timeout

// Determines which node to execute next based on the current node's type and routing config
// Tracks whether we arrived at the current node via a branch jump to prevent bleed-through
function getNextNodeRef(node, currentNodeRef, sortedNodes, result, arrivedViaBranch = false) {

  // Condition node — pick the true or false branch based on evaluation result
  if (node.type === "condition") {
    const branchOrder = result.conditionResult
      ? currentNodeRef.nextOnTrueOrder
      : currentNodeRef.nextOnFalseOrder

    if (branchOrder == null) return { nodeRef: null, viaBranch: false }

    const found = sortedNodes.find(n => n.order === branchOrder) || null
    return { nodeRef: found, viaBranch: true }
  }

  // Explicit next node — follow the jump regardless of order
  // viaBranch flag is propagated so multi-node branches stop correctly at the end
  if (currentNodeRef.nextNodeIdOrder != null) {
    const found = sortedNodes.find(n => n.order === currentNodeRef.nextNodeIdOrder) || null
    return { nodeRef: found, viaBranch: arrivedViaBranch }
  }

  // If we arrived via a branch and there's no explicit next, stop here
  // This prevents the false branch from running after the true branch completes
  if (arrivedViaBranch) {
    return { nodeRef: null, viaBranch: false }
  }

  // Default — linear progression to the next highest order number
  const currentOrder = currentNodeRef.order
  const nextInOrder  = sortedNodes
    .filter(n => n.order > currentOrder)
    .sort((a, b) => a.order - b.order)[0]

  return { nodeRef: nextInOrder || null, viaBranch: false }
}

// Main execution engine — walks through workflow nodes sequentially
// Called by the BullMQ worker, never directly from Express
export async function executeWorkflow(workflow, run) {
  await Run.findByIdAndUpdate(run._id, { status: "running" })

  const sortedNodes    = [...workflow.nodes].sort((a, b) => a.order - b.order)
  let currentOutput    = run.triggerPayload || {}
  let currentNodeRef   = sortedNodes[0]
  let arrivedViaBranch = false

  while (currentNodeRef) {
    const node = await Node.findById(currentNodeRef.nodeId)

    if (!node) {
      await failRun(run._id, `Node ${currentNodeRef.nodeId} not found in DB`)
      return
    }

    // Apply optional JS transform before passing output to this node
    // Runs in a sandboxed vm context with a 1s timeout to prevent infinite loops
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

    // Persist node log regardless of success or failure
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
        },
      },
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

  // All nodes completed successfully
  const endedAt = new Date()
  await Run.findByIdAndUpdate(run._id, {
    status:   "success",
    endedAt,
    duration: endedAt - new Date(run.startedAt),
  })
}

// Wraps a node execution with retry logic and a per-node timeout
// Uses exponential backoff: 1s, 2s, 4s between retries
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
        ),
      ])
      return { result, error: null, retryCount }
    } catch (err) {
      lastError = err
      retryCount++
      if (retryCount <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)))
      }
    }
  }

  return { result: null, error: lastError, retryCount }
}

// Marks a run as failed and logs the reason to the console
async function failRun(runId, reason) {
  await Run.findByIdAndUpdate(runId, {
    status:  "failed",
    endedAt: new Date(),
  })
  console.error(`Run ${runId} failed: ${reason}`)
}
