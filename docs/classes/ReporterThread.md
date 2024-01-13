[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / ReporterThread

# Class: ReporterThread

## Constructors

### constructor

• **new ReporterThread**(`_options`): [`ReporterThread`](ReporterThread.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | [`ReporterThreadOptions`](../interfaces/ReporterThreadOptions.md) |

#### Returns

[`ReporterThread`](ReporterThread.md)

#### Defined in

[src/ReporterThread.ts:16](https://github.com/clickup/distributed-locker/blob/master/src/ReporterThread.ts#L16)

## Properties

### errors

• `Readonly` **errors**: [`Events`](Events.md)\<`unknown`\>

#### Defined in

[src/ReporterThread.ts:14](https://github.com/clickup/distributed-locker/blob/master/src/ReporterThread.ts#L14)

## Methods

### loop

▸ **loop**(`onWrite`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onWrite` | (`processData`: [`ProcessData`](../interfaces/ProcessData.md)) => `void` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ReporterThread.ts:18](https://github.com/clickup/distributed-locker/blob/master/src/ReporterThread.ts#L18)
