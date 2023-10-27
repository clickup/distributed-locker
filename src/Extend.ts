import type { LockData } from "./Database";
import type LockStatus from "./LockStatus";

export default interface Extend {
  (): Promise<
    | { status: LockStatus.SUCCESS; lockData: LockData }
    | { status: LockStatus.NO_KEY; lockData: null }
    | { status: LockStatus.SOMEONE_ELSE_HOLDS_LOCK; lockData: LockData }
  >;
}
