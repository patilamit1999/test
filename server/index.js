import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const PORT = process.env.PORT || 8080;
const MAX_VISITORS = 50;
const visitors = new Map();

const wss = new WebSocketServer({ port: PORT, clientTracking: true });
console.log(`गणपती मंडप WebSocket सर्व्हर चालू — पोर्ट ${PORT}`);

function broadcast(message, except = null) {
  const data = JSON.stringify(message);
  for (const [id, ws] of visitors) {
    if (id !== except && ws.readyState === 1) ws.send(data);
  }
}

function sendVisitorList(ws) {
  const list = [...visitors.keys()]
    .filter(id => visitors.get(id) !== ws)
    .map(id => {
      const meta = visitors.get(id).__meta;
      return { id, ...meta };
    });
  ws.send(JSON.stringify({ type: 'visitors', visitors: list }));
}

wss.on('connection', ws => {
  if (visitors.size >= MAX_VISITORS) {
    ws.send(JSON.stringify({ type: 'error', message: 'मंडप भरला आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' }));
    ws.close();
    return;
  }

  const id = randomUUID();
  visitors.set(id, ws);
  ws.__meta = { name: '', gender: 'male', x: 0, z: 10.5, angle: 0.25, flowers: false, prasad: false };

  ws.send(JSON.stringify({ type: 'welcome', id, count: visitors.size }));
  sendVisitorList(ws);
  broadcast({ type: 'join', id, ...ws.__meta }, id);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'update') {
      if (msg.name !== undefined) ws.__meta.name = String(msg.name).slice(0, 24);
      if (msg.gender !== undefined) ws.__meta.gender = msg.gender;
      if (msg.x !== undefined) ws.__meta.x = msg.x;
      if (msg.z !== undefined) ws.__meta.z = msg.z;
      if (msg.angle !== undefined) ws.__meta.angle = msg.angle;
      if (msg.flowers !== undefined) ws.__meta.flowers = msg.flowers;
      if (msg.prasad !== undefined) ws.__meta.prasad = msg.prasad;
      broadcast({ type: 'update', id, ...ws.__meta }, id);
    } else if (msg.type === 'flowers') {
      ws.__meta.flowers = true;
      broadcast({ type: 'flowers', id }, id);
    } else if (msg.type === 'prasad') {
      ws.__meta.prasad = true;
      broadcast({ type: 'prasad', id }, id);
    }
  });

  ws.on('close', () => {
    visitors.delete(id);
    broadcast({ type: 'leave', id });
  });
});
