// Bridge for GameMaker <-> React communication

export type GMEventType =
  | "STATE_SYNC"
  | "BOOST_APPLIED"
  | "REWARD_CLAIMED"
  | "CINEMATIC_START"
  | "CINEMATIC_VICTORY"
  | "CINEMATIC_END";

export interface GMEvent {
  type: GMEventType;
  payload?: any;
}

class GameMakerBridge {
  private iframe: HTMLIFrameElement | null = null;
  private ready = false;
  private queue: GMEvent[] = [];
  private loggedNotReady = false;

  setIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  markReady() {
    this.ready = true;
    this.loggedNotReady = false;
    this.flushQueue();
  }

  send(event: GMEvent) {
    if (!this.iframe || !this.iframe.contentWindow) {
      if (!this.loggedNotReady) {
        console.info("Bridge: iframe not ready, queueing events");
        this.loggedNotReady = true;
      }
      this.queue.push(event);
      return;
    }

    if (!this.ready) {
      if (!this.loggedNotReady) {
        console.info("Bridge: GameMaker not ready, queueing events");
        this.loggedNotReady = true;
      }
      this.queue.push(event);
      return;
    }

    this.iframe.contentWindow.postMessage(event, "*");
  }

  private flushQueue() {
    if (!this.ready || !this.iframe?.contentWindow) return;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      this.iframe.contentWindow.postMessage(event, "*");
    }
  }

  listen(callback: (event: GMEvent) => void) {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "READY") {
        this.markReady();
        return;
      }

      if (e.data?.type) {
        callback(e.data);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }
}

export const gmBridge = new GameMakerBridge();
