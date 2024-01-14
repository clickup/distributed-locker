[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / NoopHeartbeater

# Class: NoopHeartbeater

A heartbeater instance for short-running processes.

## Hierarchy

- [`Heartbeater`](Heartbeater.md)

  ↳ **`NoopHeartbeater`**

## Constructors

### constructor

• **new NoopHeartbeater**(): [`NoopHeartbeater`](NoopHeartbeater.md)

#### Returns

[`NoopHeartbeater`](NoopHeartbeater.md)

#### Overrides

[Heartbeater](Heartbeater.md).[constructor](Heartbeater.md#constructor-1)

#### Defined in

[src/Heartbeater.ts:83](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L83)

## Properties

### constructor

• **constructor**: typeof [`Heartbeater`](Heartbeater.md)

#### Inherited from

Heartbeater.constructor

#### Defined in

[src/Heartbeater.ts:14](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L14)

## Methods

### setDraining

▸ **setDraining**(`reason`): `void`

Marks the entire process as draining. Every heartbeat will throw
immediately in this mode.

#### Parameters

| Name | Type |
| :------ | :------ |
| `reason` | `string` |

#### Returns

`void`

#### Inherited from

[Heartbeater](Heartbeater.md).[setDraining](Heartbeater.md#setdraining)

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
| `callback` | () => `void` \| `Promise`\<`void`\> |

#### Returns

[`Heartbeater`](Heartbeater.md)

#### Inherited from

[Heartbeater](Heartbeater.md).[withOnEvery](Heartbeater.md#withonevery)

#### Defined in

[src/Heartbeater.ts:33](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L33)

___

### heartbeat

▸ **heartbeat**(): `Promise`\<`void`\>

Runs a heartbeat.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[Heartbeater](Heartbeater.md).[heartbeat](Heartbeater.md#heartbeat)

#### Defined in

[src/Heartbeater.ts:49](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L49)

___

### delay

▸ **delay**(`ms`): `Promise`\<`void`\>

A helper function to sleep & heartbeat during the sleep.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `number` |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[Heartbeater](Heartbeater.md).[delay](Heartbeater.md#delay)

#### Defined in

[src/Heartbeater.ts:60](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L60)
