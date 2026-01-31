# React Proxy Context
This library is a solution for React that uses Javascript Proxies to allow React context consumers to listen to mutations as well as reassignments. Another benefit is that you can listen to the mutation of only specific properties. I find that many consider this style more intuitive to work with, though it is considered bad practice by others. A limitation is that it is only able to track direct mutations, not mutations that occur in nested arrays or objects, so those will still require recreation and reassignment.

The functions are not exported as default, so you can import them in one of the following ways:
```javascript
// ES6
import { functionName } from '@ptolemy2002/react-proxy-context';
// CommonJS
const { functionName } = require('@ptolemy2002/react-proxy-context');
```

## Type Reference
```typescript
type ContextWithName<T> = React.Context<T> & { name: string };

type OnChangePropCallback<T> =
    <K extends keyof T>(prop: K, current: T[K], prev?: T[K]) => void
;
type OnChangeReinitCallback<T> =
    (current: T, prev?: T, initial?: boolean) => void
;

type Dependency<_T, T=Exclude<_T, null | undefined>> = keyof T | (
    <K extends keyof T>(prop: K, current: T[K], prev: T[K], obj: T) => boolean
) | null | undefined | false | [keyof T, ...PropertyKey[]];

type ProxyContext<T> = ContextWithName<ProxyContextValueWrapper<T> | undefined>;

type ProxyContextChangeSubscriber<T> = {
    id: string;
    deps: Dependency<T>[] | null;
    propCallback: OnChangePropCallback<T>;
    reinitCallback: OnChangeReinitCallback<T>;
};

type ProxyContextProviderProps<T, InputT = T> = {
    children: ReactNode;
    value: InputT | ProxyContextValueWrapper<T>;
    onChangeProp?: OnChangePropCallback<T>;
    onChangeReinit?: OnChangeReinitCallback<T>;
    proxyRef?: React.MutableRefObject<T>;
};

type UseProxyContextResult<T> = HookResultData<{
    value: T;
    set: (newObj: T) => T;
}, readonly [T, (newObj: T) => T]>;

// ArrayWithOptional is internal
type ArrayWithOptional<AR extends unknown[], AO extends unknown[]> = AR | [...AR, ...AO];

type UseProxyContextArgs<T> = ArrayWithOptional<
    [
        ProxyContext<T>,
    ], ArrayWithOptional<
        [Dependency<T>[] | null],
        ArrayWithOptional<
            [OnChangePropCallback<T>], ArrayWithOptional<
                [OnChangeReinitCallback<T>], [boolean]
            >
        >
    >
>;
```

## Classes
The following classes are available in the library:

### ProxyContextValueWrapper<T>
#### Description
A class that wraps a value and provides proxy-based reactivity through subscription management. This class manages the proxy object internally and allows subscribers to listen to both property mutations and full object reassignments. The main benefit of this class is that it allows you to initialize a proxied value outside of a React context and pass it into the provider later, giving you more control over the proxy lifecycle.

#### Constructor
- `value` (`T`): The initial value to wrap in a proxy.

#### Methods
- `get()`: Returns the current proxied value.
  - Returns: `T`
- `set(newObj: T)`: Sets a new value and wraps it in a proxy. Emits reinit events to all subscribers.
  - Parameters:
    - `newObj` (`T`): The new value to set
  - Returns: `T` - The new proxied value
- `subscribe(propCallback, reinitCallback, deps)`: Subscribes to changes in the proxied object.
  - Parameters:
    - `propCallback` (`OnChangePropCallback<T>`): Called when a property changes
    - `reinitCallback` (`OnChangeReinitCallback<T>`): Called when the entire object is reassigned
    - `deps` (`Dependency<T>[] | null`): Array of dependencies to listen to, or null to listen to all changes
  - Returns: `string` - A unique subscription ID
- `unsubscribe(id: string)`: Unsubscribes from changes using the subscription ID.
- `emitChange(prop, current, prev?)`: Emits a property change event to all relevant subscribers (internal use).
- `emitReinit(current, prev?)`: Emits a reinitialization event to all subscribers (internal use).

#### Properties
- `changeSubscribers`: A record of all current subscribers (internal use).

## Functions
The following functions are available in the library:

### evaluateDependency<T>
#### Description
Given a dependency, if it is an array instance, converts it to the equivalent function that will test for equality of a nested property. If it is not an array instance, returns the dependency as is.

#### Parameters
- `dependency` (`Dependency<T>`): The dependency to evaluate.

#### Returns
`Dependency<T>` - The evaluated dependency. If the dependency is an array, it will be converted to a function that tests for equality of a nested property.

### createProxyContext<T>
#### Description
Creates a new instance of the ProxyContext, essentially to be used as the context type, with the specified name. This is effectively just the normal React `createContext` function, but with a check to ensure that the browser supports Proxies. `T` represents the type of the object that will be stored in the context.

#### Parameters
- `name` (String): The name of the context. This is used for debugging purposes.

#### Returns
`ProxyContext<T>` - The context object that can be used in a provider.

### createProxyContextProvider<T extends object | null, InputT = T>
#### Description
Creates a new proxy context provider component with the specified type. `ProxyContextProvider` is no longer used due to a TypeScript limitation that prevents the context type from being inferred.

