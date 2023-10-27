import delay from "delay";

/**
 * How often to temporarily interrupt delay() rechecking for a drain signal.
 * Notice that we could've used Promise.race() for this, but unfortunately there
 * is a memory leak in Node which appears when the same Promise is awaited too
 * many times within Promise.race(): https://github.com/nodejs/node/issues/17469
 */
const DELAY_QUANTUM_MS = 1000;

export default class Heartbeater {
  private static _drainingReason: string | null = null;

  ["constructor"]!: typeof Heartbeater;

  constructor(
    private _name: string,
    private _heartbeat: () => void | Promise<void> = () => {}
  ) {}

  /**
   * Marks the entire process as draining. Every heartbeat will throw
   * immediately in this mode.
   */
  static setDraining(reason: string): void {
    this._drainingReason = reason;
  }

  /**
   * Adds a function which will be called every this number of milliseconds
   * approximately (not more often) during a heartbeat.
   */
  withOnEvery(ms: number, callback: () => void | Promise<void>): Heartbeater {
    let lastTick = process.hrtime.bigint();
    return new Heartbeater(this._name, async () => {
      const now = process.hrtime.bigint();
      if (Number(now - lastTick) > ms * 1e6) {
        lastTick = now; // BEFORE calling callback(); this coalesces concurrent calls
        await callback();
      }

      await this._heartbeat();
    });
  }

  /**
   * Runs a heartbeat.
   */
  async heartbeat(): Promise<void> {
    if (this.constructor._drainingReason !== null) {
      throw new DrainingSignal(this._name, this.constructor._drainingReason);
    }

    await this._heartbeat();
  }

  /**
   * A helper function to sleep & heartbeat during the sleep.
   */
  async delay(ms: number): Promise<void> {
    ms = Math.trunc(ms);
    const timer = process.hrtime.bigint();
    while (true) {
      await this.heartbeat();

      const nextQuantum = Math.min(
        DELAY_QUANTUM_MS * 1e6,
        ms * 1e6 - Number(process.hrtime.bigint() - timer)
      );
      if (nextQuantum <= 0) {
        break;
      }

      await delay(nextQuantum / 1e6);
    }
  }
}

/**
 * A heartbeater instance for short-running processes.
 */
export class NoopHeartbeater extends Heartbeater {
  constructor() {
    super("NoopHeartbeater", async () => {});
  }
}

/**
 * Thrown when we want to finish the process soon, to abort the processing of
 * some long running job.
 */
export class DrainingSignal extends Error {
  constructor(name: string, reason: string | null) {
    super(
      `${name} aborted since the process is draining` +
        (reason ? `: ${reason}` : "")
    );
    this.name = this.constructor.name;
  }
}
