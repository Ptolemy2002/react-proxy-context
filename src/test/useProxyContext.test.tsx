import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createProxyContext, createProxyContextProvider, useProxyContext } from 'lib/main'

interface TestContextType {
  count: number
  message: string
  nested: {
    value: string
  }
}

describe('useProxyContext', () => {
  it('should throw error when used outside provider', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    
    const TestComponent = () => {
      useProxyContext(TestContext)
      return <div>Test</div>
    }
    
    // Use console.error to capture errors during rendering
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => render(<TestComponent />)).toThrow('No TestContext provider found.')
    
    consoleSpy.mockRestore()
  })

  it('should return context value and setter function', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    const TestComponent = () => {
      const [context, setContext] = useProxyContext(TestContext)
      
      return (
        <div>
          <span>Count: {context.count}</span>
          <span>Message: {context.message}</span>
          <button onClick={() => setContext({ ...context, count: context.count + 1 })}>
            Increment
          </button>
        </div>
      )
    }
    
    render(
      <TestProvider value={{ count: 5, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('Count: 5')).toBeInTheDocument()
    expect(screen.getByText('Message: hello')).toBeInTheDocument()
  })

  it('should call onChangeProp callback when dependencies match', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeProp = vi.fn()
    
    const TestComponent = () => {
      const [context] = useProxyContext(TestContext, ['count'], onChangeProp)
      
      return (
        <div>
          <span>Count: {context.count}</span>
          <button onClick={() => { context.count = 10 }}>
            Update Count
          </button>
        </div>
      )
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    fireEvent.click(screen.getByText('Update Count'))
    
    expect(onChangeProp).toHaveBeenCalled()
  })

  it('should call onChangeReinit callback when context is reinitialized', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeReinit = vi.fn()
    
    const TestComponent = () => {
      const [context, setContext] = useProxyContext(TestContext, null, undefined, onChangeReinit)
      
      return (
        <button onClick={() => setContext({ count: 99, message: 'new', nested: { value: 'updated' } })}>
          Reinit
        </button>
      )
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    fireEvent.click(screen.getByText('Reinit'))
    
    expect(onChangeReinit).toHaveBeenCalled()
  })

  it('should handle nested property dependencies', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeProp = vi.fn()
    
    const TestComponent = () => {
      const [context] = useProxyContext(
        TestContext, 
        [['nested', 'value']], 
        onChangeProp
      )
      
      return (
        <div>
          <span>Nested: {context.nested.value}</span>
          <button onClick={() => { context.nested = { value: 'changed' } }}>
            Update Nested
          </button>
        </div>
      )
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'original' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('Nested: original')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Update Nested'))
    
    expect(onChangeProp).toHaveBeenCalled()
  })

  it('should support custom dependency functions', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeProp = vi.fn()
    const customDep = vi.fn(() => true)
    
    const TestComponent = () => {
      const [context] = useProxyContext(TestContext, [customDep], onChangeProp)
      
      return (
        <button onClick={() => { context.count = 42 }}>
          Update
        </button>
      )
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    fireEvent.click(screen.getByText('Update'))
    
    expect(customDep).toHaveBeenCalled()
    expect(onChangeProp).toHaveBeenCalled()
  })

  it('should handle listenReinit parameter correctly', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const onChangeReinit = vi.fn()
    
    const TestComponent = () => {
      const [, setContext] = useProxyContext(
        TestContext, 
        null, 
        undefined, 
        onChangeReinit, 
        false // listenReinit = false
      )
      
      return (
        <button onClick={() => setContext({ count: 99, message: 'new', nested: { value: 'updated' } })}>
          Reinit
        </button>
      )
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
    
    fireEvent.click(screen.getByText('Reinit'))
    
    // Should still call the callback but not trigger component re-render
    expect(onChangeReinit).toHaveBeenCalled()
  })

  it('should return HookResult that supports destructuring', () => {
    const TestContext = createProxyContext<TestContextType>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    const TestComponent = () => {
      const [context, setContext] = useProxyContext(TestContext)
      
      // Test that destructuring works correctly
      expect(context).toBeDefined()
      expect(typeof setContext).toBe('function')
      expect(context.count).toBe(0)
      expect(context.message).toBe('hello')
      
      return <div>Test</div>
    }
    
    render(
      <TestProvider value={{ count: 0, message: 'hello', nested: { value: 'test' } }}>
        <TestComponent />
      </TestProvider>
    )
  })
})