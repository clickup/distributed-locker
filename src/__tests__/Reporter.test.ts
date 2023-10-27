import delay from "delay";
import { db } from "../databases/__tests__";
import Reporter from "../Reporter";

let reporter: Reporter;
let HASH1: string;
let HASH2: string;

beforeEach(() => {
  HASH1 = "hash" + process.hrtime.bigint();
  HASH2 = "other" + process.hrtime.bigint();
});

beforeEach(async () => {
  reporter = new Reporter({
    database: {
      moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
      exportName: "db",
    },
    processHash: HASH1,
    reportWriteMs: 1000,
    reportTtlMs: 3000,
  });
  // eslint-disable-next-line no-console
  reporter.errors.subscribe((e) => console.log(e));
  await reporter.ensureRunning();
});

afterEach(async () => {
  await reporter.terminate();
});

it("writes to the database regularly", async () => {
  await delay(2000);
  const processData = await db.readProcessData(HASH1);
  expect(processData).not.toBeNull();
  await delay(1100);
  expect(await db.readProcessData(HASH1)).not.toEqual(processData);
  await reporter.terminate();
  await delay(3100);
  expect(await db.readProcessData(HASH1)).toBeNull();
});

it("delivers errors", async () => {
  const errors: string[] = [];
  reporter = new Reporter({
    database: {
      moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
      exportName: "dbBroken",
    },
    processHash: HASH2,
    reportWriteMs: 1000,
    reportTtlMs: 3000,
  });
  reporter.errors.subscribe((e) => errors.push(e));
  reporter.ensureRunning().catch(() => {});
  try {
    await delay(2000);
    expect(errors).not.toEqual([]);
    expect(errors.some((e) => e.includes("MaxRetriesPerRequestError")));
  } finally {
    await reporter.terminate();
  }
});
