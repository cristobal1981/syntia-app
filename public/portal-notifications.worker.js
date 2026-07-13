/**
 * SharedWorker spike for portal notification polling.
 * BroadcastChannel + leader election remains the active coordinator.
 * This worker can own a single adaptive timer if we migrate later.
 */
const ports = new Set()
let pollTimer = null
let currentIntervalMs = 30_000

function schedulePoll() {
  if (pollTimer) {
    clearTimeout(pollTimer)
  }

  pollTimer = setTimeout(() => {
    for (const port of ports) {
      port.postMessage({ type: 'poll-tick', intervalMs: currentIntervalMs })
    }
    schedulePoll()
  }, currentIntervalMs)
}

self.addEventListener('connect', (event) => {
  const port = event.ports[0]
  ports.add(port)

  port.addEventListener('message', (messageEvent) => {
    const data = messageEvent.data
    if (!data || typeof data !== 'object') return

    if (data.type === 'set-interval' && typeof data.intervalMs === 'number') {
      currentIntervalMs = data.intervalMs
      schedulePoll()
      return
    }

    if (data.type === 'poll-result-broadcast') {
      for (const peer of ports) {
        if (peer !== port) {
          peer.postMessage({ type: 'poll-result', payload: data.payload })
        }
      }
    }
  })

  port.start()

  if (ports.size === 1) {
    schedulePoll()
  }
})
