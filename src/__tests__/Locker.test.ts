import delay from "delay";
import range from "lodash/range";
import pDefer from "p-defer";
import Locker from "../Locker";
import LockError from "../LockError";
import LockStatus from "../LockStatus";
import OwnerHashStatus from "../OwnerHashStatus";

const REPORT_TTL_MS = 10000;
const LOCK_TTL_MS = 6000;

let locker1: Locker;
let locker2: Locker;
let KEY1: string;
let KEY2: string;

beforeEach(() => {
  KEY1 = "key1" + process.hrtime.bigint();
  KEY2 = "key2" + process.hrtime.bigint();
  [locker1, locker2] = range(0, 2).map(
    () =>
      new Locker({
        database: {
          moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
          exportName: "db",
        },
        reportWriteMs: REPORT_TTL_MS / 10,
        reportTtlMs: REPORT_TTL_MS,
        lockRecheckMs: 100,
        lockExtendMs: LOCK_TTL_MS / 3,
        lockTtlMs: LOCK_TTL_MS,
      }),
  );
});

afterEach(async () => {
  await locker1.terminate();
  await locker2.terminate();
});

it("acquires and releases lock", async () => {
  const res = await locker1.acquire(KEY1, "my-trace");
  expect(res).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  expect(
    await locker1.readOwnerHashStatus(res.lockData.ownerHash),
  ).toMatchObject({
    status: OwnerHashStatus.RUNNING,
  });

  expect(await locker2.acquire(KEY1)).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
  });

  expect(await locker1.release(KEY1, res.lockData)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  expect(
    await locker2.readOwnerHashStatus(res.lockData.ownerHash),
  ).toMatchObject({
    status: OwnerHashStatus.NO_KEY,
  });
});

it("doesn't acquire already acquired lock from the same process", async () => {
  const res = await locker1.acquire(KEY1);
  expect(res).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  expect(await locker1.acquire(KEY1)).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
  });
  expect(await locker1.release(KEY1, res.lockData)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
});

it("doesn't release someone else's lock", async () => {
  const { lockData } = await locker2.acquire(KEY2);
  lockData.ownerHash = "some";
  expect(await locker1.release(KEY2, lockData)).toMatchObject({
    status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
  });
});

