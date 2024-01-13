[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Reporter

# Class: Reporter

The idea: spawn a background thread which is guaranteed to not have any event
loop blocking ever, and from this thread, write/extend the per-process key
frequently enough to report that the process is still alive. When we try to
acquire a particular lock, we also recheck that the corresponding process is
alive; if not, we treat the lock as available. Thus, a process restart
results into a pretty quick locks re-acquisition by other processes.

## Constructors

### constructor

• **new Reporter**(`_options`): [`Reporter`](Reporter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | [`ReporterOptions`](../interfaces/ReporterOptions.md) |

#### Returns

[`Reporter`](Reporter.md)

#### Defined in

[src/Reporter.ts:39](https://github.com/clickup/distributed-locker/blob/master/src/Reporter.ts#L39)

## Properties

### errors

• `Readonly` **errors**: [`Events`](Events.md)\<`string`\>

Allows to subscribe to recoverable errors happened in this Reporter.

#### Defined in

[src/Reporter.ts:37](https://github.com/clickup/distributed-locker/blob/master/src/Reporter.ts#L37)

## Methods

### processHash

▸ **processHash**(): `string`

Returns process hash of this Reporter.

#### Returns

`string`

#### Defined in

[src/Reporter.ts:44](https://github.com/clickup/distributed-locker/blob/master/src/Reporter.ts#L44)

___

### ensureRunning

▸ **ensureRunning**(): `Promise`\<`void`\>

Makes sure the reporter background thread is started. Resolves as soon as
it successfully writes aliveness data to the database. Since the thread
remains running infinitely and runs retries forever, the returned promise
doesn't have a timeout to resolve.

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/Reporter.ts:54](https://github.com/clickup/distributed-locker/blob/master/src/Reporter.ts#L54)

___

### terminate

▸ **terminate**(): `Promise`\<`void`\>

Terminates the reporter background thread.

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/Reporter.ts:90](https://github.com/clickup/distributed-locker/blob/master/src/Reporter.ts#L90)
