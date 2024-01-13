import range from "lodash/range";
import Heartbeater from "../Heartbeater";

jest.useFakeTimers();

it("should coalesce bursts of calls inside heartbeat()", async () => {
  let count = 0;
  const heartbeater = new Heartbeater("test").withOnEvery(10, () => {
    count++;
  });

  jest.advanceTimersByTime(50);

  await Promise.all(range(100).map(async () => heartbeater.heartbeat()));
  expect(count).toBe(1);

  jest.advanceTimersByTime(50);

  await Promise.all(range(100).map(async () => heartbeater.heartbeat()));
  expect(count).toBe(2);
});
