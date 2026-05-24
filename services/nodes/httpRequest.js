import axios from "axios"

// HTTP Request node — makes an outbound HTTP call and returns the response
// Supports GET, POST, PUT, DELETE with optional headers and body
// Supports {{output.field}} template interpolation in URL and body
export default async function execute(config, input) {
  const url  = interpolate(config.url, input)
  const body = config.body ? JSON.parse(interpolate(config.body, input)) : undefined

  const response = await axios({
    method:  config.method || "GET",
    url,
    headers: config.headers ? Object.fromEntries(config.headers) : {},
    data:    body,
  })

  return {
    status:  response.status,
    data:    response.data,
    headers: response.headers,
  }
}

// Replaces {{output.field.nested}} style tokens with values from the previous node's output
// Example: input = { userId: "u1" }, template = "https://api.com/{{output.userId}}" → "https://api.com/u1"
function interpolate(str = "", input = {}) {
  return str.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    return path.trim().split(".").reduce((obj, key) => obj?.[key], { output: input }) ?? ""
  })
}
