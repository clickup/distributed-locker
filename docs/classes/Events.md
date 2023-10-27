[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / Events

# Class: Events<TArg\>

## Type parameters

| Name |
| :------ |
| `TArg` |

## Constructors

### constructor

• **new Events**<`TArg`\>()

#### Type parameters

| Name |
| :------ |
| `TArg` |

## Methods

### subscribe

▸ **subscribe**(`callback`): () => `void`

Adds an error subscriber which is called when an error is happened in the
background. Returns a function to unsubscribe.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`args`: `TArg`) => `void` |

#### Returns

`fn`

▸ (): `void`

Adds an error subscriber which is called when an error is happened in the
background. Returns a function to unsubscribe.

##### Returns

`void`

#### Defined in

[src/Events.ts:8](https://github.com/clickup/distributed-locker/blob/master/src/Events.ts#L8)

___

### emit

▸ **emit**(`arg`): `void`

Emits an error to all the subscribed callbacks.

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg` | `TArg` |

#### Returns

`void`

#### Defined in

[src/Events.ts:16](https://github.com/clickup/distributed-locker/blob/master/src/Events.ts#L16)
