import { io, type Socket } from 'socket.io-client'

// Requires: npm install socket.io-client (in web/)
//
// Single shared socket per access token, matching the pattern the rest of
// this codebase already uses for auth (single-flight refresh, one source
// of truth). socketAuth.middleware.js expects the token in the handshake
// `auth` payload, not a query string — see that file for why.
//
// SOCKET_URL is derived from VITE_API_URL by stripping a trailing /api,
// since Socket.IO connects to the bare server origin, not the REST prefix.
function deriveSocketUrl() {
  const configured = import.meta.env?.VITE_API_URL as string | undefined
  if (configured) return configured.replace(/\/api\/?$/, '')
  if (import.meta.env?.DEV) return 'http://localhost:5000'
  return window.location.origin
}

const SOCKET_URL = deriveSocketUrl()

let socket: Socket | null = null
let socketToken: string | null = null

export function getSocket(accessToken: string): Socket {
  if (socket && socketToken === accessToken && socket.connected) return socket
  if (socket && socketToken === accessToken) {
    socket.connect()
    return socket
  }
  if (socket) socket.disconnect()

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  socketToken = accessToken
  return socket
}

// Call on logout / token invalidation so a stale socket never lingers with
// credentials for a session that's no longer valid.
export function closeSocket() {
  socket?.disconnect()
  socket = null
  socketToken = null
}
