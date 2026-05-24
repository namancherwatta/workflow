import nodemailer from "nodemailer"

// Notify node — sends a notification via Email or Slack
// Supports {{output.field}} interpolation in the message body
export default async function execute(config, input) {
  const message = interpolate(config.message, input)

  if (config.channel === "email") {
    await sendEmail(config.to, message)
  } else if (config.channel === "slack") {
    await sendSlack(config.slackWebhookUrl, message)
  } else {
    throw new Error(`Unknown notify channel: "${config.channel}"`)
  }

  return { notified: true, channel: config.channel, message }
}

// Sends an email using SMTP credentials from environment variables
// Configure via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env
async function sendEmail(to, message) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to,
    subject: "Flow Workflow Notification",
    text:    message,
  })
}

// Sends a message to a Slack channel via an incoming webhook URL
async function sendSlack(webhookUrl, message) {
  const { default: axios } = await import("axios")
  await axios.post(webhookUrl, { text: message })
}

// Replaces {{output.field}} tokens with values from the previous node's output
function interpolate(str = "", input = {}) {
  return str.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    return path.trim().split(".").reduce((obj, key) => obj?.[key], { output: input }) ?? ""
  })
}
