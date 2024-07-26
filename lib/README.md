# React Proxy Context
This library is a solution for React that uses Javascript Proxies to allow React context consumers to listen to mutations as well as reassignments. Another benefit is that you can listen to the mutation of only specific properties. I find that many consider this style more intuitive to work with, though it is considered bad practice by others.

The functions are not exported as default, so you can import them in one of the following ways:
```
// ES6
import { functionName } from '@ptolemy2002/react-proxy-context';
// CommonJS
const { functionName } = require('@ptolemy2002/react-proxy-context');
```

## Functions
The following functions are available in the library:

### createProxyContext
#### Description
Creates a new instance of the ProxyContext, essentially to be used as the context type, with the specified default value and name. This is effectively just the normal React createContext function, but with a check to ensure that the browser supports Proxies.

#### Parameters
- `defaultValue` (Object): The default value of the context. This is what is reported when the context is not provided.
- `name` (String): The name of the context. This is used for debugging purposes.

#### Returns
Object - The ProxyContext object, which is a React context object.

## Components
The following components are available in the library:

### ProxyContextProvider
#### Description
A component that provides context of the specified class to its children using proxies. `useProxyContext` can only be used to access the context provided by this component.

#### Props
- `contextClass` (Object): The class of the context to provide. This is the class that was created using `createProxyContext`.
- `value` (Object): The value of the context. This is what is reported when the context is not provided.
- `onChange` (Function): A function that is called whenever the context is changed. The first parameter is the property that was changed (null if it was reassignment), the second parameter is the current value of the context, and the third parameter is the previous value of the context. This is useful for listening to changes in the provider's parent component.
- `proxyRef` (Object): A ref object that is assigned the proxy object of the context. This is useful for accessing the proxy object directly by the provider's parent component.

## Hooks
The following hooks are available in the library:

### useProxyContext
A hook that uses the context provided by the `ProxyContextProvider` component. This hook also provides options to choose which properties to listen to and whether to listen to full reassignments.

#### Parameters
- `contextClass` (Object): The class of the context to use. This is the class that was created using `createProxyContext`.
- `deps` (Array): An array of dependencies to listen to. If any of these properties on the context change, the hook will re-render. If this is falsy, any mutation will trigger a re-render. You can also specify a function that returns a boolean to determine whether to re-render (provided with the same arguments as `onChange` would be and a 4th argument that is the current value of the context).
- `listenReinit` (Boolean): Whether to listen to full reassignments of the context and re-render when they occur. Default is `true`.

#### Returns
Array - An array with the first element being the current value of the context and the second element being a setter function to reassign the context.

## Meta
This is a React Library Created by Ptolemy2002's [cra-template-react-library](https://www.npmjs.com/package/@ptolemy2002/cra-template-react-library) template in combination with [create-react-app](https://www.npmjs.com/package/create-react-app). It contains methods of building and publishing your library to npm.
For now, the library makes use of React 18 and does not use TypeScript.

## Peer Dependencies
These should be installed in order to use the library, as npm does not automatically add peer dependencies to your project.
- @types/react: ^18.3.3
- @types/react-dom: ^18.3.0
- react: ^18.3.1
- react-dom: ^18.3.1
- @types/is-callable: ^1.1.2
- is-callable: ^1.2.7
- nanoid: ^5.0.7
- @ptolemy2002/react-mount-effects: ^1.1.4
- @ptolemy2002/react-force-rerender: ^1.0.4
- @ptolemy2002/js-utils: ^1.0.3

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