#### Parameters
- `contextClass` (`ProxyContext<T>`): The context class that was created using `createProxyContext`.
- `transformInput` (`(input: InputT) => T`): A function that transforms the input value into the desired type `T`. This is useful when the input type differs from the context type, allowing for custom initialization logic. By default, this function simply casts the input to type `T`.

#### Returns
`React.MemoExoticComponent<FunctionComponent<ProxyContextProviderProps<T> & { renderDeps?: any[] }>>` - The provider component that can be used in the React tree. The resulting component is memoized to prevent unnecessary re-renders, but the `renderDeps` prop can be used to force a re-render when the specified dependencies change (necessary when working with the children prop).

The component has the following props:
- `value` (`T | ProxyContextValueWrapper<T>`): The value of the context. This can be either a raw value of type `T`, which will be automatically wrapped in a `ProxyContextValueWrapper`, or a pre-existing `ProxyContextValueWrapper<T>` instance. This allows you to initialize the wrapper outside of the context and pass it in, giving you more control over the proxy lifecycle.
- `onChangeProp` (`OnChangePropCallback<T>`): A function that is called whenever a property of the context is changed. The first parameter is the property that was changed, the second parameter is the current value of the property, and the third parameter is the previous value of the property. This is useful for listening to changes in the provider's parent component.
- `onChangeReinit` (`OnChangeReinitCallback<T>`): A function that is called whenever the context is reinitialized. The first parameter is the current value of the context, the second parameter is the previous value of the context, and the third parameter is a boolean indicating whether this is the first initialization. Also called on first initialization, with the previous value being `undefined` if you passed in a raw value instead of a `ProxyContextValueWrapper`. This is useful for listening to changes in the provider's parent component.
- `proxyRef` (`React.MutableRefObject<T>`): A ref object that is assigned the proxy object of the context. This is useful for accessing the proxy object directly by the provider's parent component.

### createOnChangeProp<T>
#### Description
A helper function that creates an `OnChangePropCallback` function. This should never be necessary, but there are some cases where TypeScript cannot infer the type of the callback arguments correctly, so wrapping with this would make sense.

#### Parameters
- `f` (`OnChangePropCallback<T>`): The function to wrap.

### createOnChangeReinit<T>
#### Description
A helper function that creates an `OnChangeReinitCallback` function. This should never be necessary, but there are some cases where TypeScript cannot infer the type of the callback arguments correctly, so wrapping with this would make sense.

#### Parameters
- `f` (`OnChangeReinitCallback<T>`): The function to wrap.

#### Returns
`OnChangeReinitCallback<T>` - The same function that was passed in.

## Hooks
The following hooks are available in the library:

### useProxyContext<T>
A hook that uses the context provided by the `ProxyContextProvider` component. This hook uses React 18's `useSyncExternalStore` for optimal concurrent rendering support and provides options to choose which properties to listen to and whether to listen to full reassignments. `T` represents the type of the object that is stored in the context.

#### Parameters
- `contextClass` (`ProxyContext<T>`): The context class that was created using `createProxyContext`.
- `deps` (`Dependency<T>[] | null`): An array of dependencies to listen to. If any of these properties on the context change, the hook will re-render. If this is falsy, any mutation will trigger a re-render. If a dependency is an array, it represents a nested property dependency. You can also specify a function that returns a boolean to determine whether to re-render. By default, this is an empty array.
- `onChangeProp` (`OnChangePropCallback<T> | undefined`): A function that is called whenever a property of the context is changed. The first parameter is the property that was changed, the second parameter is the current value of the property, and the third parameter is the previous value of the property. This is useful for listening to changes in the consumer component.
- `onChangeReinit` (`OnChangeReinitCallback<T> | undefined`): A function that is called whenever the context is reinitialized. The first parameter is the current value of the context, the second parameter is the previous value of the context, and the third parameter is a boolean indicating whether this is the first initialization.
- `listenReinit` (`boolean`): Whether to listen to full reassignments of the context. If this is true, the hook will re-render whenever the context is reinitialized. By default, this is true.

#### Returns
`UseProxyContextResult<T>` - An object containing the current value of the context and a function to set the context. The `value` property returns the unwrapped proxied object, and the `set` function returns the new value of the context wrapped in a `Proxy`. The hook subscribes to the `ProxyContextValueWrapper` and automatically manages subscription cleanup.

## Peer Dependencies
These should be installed in order to use the library, as npm does not automatically add peer dependencies to your project.
- `react^18.3.1`
- `react-dom^18.3.1`
- `@ptolemy2002/react-utils^3.0.0`
- `@ptolemy2002/react-force-rerender^2.0.0`
- `@ptolemy2002/react-hook-result^2.1.1`

## Commands
The following commands exist in the project:

- `npm run uninstall` - Uninstalls all dependencies for the library
- `npm run reinstall` - Uninstalls and then Reinstalls all dependencies for the library
- `npm run example-uninstall` - Uninstalls all dependencies for the example app
- `npm run example-install` - Installs all dependencies for the example app
- `npm run example-reinstall` - Uninstalls and then Reinstalls all dependencies for the example app
- `npm run example-start` - Starts the example app after building the library
- `npm run build` - Builds the library
- `npm run release` - Publishes the library to npm without changing the version
- `npm run release-patch` - Publishes the library to npm with a patch version bump
- `npm run release-minor` - Publishes the library to npm with a minor version bump
- `npm run release-major` - Publishes the library to npm with a major version bump