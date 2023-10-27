import delay from "delay";
import type { DatabaseModule, ProcessData } from "./Database";
import Database from "./Database";
import Events from "./Events";

export interface ReporterThreadOptions {
  readonly database: DatabaseModule;
  readonly processHash: string;
  readonly reportWriteMs: number;
  readonly reportTtlMs: number;
}

export default class ReporterThread {
  readonly errors = new Events<unknown>();

  constructor(private _options: ReporterThreadOptions) {}

  async loop(onWrite: (processData: ProcessData) => void): Promise<void> {
    const database = Database.load(this._options.database);
    database.errors.subscribe((e: unknown) => this.errors.emit(e));

    while (true) {
      try {
        const processData = database.createProcessData();
        await database.saveProcessData(
          this._options.processHash,
          processData,
          this._options.reportTtlMs
        );
        onWrite(processData);
      } catch (e: unknown) {
        this.errors.emit(e);
      }

      await delay(this._options.reportWriteMs);
    }
  }
}
