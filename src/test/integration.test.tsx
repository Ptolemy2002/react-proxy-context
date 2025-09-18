import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createProxyContext, createProxyContextProvider, useProxyContext } from 'lib/main'

type AppContextType = {
  count: number
  user: {
    name: string
    settings: {
      theme: 'light' | 'dark'
    }
  }
  todos: Array<{ id: number; text: string; completed: boolean }>
}

describe('Proxy Context Integration Tests', () => {
  it('should handle basic context setup and provider callbacks', () => {
    const AppContext = createProxyContext<AppContextType>('AppContext')
    const AppProvider = createProxyContextProvider(AppContext)
    const propChanges: any[] = []
    const reinitChanges: any[] = []
    
    const TestComponent = () => {
      const [context, setContext] = useProxyContext(AppContext)
      
      return (
        <div>
          <span>Count: {context.count}</span>
          <button onClick={() => setContext({ ...context, count: context.count + 1 })}>
            Increment via Set
          </button>
        </div>
      )
    }
    
    render(
      <AppProvider
        value={{
          count: 0,
          user: { name: 'John', settings: { theme: 'light' } },
          todos: []
        }}
        onChangeProp={(prop, current, prev) => {
          propChanges.push({ prop, current, prev })
        }}
        onChangeReinit={(current, prev) => {
          reinitChanges.push({ current, prev })
        }}
      >
        <TestComponent />
      </AppProvider>
    )
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    expect(reinitChanges.length).toBeGreaterThan(0) // Initial setup
    
    fireEvent.click(screen.getByText('Increment via Set'))
    // The setContext should trigger a re-render
    expect(reinitChanges.length).toBeGreaterThan(1) // After setContext
  })

  it('should handle context reinitialization across multiple consumers', () => {
    const TestContext = createProxyContext<{ value: number }>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const reinitCalls: any[] = []
    
    const Consumer1 = () => {
      const [context] = useProxyContext(
        TestContext,
        null,
        undefined,
        (current, prev) => {
          reinitCalls.push({ consumer: 1, current, prev })
        }
      )
      
      return <span>Value1: {context.value}</span>
    }
    
    const Consumer2 = () => {
      const [context] = useProxyContext(
        TestContext,
        null,
        undefined,
        (current, prev) => {
          reinitCalls.push({ consumer: 2, current, prev })
        }
      )
      
      return <span>Value2: {context.value}</span>
    }
    
    const Controller = () => {
      const [, setContext] = useProxyContext(TestContext)
      
      return (
        <button onClick={() => setContext({ value: 99 })}>
          Reinit Context
        </button>
      )
    }
    
    render(
      <TestProvider value={{ value: 42 }}>
        <Consumer1 />
        <Consumer2 />
        <Controller />
      </TestProvider>
    )
    
    expect(screen.getByText('Value1: 42')).toBeInTheDocument()
    expect(screen.getByText('Value2: 42')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Reinit Context'))
    
    // Context should be reinitialized, triggering callbacks
    expect(reinitCalls.length).toBeGreaterThan(0)
  })

  it('should handle selective dependency listening', () => {
    const TestContext = createProxyContext<{ a: number; b: number; c: number }>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    
    let aChanges = 0
    let bChanges = 0
    
    const ComponentA = () => {
      const [context] = useProxyContext(
        TestContext,
        ['a'],
        () => { aChanges++ }
      )
      
      return <span>A: {context.a}</span>
    }
    
    const ComponentB = () => {
      const [context] = useProxyContext(
        TestContext,
        ['b'],
        () => { bChanges++ }
      )
      
      return <span>B: {context.b}</span>
    }
    
    const Controller = () => {
      const [context] = useProxyContext(TestContext)
      
      return (
        <div>
          <button onClick={() => { context.a += 1 }}>Update A</button>
          <button onClick={() => { context.b += 1 }}>Update B</button>
          <button onClick={() => { context.c += 1 }}>Update C</button>
        </div>
      )
    }
    
    render(
      <TestProvider value={{ a: 1, b: 2, c: 3 }}>
        <ComponentA />
        <ComponentB />
        <Controller />
      </TestProvider>
    )
    
    expect(screen.getByText('A: 1')).toBeInTheDocument()
    expect(screen.getByText('B: 2')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Update A'))
    expect(aChanges).toBe(1)
    expect(bChanges).toBe(0)
    
    fireEvent.click(screen.getByText('Update B'))
    expect(aChanges).toBe(1)
    expect(bChanges).toBe(1)
    
    fireEvent.click(screen.getByText('Update C'))
    expect(aChanges).toBe(1)
    expect(bChanges).toBe(1)
  })

  it('should provide access through proxyRef', () => {
    const TestContext = createProxyContext<{ value: number }>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const proxyRef = { current: null as { value: number } | null }
    
    const TestComponent = () => {
      const [context] = useProxyContext(TestContext)
      return <span>Value: {context.value}</span>
    }
    
    render(
      <TestProvider value={{ value: 10 }} proxyRef={proxyRef}>
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('Value: 10')).toBeInTheDocument()
    expect(proxyRef.current).toEqual({ value: 10 })
  })

  it('should handle provider-level callbacks correctly', () => {
    const TestContext = createProxyContext<{ x: number; y: number }>('TestContext')
    const TestProvider = createProxyContextProvider(TestContext)
    const providerPropChanges: any[] = []
    const providerReinitChanges: any[] = []
    
    const TestComponent = () => {
      const [context, setContext] = useProxyContext(TestContext)
      
      return (
        <div>
          <span>X: {context.x}, Y: {context.y}</span>
          <button onClick={() => { context.x = 100 }}>Update X</button>
          <button onClick={() => setContext({ x: 0, y: 0 })}>Reset</button>
        </div>
      )
    }
    
    render(
      <TestProvider
        value={{ x: 5, y: 10 }}
        onChangeProp={(prop, current, prev) => {
          providerPropChanges.push({ prop, current, prev })
        }}
        onChangeReinit={(current, prev) => {
          providerReinitChanges.push({ current, prev })
        }}
      >
        <TestComponent />
      </TestProvider>
    )
    
    expect(screen.getByText('X: 5, Y: 10')).toBeInTheDocument()
    expect(providerReinitChanges.length).toBeGreaterThan(0)
    
    fireEvent.click(screen.getByText('Update X'))
    expect(providerPropChanges).toHaveLength(1)
    expect(providerPropChanges[0]).toEqual({ prop: 'x', current: 100, prev: 5 })
    
    fireEvent.click(screen.getByText('Reset'))
    expect(providerReinitChanges.length).toBeGreaterThan(1)
  })
})