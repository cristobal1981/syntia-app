import { describe, expect, it } from 'vitest'

import { isMissingRpcError } from '@/src/modules/directory/infrastructure/is-missing-rpc-error'

describe('isMissingRpcError', () => {
  it.each([
    [{ code: 'PGRST202', message: 'x' }],
    [{ code: '42883', message: 'function does not exist' }],
    [{ message: 'Could not find the function public.foo(a) in the schema cache' }],
    [{ code: null, message: 'could not find the function' }],
  ])('%j → la función no existe', (error) => {
    expect(isMissingRpcError(error)).toBe(true)
  })

  it.each([
    [null],
    [undefined],
    [{ code: '23505', message: 'duplicate key' }],
    [{ code: '42501', message: 'permission denied for function' }],
    [{ code: '22P02', message: 'invalid input syntax for type uuid' }],
    [{ message: 'timeout' }],
    [{}],
  ])('%j → no es «falta la función» y debe propagarse', (error) => {
    expect(isMissingRpcError(error as never)).toBe(false)
  })
})