it("acquires lock when other owner process dies suddenly", async () => {
  const SHORT_REPORT_TTL_MS = 1000;
  const lockerToDie = new Locker({
    database: {
      moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
      exportName: "db",
    },
    reportWriteMs: SHORT_REPORT_TTL_MS / 10,
    reportTtlMs: SHORT_REPORT_TTL_MS,
    lockRecheckMs: 100,
    lockExtendMs: LOCK_TTL_MS / 3,
    lockTtlMs: LOCK_TTL_MS,
  });
  const res = await lockerToDie.acquire(KEY1);
  await lockerToDie.terminate();
  await delay(SHORT_REPORT_TTL_MS + 300);
  expect(await locker2.acquire(KEY1)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  expect(
    await locker1.readOwnerHashStatus(res.lockData.ownerHash),
  ).toMatchObject({
    status: OwnerHashStatus.SOMEONE_ELSE_HOLDS_LOCK,
  });
});

it("expires the lock if not extended for a long time", async () => {
  const res = await locker1.acquire(KEY1);
  await delay(LOCK_TTL_MS + 300);
  expect(await locker2.readLockData(KEY1)).toEqual("maybe_unlocked");
  expect(
    await locker1.readOwnerHashStatus(res.lockData.ownerHash),
  ).toMatchObject({
    status: OwnerHashStatus.NO_KEY,
  });
});

it("doesn't expire the lock if it is extended", async () => {
  const { extend, lockData } = await locker1.acquire(KEY1);
  for (let i = 0; i < LOCK_TTL_MS / 1000; i++) {
    await delay(1000);
    expect(await extend!()).toMatchObject({ status: LockStatus.SUCCESS });
  }

  await delay(300);

  expect(await locker1.readLockData(KEY1)).toMatchObject({
    processHash: lockData.processHash,
    acquiredAt: lockData.acquiredAt,
    extendedAt: expect.not.stringMatching(lockData.extendedAt),
  });
  expect(await locker1.release(KEY1, lockData)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
});

it("correctly works in acquireAndRun", async () => {
  let needExit = false;
  let ownerHashOut = "";
  const acquired = pDefer();
  const locker = new Locker({
    database: {
      moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
      exportName: "db",
    },
    reportWriteMs: 100,
    reportTtlMs: 10000,
    lockRecheckMs: 100,
    lockExtendMs: LOCK_TTL_MS / 3,
    lockTtlMs: LOCK_TTL_MS,
  });
  const resPromise = locker.acquireAndRun(
    KEY1,
    async (heartbeater, ownerHash) => {
      ownerHashOut = ownerHash;
      acquired.resolve();
      while (!needExit) {
        await delay(100);
        await heartbeater.heartbeat();
      }
    },
  );

  await acquired.promise;

  for (let i = 0; i < LOCK_TTL_MS / 10; i++) {
    await delay(10);
    const res = await locker2.acquire(KEY1);
    expect(res).toMatchObject({
      status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK,
    });
  }

  needExit = true;
  const res = await resPromise;
  expect(res.status).toEqual(LockStatus.SUCCESS);
  expect(ownerHashOut).not.toBeFalsy();
});

it("does seppuku in acquireAndRun if someone else has taken over", async () => {
  const lockExpired = pDefer();
  const lockTakenOver = pDefer();
  const heartbeatErrorThrown = pDefer();
  locker1
    .acquireAndRun(KEY1, async (heartbeater) => {
      await delay(LOCK_TTL_MS + 200);
      lockExpired.resolve();
      await lockTakenOver.promise;
      try {
        await heartbeater.heartbeat();
        heartbeatErrorThrown.resolve("must throw doing seppuku");
      } catch (e: unknown) {
        heartbeatErrorThrown.resolve(e);
      }
    })
    .catch(() => {});

  await lockExpired.promise;

  expect(await locker2.acquire(KEY1)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  lockTakenOver.resolve();

  expect(await heartbeatErrorThrown.promise).toBeInstanceOf(LockError);
});

it("does seppuku when someone else has taken over even from the same pid", async () => {
  const locker = new Locker({
    database: {
      moduleName: `${__dirname}/../../dist/databases/__tests__/index`,
      exportName: "db",
    },
    reportWriteMs: 100000, // don't write report 2nd time
    reportTtlMs: 100, // expire process report quickly
    lockRecheckMs: 1, // make heartbeat to recheck all the time
    lockExtendMs: 100000, // never extend the lock
    lockTtlMs: 100000, // never expire the lock
  });

  const lockExpired = pDefer();
  const lockTakenOver = pDefer();
  const heartbeatErrorThrown = pDefer();
  locker
    .acquireAndRun(KEY1, async (heartbeater) => {
      await delay(1000); // delay > reportTtlMs
      lockExpired.resolve();
      await lockTakenOver.promise;
      try {
        await heartbeater.heartbeat();
        heartbeatErrorThrown.resolve("must throw doing seppuku");
      } catch (e: unknown) {
        heartbeatErrorThrown.resolve(e);
      }
    })
    .catch(() => {});

  await lockExpired.promise;

  // at this time, process liveness has expired, but lock ttl has not

  expect(await locker.acquire(KEY1)).toMatchObject({
    status: LockStatus.SUCCESS,
  });
  lockTakenOver.resolve();

  expect(await heartbeatErrorThrown.promise).toBeInstanceOf(LockError);
});

it.each([[1], [2]])(
  "does work in mutex() across %p locker(s)",
  async (lockers) => {
    const KEY = `test-mutex-${lockers}-${Date.now()}`;
    let count = 0;
    await Promise.all(
      range(0, 10).map(async (i) => {
        const locker = i % lockers === 0 ? locker1 : locker2;
        await locker.mutex(
          KEY,
          10000,
          async (_) => {
            count++;
            expect(count).toEqual(1);
            await delay(i * 10);
            count--;
            expect(count).toEqual(0);
          },
          async () => delay(10),
        );
      }),
    );
    expect(count).toEqual(0);
  },
);
