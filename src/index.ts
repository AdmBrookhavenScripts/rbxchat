export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }
    
    const id = env.CHAT_ROOM.idFromName('global');
    const stub = env.CHAT_ROOM.get(id);
    return stub.fetch(request);
  },
};

export class ChatRoom {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    this.state.acceptWebSocket(server);

    return new Response(null, { 
      status: 101, 
      webSocket: client 
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    for (const client of this.state.getWebSockets()) {
      try {
        client.send(message);
      } catch (e) {
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    ws.close();
  }
}
