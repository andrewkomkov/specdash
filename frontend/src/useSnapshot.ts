import { useCallback, useEffect, useRef, useState } from 'react'
import type { Feature, Snapshot } from './types'

export type Connection = 'connecting' | 'live' | 'offline'

export interface LiveState {
  snapshot: Snapshot | null
  connection: Connection
  reason: string
  /** feature ids whose files changed within the last few seconds */
  recent: Set<string>
  refresh: () => void
}

const FLASH_MS = 6000

function featureStamps(snapshot: Snapshot | null): Map<string, number> {
  const map = new Map<string, number>()
  if (!snapshot) return map
  for (const project of snapshot.projects) {
    for (const feature of project.features) {
      map.set(`${project.id}/${feature.id}`, feature.modified)
    }
  }
  return map
}

/** Live snapshot over a websocket, with polling fallback if the socket dies. */
export function useSnapshot(): LiveState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [reason, setReason] = useState('')
  const [recent, setRecent] = useState<Set<string>>(new Set())

  const stamps = useRef<Map<string, number>>(new Map())
  const timers = useRef<Map<string, number>>(new Map())
  const socket = useRef<WebSocket | null>(null)

  const markChanged = useCallback((next: Snapshot) => {
    const before = stamps.current
    const after = featureStamps(next)
    const changed: string[] = []
    if (before.size) {
      for (const [key, mtime] of after) {
        const prev = before.get(key)
        if (prev === undefined || mtime > prev) changed.push(key)
      }
    }
    stamps.current = after
    if (!changed.length) return
    setRecent((current) => {
      const merged = new Set(current)
      changed.forEach((key) => merged.add(key))
      return merged
    })
    for (const key of changed) {
      const existing = timers.current.get(key)
      if (existing) window.clearTimeout(existing)
      timers.current.set(
        key,
        window.setTimeout(() => {
          timers.current.delete(key)
          setRecent((current) => {
            const merged = new Set(current)
            merged.delete(key)
            return merged
          })
        }, FLASH_MS),
      )
    }
  }, [])

  const apply = useCallback(
    (next: Snapshot, why: string) => {
      markChanged(next)
      setSnapshot(next)
      setReason(why)
    },
    [markChanged],
  )

  useEffect(() => {
    let closed = false
    let retry: number | undefined

    const connect = () => {
      if (closed) return
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws`)
      socket.current = ws

      ws.onopen = () => setConnection('live')
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'snapshot') apply(message.snapshot as Snapshot, message.reason ?? '')
      }
      ws.onclose = () => {
        socket.current = null
        if (closed) return
        setConnection('offline')
        retry = window.setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }

    // First paint should not wait for the socket handshake.
    fetch('/api/snapshot')
      .then((r) => r.json())
      .then((data: Snapshot) => setSnapshot((current) => current ?? data))
      .catch(() => undefined)

    connect()
    return () => {
      closed = true
      if (retry) window.clearTimeout(retry)
      socket.current?.close()
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [apply])

  const refresh = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send('refresh')
    } else {
      fetch('/api/refresh', { method: 'POST' })
        .then(() => fetch('/api/snapshot'))
        .then((r) => r.json())
        .then((data: Snapshot) => apply(data, 'manual'))
        .catch(() => undefined)
    }
  }, [apply])

  return { snapshot, connection, reason, recent, refresh }
}

export function allFeatures(snapshot: Snapshot | null): Feature[] {
  if (!snapshot) return []
  return snapshot.projects.flatMap((p) => p.features)
}
