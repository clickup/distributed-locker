import { inspect } from "util";
import {
  isMainThread,
  parentPort,
  Worker,
  workerData as maybeWorkerData,
} from "worker_threads";
import type { DeferredPromise } from "p-defer";
import pDefer from "p-defer";
import type { DatabaseModule, ProcessData } from "./Database";
import Events from "./Events";
import type { ReporterThreadOptions } from "./ReporterThread";
import ReporterThread from "./ReporterThread";

export interface ReporterOptions {
  readonly database: DatabaseModule;
  readonly processHash: string;
  readonly reportWriteMs: number;
  readonly reportTtlMs: number;
}

/**
 * The idea: spawn a background thread which is guaranteed to not have any event
 * loop blocking ever, and from this thread, write/extend the per-process key
 * frequently enough to report that the process is still alive. When we try to
 * acquire a particular lock, we also recheck that the corresponding process is
 * alive; if not, we treat the lock as available. Thus, a process restart
 * results into a pretty quick locks re-acquisition by other processes.
 */
export default class Reporter {
  private _worker?: Worker;
  private _ready?: DeferredPromise<void>;

  /**
   * Allows to subscribe to recoverable errors happened in this Reporter.
   */
  readonly errors = new Events<string>();

  constructor(private _options: ReporterOptions) {}

  /**
   * Returns process hash of this Reporter.
   */
  processHash(): string {
    return this._options.processHash;
  }

  /**
   * Makes sure the reporter background thread is started. Resolves as soon as
   * it successfully writes aliveness data to the database. Since the thread
   * remains running infinitely and runs retries forever, the returned promise
   * doesn't have a timeout to resolve.
   */
  async ensureRunning(): Promise<void> {
    if (this._ready) {
      return this._ready.promise;
    }

    this._ready = pDefer();

    this._worker = new Worker(`${__dirname}/../dist/Reporter`, {
      workerData: {
        database: this._options.database,
        processHash: this._options.processHash,
        reportWriteMs: this._options.reportWriteMs,
        reportTtlMs: this._options.reportTtlMs,
      } as ReporterThreadOptions,
      env: process.env,
    });
    this._worker.unref();

    this._worker.on("message", (msg: ChildToParentMsg) => {
      if (msg.type === MsgType.ERROR) {
        this.errors.emit(msg.error);
        // Don't call ready.reject() here: the background thread should continue
        // running infinitely trying to reconnect and self-heal.
      } else if (msg.type === MsgType.WRITE) {
        // Only the 1st call to resolve() will actually work, the rest will be
        // no-ops due to the Promise protocol.
        this._ready!.resolve();
      }
    });

    return this._ready.promise;
  }

  /**
   * Terminates the reporter background thread.
   */
  async terminate(): Promise<void> {
    try {
      await this._worker?.terminate().catch((e) => this.errors.emit(e));
      this._ready?.reject("Reporter terminated");
    } finally {
      this._worker = undefined;
      this._ready = undefined;
    }
  }
}

enum MsgType {
  ERROR = "Reporter:error",
  WRITE = "Reporter:write",
}

type ChildToParentMsg =
  | { type: MsgType.ERROR; error: string }
  | { type: MsgType.WRITE; processData: ProcessData };

const workerData: ReporterThreadOptions | undefined = isMainThread
  ? undefined
  : maybeWorkerData;
if (
  workerData &&
  typeof workerData.database?.moduleName === "string" &&
  typeof workerData.database?.exportName === "string" &&
  typeof workerData.processHash === "string" &&
  typeof workerData.reportWriteMs === "number" &&
  typeof workerData.reportTtlMs === "number"
) {
  const thread = new ReporterThread(workerData);
  thread.errors.subscribe((error) =>
    postMessageToParent({
      type: MsgType.ERROR,
      error: inspect(error),
    })
  );
  thread
    .loop((processData) =>
      postMessageToParent({
        type: MsgType.WRITE,
        processData,
      })
    )
    .catch((error) =>
      postMessageToParent({
        type: MsgType.ERROR,
        error: inspect(error),
      })
    );
}

function postMessageToParent(message: ChildToParentMsg): void {
  parentPort!.postMessage(message);
}
