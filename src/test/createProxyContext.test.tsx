import { describe, it, expect } from 'vitest'
import { createProxyContext } from 'lib/main'

describe('createProxyContext', () => {
  it('should create a context with the given name', () => {
    const context = createProxyContext<{ value: number }>('TestContext')
    
    expect(context.name).toBe('TestContext')
    expect(context).toBeDefined()
    expect(typeof context).toBe('object')
  })

  it('should create contexts with different names', () => {
    const context1 = createProxyContext<{ a: string }>('Context1')
    const context2 = createProxyContext<{ b: number }>('Context2')
    
    expect(context1.name).toBe('Context1')
    expect(context2.name).toBe('Context2')
    expect(context1).not.toBe(context2)
  })

  it('should throw error when Proxy is not supported', () => {
    const originalProxy = globalThis.Proxy
    delete (globalThis as any).Proxy

    expect(() => createProxyContext('TestContext')).toThrow('Proxy is not supported in this environment.')

    globalThis.Proxy = originalProxy
  })

  it('should create context with undefined default value', () => {
    const context = createProxyContext<{ test: boolean }>('TestContext')
    
    expect(context).toBeDefined()
    expect(context.name).toBe('TestContext')
  })
})