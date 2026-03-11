import { createServer, type Server } from 'node:net';
import { unlinkSync, existsSync } from 'node:fs';
import type { Socket } from 'node:net';
import type { Notification } from './types.js';

export interface NotifierOptions {
  socketPath: string;
}

export class SocketNotifier {
  private server: Server | null = null;
  private clients: Set<Socket> = new Set();
  private socketPath: string;

  constructor(opts: NotifierOptions) {
    this.socketPath = opts.socketPath;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up stale socket
      if (existsSync(this.socketPath)) {
        try { unlinkSync(this.socketPath); } catch { /* ignore */ }
      }

      this.server = createServer((socket) => {
        this.clients.add(socket);
        socket.on('close', () => this.clients.delete(socket));
        socket.on('error', () => this.clients.delete(socket));
      });

      this.server.on('error', reject);
      this.server.listen(this.socketPath, () => resolve());
    });
  }

  broadcast(notification: Notification): void {
    const message = JSON.stringify(notification) + '\n';
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.clients) {
        client.destroy();
      }
      this.clients.clear();

      if (this.server) {
        this.server.close(() => {
          if (existsSync(this.socketPath)) {
            try { unlinkSync(this.socketPath); } catch { /* ignore */ }
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
