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
    (current: T, prev?: T) => void
;

type Dependency<T> = keyof T | (
    <K extends keyof T>(prop: K, current: T[K], prev: T[K], obj: T) => boolean
) | null | undefined | false;

type ProxyContextValue<T> = {
    obj: T;
    set: (newObj: T) => T;
    subscribe: (
        propCallback: OnChangePropCallback<T>,
        reinitCallback: OnChangeReinitCallback<T>,
        deps: Dependency<T>[]
    ) => string;
    unsubscribe: (id: string) => void;
};

type ProxyContextProviderProps<T> = {
    children: ReactNode;
    value: T;
    onChangeProp?: OnChangePropCallback<T>;
    onChangeReinit?: OnChangeReinitCallback<T>;
    proxyRef?: React.MutableRefObject<T>;
};

type UseProxyContextResult<T> = HookResultData<{
    value: T;
    set: (newObj: T) => T;
}, readonly [T, (newObj: T) => T]>;
```

## Functions
The following functions are available in the library:

### createProxyContext<T>
#### Description
Creates a new instance of the ProxyContext, essentially to be used as the context type, with the specified name. This is effectively just the normal React createContext function, but with a check to ensure that the browser supports Proxies. `T` represents the type of the object that will be stored in the context.

#### Parameters
- `name` (String): The name of the context. This is used for debugging purposes.

#### Returns
`ContextWithName<ProxyContextValue<T> | undefined>` - The context object that can be used in a provider.

### createProxyContextProvider<T extends object>
#### Description
Creates a new proxy context provider component with the specified type. `ProxyContextProvider` is no longer used due to a TypeScript limitation that prevents the context type from being inferred.

#### Parameters
- `contextClass` (`ContextWithName<ProxyContextValue<T> | undefined>`): The context class that was created using `createProxyContext`.

#### Returns
`React.MemoExoticComponent<FunctionComponent<ProxyContextProviderProps<T> & { renderDeps?: any[] }>>` - The provider component that can be used in the React tree. The resulting component is memoized to prevent unnecessary re-renders, but the `renderDeps` prop can be used to force a re-render when the specified dependencies change (necessary when working with the children prop).

The component has the following other props:
- `value` (T): The value of the context. This is what is reported when the context is not provided.
- `onChangeProp` (`OnChangePropCallback<T>`): A function that is called whenever a property of the context is changed. The first parameter is the property that was changed, the second parameter is the current value of the property, and the third parameter is the previous value of the property. This is useful for listening to changes in the provider's parent component.
- `onChangeReinit` (`OnChangeReinitCallback<T>`): A function that is called whenever the context is reinitialized. The first parameter is the current value of the context, and the second parameter is the previous value of the context. This is useful for listening to changes in the provider's parent component.
- `proxyRef` (`React.MutableRefObject<T>`): A ref object that is assigned the proxy object of the context. This is useful for accessing the proxy object directly by the provider's parent component.

## Hooks
The following hooks are available in the library:

### useProxyContext<T>
A hook that uses the context provided by the `ProxyContextProvider` component. This hook also provides options to choose which properties to listen to and whether to listen to full reassignments. `T` represents the type of the object that is stored in the context.

#### Parameters
- `contextClass` (`ContextWithName<ProxyContextValue<T> | undefined>`): The context class that was created using `createProxyContext`.
- `deps` (`Dependency<T>[] | null`): An array of dependencies to listen to. If any of these properties on the context change, the hook will re-render. If this is falsy, any mutation will trigger a re-render. You can also specify a function that returns a boolean to determine whether to re-render. If this is null, the hook will re-render on any mutation. By default, this is an empty array.
- `onChangeProp` (`OnChangePropCallback<T> | undefined`): A function that is called whenever a property of the context is changed. The first parameter is the property that was changed, the second parameter is the current value of the property, and the third parameter is the previous value of the property. This is useful for listening to changes in the provider's parent component.
- `onChangeReinit` (`OnChangeReinitCallback<T> | undefined`): A function that is called whenever the context is reinitialized. The first parameter is the current value of the context, and the second parameter is the previous value of the context. This is useful for listening to changes in the provider's parent component.
- `listenReinit` (`boolean`): Whether to listen to full reassignments of the context. If this is true, the hook will re-render whenever the context is reinitialized. By default, this is true.

#### Returns
`UseProxyContextResult<T>` - An object containing the current value of the context and a function to set the context. The function returns the new value of the context wrapped in a `Proxy`.

## Peer Dependencies
These should be installed in order to use the library, as npm does not automatically add peer dependencies to your project.
- `react^18.3.1`
- `react-dom^18.3.1`
- `@ptolemy2002/js-utils^3.0.2`
- `@ptolemy2002/react-utils^3.0.0`
- `@ptolemy2002/react-force-rerender^2.0.0`
- `@ptolemy2002/react-hook-result^2.1.1`
- `@ptolemy2002/react-mount-effects^2.0.0`

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