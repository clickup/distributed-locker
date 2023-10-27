import delay from "delay";
import { db } from ".";
import type { LockData } from "../../Database";
import LockStatus from "../../LockStatus";

let KEY1: string;
let KEY2: string;
let HASH1: string;
let HASH2: string;
let seq = 0;

beforeEach(() => {
  KEY1 = "key1" + process.hrtime.bigint();
  KEY2 = "key2" + process.hrtime.bigint();
  HASH1 = "hash" + process.hrtime.bigint();
  HASH2 = "other" + process.hrtime.bigint();
});

it("creates lock in tryCreate", async () => {
  expect(await db.readLockData(KEY1)).toBeNull();

  const lockData = createLockData({ processHash: HASH1 });

  expect(await db.tryCreate(KEY1, lockData, 10000)).toMatchObject({
    status: LockStatus.SUCCESS,
    lockData,
  });

  expect(await db.readLockData(KEY1)).toEqual(lockData);
});

it("updates lock in tryUpdate", async () => {
  const lockData = createLockData({ processHash: HASH1 });
  await db.tryCreate(KEY1, lockData, 10000);

  const lockDataNew = createLockData({ processHash: HASH1 });

  expect(
    await db.tryUpdate(KEY1, lockDataNew, 10000, lockData.ownerHash)
  ).toMatchObject({
    status: LockStatus.SUCCESS,
    lockData: lockDataNew,
  });

  expect(await db.readLockData(KEY1)).toEqual(lockDataNew);
});

it("doesn't override another process'es lock on creation", async () => {
  const lockData = createLockData({ processHash: HASH1 });
  await db.tryCreate(KEY1, lockData, 10000);
  expect(
    await db.tryCreate(KEY1, createLockData({ processHash: HASH1 }), 10000)
  ).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
    lockData,
  });
});

it("doesn't override another process'es lock on update", async () => {
  const lockData = createLockData({ processHash: HASH1 });
  await db.tryCreate(KEY1, lockData, 10000);
  const lockDataNew = createLockData({ processHash: HASH1 });
  expect(
    await db.tryUpdate(KEY1, lockDataNew, 10000, lockDataNew.ownerHash)
  ).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
    lockData,
  });
});

it("doesn't update a non-existing lock", async () => {
  const lockData = createLockData({ processHash: HASH1 });
  expect(
    await db.tryUpdate(KEY1, lockData, 10000, lockData.ownerHash)
  ).toMatchObject({
    status: LockStatus.NO_KEY,
    lockData: null,
  });
});

it("expires lock after some time", async () => {
  await db.tryCreate(KEY1, createLockData({ processHash: HASH1 }), 2000);
  await delay(2100);
  expect(await db.readLockData(KEY1)).toBeNull();

  const lockData = createLockData({ processHash: HASH1 });
  expect(await db.tryCreate(KEY1, lockData, 2000)).toMatchObject({
    status: LockStatus.SUCCESS,
    lockData,
  });
});

it("unlocks successfully", async () => {
  const lockData = createLockData({ processHash: HASH1 });
  await db.tryCreate(KEY1, lockData, 10000);
  expect(await db.tryDelete(KEY1, lockData.ownerHash)).toMatchObject({
    status: LockStatus.SUCCESS,
    lockData: null,
  });
});

it("doesn't unlock another process'es lock", async () => {
  const lockData = createLockData({ processHash: HASH2 });
  await db.tryCreate(KEY2, lockData, 10000);
  expect(await db.tryDelete(KEY2, "some")).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
    lockData,
  });
});

it("works with process data", async () => {
  const processData = db.createProcessData();
  expect(await db.readProcessData(HASH1)).toBeNull();
  await db.saveProcessData(HASH1, processData, 10000);
  expect(await db.readProcessData(HASH1)).toEqual(processData);
});

it("expires process data", async () => {
  const processData = db.createProcessData();
  await db.saveProcessData(HASH1, processData, 2000);
  await delay(2100);
  expect(await db.readProcessData(HASH1)).toBeNull();
});

function createLockData({ processHash }: { processHash: string }): LockData {
  return db.createLockData({
    ownerHash: `${processHash}#${seq++}`,
    processHash,
    trace: undefined,
  });
}
