[@clickup/distributed-locker](../README.md) / [Exports](../modules.md) / DrainingSignal

# Class: DrainingSignal

Thrown when we want to finish the process soon, to abort the processing of
some long running job.

## Hierarchy

- `Error`

  ↳ **`DrainingSignal`**

## Constructors

### constructor

• **new DrainingSignal**(`name`, `reason`): [`DrainingSignal`](DrainingSignal.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `reason` | ``null`` \| `string` |

#### Returns

[`DrainingSignal`](DrainingSignal.md)

#### Overrides

Error.constructor

#### Defined in

[src/Heartbeater.ts:93](https://github.com/clickup/distributed-locker/blob/master/src/Heartbeater.ts#L93)
