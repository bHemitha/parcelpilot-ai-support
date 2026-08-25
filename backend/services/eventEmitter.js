// Server-Sent Events (SSE) broadcaster for real-time state synchronization
const clients = new Set();

export function addClient(res) {
  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
  });
}

export function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    try {
      client.write(`event: ${eventType}\n`);
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      clients.delete(client);
    }
  });
}
