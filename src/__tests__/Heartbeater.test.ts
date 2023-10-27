import delay from "delay";
import range from "lodash/range";
import Heartbeater from "../Heartbeater";

it("should coalesce bursts of calls inside heartbeat()", async () => {
  let count = 0;
  const heartbeater = new Heartbeater("test").withOnEvery(10, () => {
    count++;
  });

  await delay(50);
  await Promise.all(range(100).map(async () => heartbeater.heartbeat()));
  expect(count).toBe(1);

  await delay(50);
  await Promise.all(range(100).map(async () => heartbeater.heartbeat()));
  expect(count).toBe(2);
});
