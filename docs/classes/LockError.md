[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / LockError

# Class: LockError

## Hierarchy

- `Error`

  ↳ **`LockError`**

## Constructors

### constructor

• **new LockError**(`key`, `ownerHash`, `lockData`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `ownerHash` | `string` |
| `lockData` | ``null`` \| [`LockData`](../interfaces/LockData.md) |

#### Overrides

Error.constructor

#### Defined in

[src/LockError.ts:4](https://github.com/clickup/distributed-locker/blob/master/src/LockError.ts#L4)

## Properties

### key

• `Readonly` **key**: `string`

#### Defined in

[src/LockError.ts:5](https://github.com/clickup/distributed-locker/blob/master/src/LockError.ts#L5)

___

### ownerHash

• `Readonly` **ownerHash**: `string`

#### Defined in

[src/LockError.ts:6](https://github.com/clickup/distributed-locker/blob/master/src/LockError.ts#L6)

___

### lockData

• `Readonly` **lockData**: ``null`` \| [`LockData`](../interfaces/LockData.md)

#### Defined in

[src/LockError.ts:7](https://github.com/clickup/distributed-locker/blob/master/src/LockError.ts#L7)
