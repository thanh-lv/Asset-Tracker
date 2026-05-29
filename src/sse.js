// Module SSE (Server-Sent Events) don gian.
// Quan ly tat ca client dang ket noi va broadcast event khi co du lieu moi.

/** @type {Set<import('express').Response>} */
const clients = new Set();

/**
 * Express middleware – client goi GET /api/events de mo ket noi SSE.
 */
export function sseHandler(_req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  // Gui comment de giu ket noi mo ngay lap tuc
  res.write(':ok\n\n');

  clients.add(res);
  console.log(`[sse] client ket noi (tong: ${clients.size})`);

  _req.on('close', () => {
    clients.delete(res);
    console.log(`[sse] client ngat (tong: ${clients.size})`);
  });
}

/**
 * Broadcast event toi tat ca SSE client dang ket noi.
 * @param {string} event  Ten event (vi du: 'prices-updated')
 * @param {object} [data] Du lieu gui kem (JSON)
 */
export function broadcast(event, data = {}) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
  console.log(`[sse] broadcast "${event}" -> ${clients.size} client`);
}
