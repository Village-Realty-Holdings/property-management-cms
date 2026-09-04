import canUseDOM from './canUseDOM'

// `NEXT_PUBLIC_SERVER_URL` is set in `wrangler.jsonc` (`vars`) for the Worker
// and in `.env` / `.dev.vars` locally.
export const getServerSideURL = () => {
  return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || ''
}
