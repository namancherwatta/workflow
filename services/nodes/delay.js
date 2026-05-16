export default async function execute(config, input) {
  const seconds = config.seconds || 1
  await new Promise(resolve => setTimeout(resolve, seconds * 1000))
  return input
}