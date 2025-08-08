export type MavlinkMessage = {
  msgid: number;
  payload: unknown;
};

export class MavlinkClient {
  connect(): Promise<void> {
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  sendCommand(_command: string, _params?: Record<string, unknown>): Promise<void> {
    return Promise.resolve();
  }
  onMessage(_handler: (msg: MavlinkMessage) => void): void {}
}

export function useMAVLink() {
  let connected = false;
  const connect = () => {
    connected = true;
  };
  const disconnect = () => {
    connected = false;
  };
  const isConnected = () => connected;
  return { connect, disconnect, isConnected };
}


