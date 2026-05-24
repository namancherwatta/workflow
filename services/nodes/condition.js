// Condition node — evaluates a field from the previous node's output against a value
// Returns conditionResult: true/false which the executor uses to pick a branch
// Also passes the full input through so the next node has access to previous data
export default async function execute(config, input) {
  const { field, operator, value } = config

  // Supports dot notation for nested fields e.g. "data.user.status"
  const actual = field.split(".").reduce((obj, key) => obj?.[key], input)

  let result = false

  switch (operator) {
    case "equals":
      result = String(actual) === String(value)
      break
    case "not_equals":
      result = String(actual) !== String(value)
      break
    case "gt":
      result = Number(actual) > Number(value)
      break
    case "lt":
      result = Number(actual) < Number(value)
      break
    case "contains":
      result = String(actual).toLowerCase().includes(String(value).toLowerCase())
      break
    case "exists":
      result = actual !== undefined && actual !== null
      break
    default:
      throw new Error(`Unknown condition operator: "${operator}"`)
  }

  return { conditionResult: result, ...input }
}
