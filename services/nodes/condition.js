export default async function execute(config, input) {
  const { field, operator, value } = config

  // Safely navigate nested field e.g. "data.status" from input
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

  // Return result + pass input through so next node gets it
  return { conditionResult: result, ...input }
}