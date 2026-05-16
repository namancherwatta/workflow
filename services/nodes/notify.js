import nodemailer from "nodemailer"

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
    from: process.env.SMTP_FROM,
    to,
    subject: "Flow Workflow Notification",
    text: message,
  })
}

async function sendSlack(webhookUrl, message) {
  const { default: axios } = await import("axios")
  await axios.post(webhookUrl, { text: message })
}

function interpolate(str = "", input = {}) {
  return str.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    return path.trim().split(".").reduce((obj, key) => obj?.[key], { output: input }) ?? ""
  })
}