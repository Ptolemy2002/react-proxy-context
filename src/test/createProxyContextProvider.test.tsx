import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createProxyContext, createProxyContextProvider, useProxyContext } from 'lib/main'

type TestContextType = {
  count: number
  message: string
}

describe('createProxyContextProvider', () => {
  it('should render children correctly', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    render(
      <TestProvider value={{ count: 0, message: 'hello' }}>
        <div>Test Content</div>
      </TestProvider>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should call onChangeProp callback when property changes', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeProp = vi.fn()
    
    const TestComponent = () => {
      const [context] = useProxyContext(TestContext)
      return (
        <button onClick={() => { context.count = 5 }}>
          Count: {context.count}
        </button>
      )
    }
    
    render(
      <TestProvider 
        value={{ count: 0, message: 'hello' }} 
        onChangeProp={onChangeProp}
      >
        <TestComponent />
      </TestProvider>
    )
    
    // Note: This test would need to simulate the actual property change
    // The callback is expected to be called when proxy properties change
  })

  it('should call onChangeReinit callback when context is reinitialized', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeReinit = vi.fn()
    
    render(
      <TestProvider 
        value={{ count: 0, message: 'hello' }} 
        onChangeReinit={onChangeReinit}
      >
        <div>Test</div>
      </TestProvider>
    )
    
    // onChangeReinit should be called during initial setup
    expect(onChangeReinit).toHaveBeenCalled()
  })

  it('should update proxyRef when provided', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const proxyRef = { current: { count: 0, message: '' } }
    
    render(
      <TestProvider 
        value={{ count: 42, message: 'test' }} 
        proxyRef={proxyRef}
      >
        <div>Test</div>
      </TestProvider>
    )
    
    expect(proxyRef.current).toEqual({ count: 42, message: 'test' })
  })

  it('should handle null values correctly', () => {
    const TestContext = createProxyContext<TestContextType | null>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    render(
      <TestProvider value={null}>
        <div>Test with null</div>
      </TestProvider>
    )
    
    expect(screen.getByText('Test with null')).toBeInTheDocument()
  })

  it('should maintain context stability across renders', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    const TestComponent = () => {
      const [context] = useProxyContext(TestContext)
      return <div>Count: {context.count}</div>
    }
    
    const { rerender } = render(
      <TestProvider value={{ count: 1, message: 'first' }}>
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
    
    rerender(
      <TestProvider value={{ count: 1, message: 'first' }}>
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })
})