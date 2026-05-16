import axios from "axios"

export default async function execute(config, input) {
  // Replace {{placeholders}} in URL/body with values from previous node output
  const url = interpolate(config.url, input)
  const body = config.body ? JSON.parse(interpolate(config.body, input)) : undefined

  const response = await axios({
    method: config.method || "GET",
    url,
    headers: config.headers ? Object.fromEntries(config.headers) : {},
    data: body,
  })

  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  }
}

// Replaces {{output.userId}} style tokens with actual values from input
function interpolate(str = "", input = {}) {
  return str.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    return path.trim().split(".").reduce((obj, key) => obj?.[key], { output: input }) ?? ""
  })
}