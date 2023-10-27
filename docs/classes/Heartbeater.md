[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Heartbeater

# Class: Heartbeater

## Constructors

### constructor

• **new Heartbeater**(`_name`, `_heartbeat?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_name` | `string` |
| `_heartbeat` | () => `void` \| `Promise`<`void`\> |

#### Defined in

[src/Heartbeater.ts:16](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L16)

## Properties

### constructor

• **constructor**: typeof [`Heartbeater`](Heartbeater.md)

#### Defined in

[src/Heartbeater.ts:14](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L14)

## Methods

### setDraining

▸ `Static` **setDraining**(`reason`): `void`

Marks the entire process as draining. Every heartbeat will throw
immediately in this mode.

#### Parameters

| Name | Type |
| :------ | :------ |
| `reason` | `string` |

#### Returns

`void`

#### Defined in

[src/Heartbeater.ts:25](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L25)

___

### withOnEvery

▸ **withOnEvery**(`ms`, `callback`): [`Heartbeater`](Heartbeater.md)

Adds a function which will be called every this number of milliseconds
approximately (not more often) during a heartbeat.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `number` |
| `callback` | () => `void` \| `Promise`<`void`\> |

#### Returns

[`Heartbeater`](Heartbeater.md)

#### Defined in

[src/Heartbeater.ts:33](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L33)

___

### heartbeat

▸ **heartbeat**(): `Promise`<`void`\>

Runs a heartbeat.

#### Returns

`Promise`<`void`\>

#### Defined in

[src/Heartbeater.ts:49](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L49)

___

### delay

▸ **delay**(`ms`): `Promise`<`void`\>

A helper function to sleep & heartbeat during the sleep.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[src/Heartbeater.ts:60](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L60)
