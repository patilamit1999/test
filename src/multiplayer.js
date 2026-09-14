const DEFAULT_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'ws://localhost:8080'
  : 'wss://ganpati-darshan-server.onrender.com';

export function createMultiplayer({ url = DEFAULT_URL, onJoin, onLeave, onUpdate, onFlowers, onPrasad, onVisitorList, onError } = {}) {
  let ws = null, myId = null, connected = false, disposed = false;
  const visitors = new Map();
  let lastSent = 0;

  function handle(message) {
    switch (message.type) {
      case 'welcome':
        myId = message.id;
        connected = true;
        break;
      case 'visitors':
        for (const v of message.visitors) visitors.set(v.id, { ...v });
        onVisitorList?.(message.visitors);
        break;
      case 'join':
        visitors.set(message.id, { name: message.name, gender: message.gender, x: message.x, z: message.z, angle: message.angle, flowers: message.flowers, prasad: message.prasad });
        onJoin?.(message.id, visitors.get(message.id));
        break;
      case 'leave':
        visitors.delete(message.id);
        onLeave?.(message.id);
        break;
      case 'update': {
        const v = visitors.get(message.id);
        if (v) {
          if (message.name !== undefined) v.name = message.name;
          if (message.gender !== undefined) v.gender = message.gender;
          if (message.x !== undefined) v.x = message.x;
          if (message.z !== undefined) v.z = message.z;
          if (message.angle !== undefined) v.angle = message.angle;
          if (message.flowers !== undefined) v.flowers = message.flowers;
          if (message.prasad !== undefined) v.prasad = message.prasad;
        }
        onUpdate?.(message.id, v);
        break;
      }
      case 'flowers':
        if (visitors.has(message.id)) visitors.get(message.id).flowers = true;
        onFlowers?.(message.id);
        break;
      case 'prasad':
        if (visitors.has(message.id)) visitors.get(message.id).prasad = true;
        onPrasad?.(message.id);
        break;
      case 'error':
        onError?.(message.message);
        break;
    }
  }

  function send(message) {
    if (ws?.readyState === 1) ws.send(JSON.stringify(message));
  }

  let pendingUpdate = null;
  function connect() {
    if (disposed || ws) return;
    try {
      ws = new WebSocket(url);
    } catch {
      onError?.('मंडपात इतर भाविक जोडता आले नाहीत.');
      return;
    }
    ws.addEventListener('open', () => {
      connected = true;
      if (pendingUpdate) { send({ type: 'update', ...pendingUpdate }); pendingUpdate = null; }
    });
    ws.addEventListener('message', event => {
      try { handle(JSON.parse(event.data)); } catch {}
    });
    ws.addEventListener('close', () => {
      connected = false;
      ws = null;
      if (!disposed) setTimeout(connect, 3000);
    });
    ws.addEventListener('error', () => {
      onError?.('मंडपात इतर भाविक जोडता आले नाहीत.');
    });
  }

  function sendUpdate(data) {
    const now = performance.now();
    if (now - lastSent < 50) return;
    lastSent = now;
    if (ws?.readyState !== 1) { pendingUpdate = { ...pendingUpdate, ...data }; return; }
    send({ type: 'update', ...data });
  }

  return {
    connect,
    get connected() { return connected; },
    get id() { return myId; },
    get visitors() { return visitors; },
    sendUpdate,
    sendFlowers() { send({ type: 'flowers' }); },
    sendPrasad() { send({ type: 'prasad' }); },
    disconnect() {
      disposed = true;
      visitors.clear();
      if (ws) { ws.close(); ws = null; }
    },
  };
}
