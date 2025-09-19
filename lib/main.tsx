/* eslint-disable */
import { createContext, useContext, useRef, useCallback, useImperativeHandle, Context, ReactNode, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import isCallable from "is-callable";
import useForceRerender from "@ptolemy2002/react-force-rerender";
import HookResult, {HookResultData} from "@ptolemy2002/react-hook-result";
import { partialMemo } from "@ptolemy2002/react-utils";
import { _ } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";

/*
    Proxies. Courtesy of StackOverflow:
    https://stackoverflow.com/a/7891968/7369908
*/

export type ContextWithName<T> = Context<T> & { name: string };

export type OnChangePropCallback<T> =
    <K extends keyof T>(prop: K, current: T[K], prev?: T[K]) => void
    ;
export type OnChangeReinitCallback<T> =
    (current: T, prev?: T) => void
    ;

export type ProxyContextValue<T> = {
    obj: T;
    set: (newObj: T) => T;
    subscribe: (
        propCallback: OnChangePropCallback<T>,
        reinitCallback: OnChangeReinitCallback<T>,
        deps: Dependency<T>[] | null
    ) => string;
    unsubscribe: (id: string) => void;
};

export function createProxyContext<T>(name: string): ProxyContext<T> {
    if (typeof Proxy == "undefined") throw new Error("Proxy is not supported in this environment.");

    const context = createContext<ProxyContextValue<T> | undefined>(
        undefined
    ) as ProxyContext<T>;

    context.name = name;
    return context;
}

export type Dependency<_T, T=Exclude<_T, null | undefined>> = keyof T | (
    <K extends keyof T>(prop: K, current: T[K], prev: T[K], obj: T) => boolean
) | null | undefined | false | [keyof T, ...PropertyKey[]];

export function evaluateDependency<T>(
    dep: Dependency<T>
): Exclude<Dependency<T>, any[]> {
    if (Array.isArray(dep)) {
        const [first, ...rest] = dep;

        // Evaluate a comparison of the given nested property.
        return (prop, current, prev) => {
            if (prop !== first) return false;

            let currentComparisonObj: any = current;
            let prevComparisonObj: any = prev;
            for (const key of rest) {
                currentComparisonObj = currentComparisonObj?.[key];
                prevComparisonObj = prevComparisonObj?.[key];
            }
            
            return currentComparisonObj !== prevComparisonObj;
        };
    }

    return dep as Exclude<Dependency<T>, any[]>;
}

export type ProxyContext<T> = ContextWithName<ProxyContextValue<T> | undefined>;

export type ProxyContextProviderProps<T> = {
    children: ReactNode;
    value: T;
    onChangeProp?: OnChangePropCallback<T>;
    onChangeReinit?: OnChangeReinitCallback<T>;
    proxyRef?: React.MutableRefObject<T>;
};

export function createProxyContextProvider<T extends object | null>(
    contextClass: ProxyContext<T>
) {
    return partialMemo(({
        children,
        value,
        onChangeProp,
        onChangeReinit,
        proxyRef
    }: ProxyContextProviderProps<T>) => {
        const changeSubscribers = useRef<
            {
                [key: string]: {
                    id: string;
                    deps: Dependency<T>[] | null;
                    propCallback: OnChangePropCallback<T>;
                    reinitCallback: OnChangeReinitCallback<T>;
                };
            }
        >({});

        // The undefined value will be changed before the first render.
        const objRef = useRef<T>();
        const contextRef = useRef<ProxyContextValue<T>>({} as ProxyContextValue<T>);
        const forceRerender = useForceRerender();
        useImperativeHandle(proxyRef, () => objRef.current!, [objRef.current]);

        const subscribe = useCallback((
            propCallback: OnChangePropCallback<T>,
            reinitCallback: OnChangeReinitCallback<T>,
            deps: Dependency<T>[] | null
        ) => {
            const id = nanoid();

            changeSubscribers.current[id] = {
                id,
                deps,
                propCallback,
                reinitCallback
            };

            return id;
        }, []);

        const unsubscribe = useCallback((id: string) => {
            delete changeSubscribers.current[id];
        }, []);

        const emitChange = useCallback((prop: keyof T, current: T[keyof T], prev?: T[keyof T]) => {
            Object.values(changeSubscribers.current).forEach(subscriber => {
                const evaluatedDeps = subscriber.deps?.map(evaluateDependency);
                if (
                    !evaluatedDeps
                    ||
                    (
                        evaluatedDeps.includes(prop as any)
                        &&
                        prev !== current
                    )
                    ||
                    evaluatedDeps.some(
                        subProp => isCallable(subProp) && subProp(prop, current as any, prev as any, objRef.current as Exclude<T, null | undefined>)
                    )
                ) {
                    subscriber.propCallback(prop, current, prev);
                }
            });

            if (isCallable(onChangeProp)) onChangeProp(prop, current, prev);
        }, [onChangeProp]);

        const emitReinit = useCallback((current: T, prev?: T) => {
            Object.values(changeSubscribers.current).forEach(subscriber => {
                subscriber.reinitCallback(current, prev);
            });

            if (isCallable(onChangeReinit)) onChangeReinit(current, prev);
        }, [onChangeReinit]);

        const set = useCallback((newObj: T) => {
            if (newObj !== objRef.current) {
                const prevObj = objRef.current;
                if (newObj !== null) {
                    // The proxy will allow us to notify subscribers when a property is changed.
                    objRef.current = new Proxy(newObj, {
                        get: function (target, prop) {
                            const result = Reflect.get(target, prop, newObj);

                            if (isCallable(result)) {
                                return (result as Function).bind(objRef.current);
                            } else {
                                return result;
                            }
                        },

                        set: function (target, _prop, value) {
                            const prop = _prop as keyof object;

                            const prevValue = target[prop];
                            // Do this so that any setters in the object will be called before we make comparisons
                            // and notify subscribers.
                            Reflect.set(target, prop, value, newObj);
                            value = target[prop];

                            emitChange(prop as keyof T, value, prevValue);
                            return true;
                        }
                    });
                } else {
                    objRef.current = newObj;
                }

                emitReinit(objRef.current!, prevObj);
                forceRerender();
            }

            contextRef.current.obj = objRef.current;
            return objRef.current;
        }, [onChangeProp, onChangeReinit, emitChange]);
        if (objRef.current === undefined) objRef.current = set(value);

        // Mutate the contextRef object instead of using literals so the children don't rerender every time this element does.
        contextRef.current.obj = objRef.current;
        contextRef.current.set = set;
        contextRef.current.subscribe = subscribe;
        contextRef.current.unsubscribe = unsubscribe;

        return (
            <contextClass.Provider value={contextRef.current}>
                {children}
            </contextClass.Provider>
        );
    },
        ["children", "onChangeProp", "onChangeReinit", "proxyRef"],
        contextClass.name + ".Provider"
    );
}

export type UseProxyContextResult<T> = HookResultData<{
    value: T;
    set: (newObj: T) => T;
}, readonly [T, (newObj: T) => T]>;

export function useProxyContext<T>(
    contextClass: ProxyContext<T>,
    deps: Dependency<T>[] | null = [],
    onChangeProp?: OnChangePropCallback<T>,
    onChangeReinit?: OnChangeReinitCallback<T>,
    listenReinit = true
): UseProxyContextResult<T> {
    const _context = useContext(contextClass);

    if (_context === undefined) {
        throw new Error(`No ${contextClass.name} provider found.`);
    }

    const contextRef = useRef<{ value: typeof _context }>({ value: _context });

    // Put in a ref to ensure we don't resubscribe on every render.
    const subscribeRef = useCallback((cb: () => void) => {
        const id = _context.subscribe(
            (prop, current, prev?) => {
                contextRef.current = { value: _context };
                cb();
                if (isCallable(onChangeProp)) onChangeProp(prop, current, prev);
            },

            (current, prev?) => {
                if (listenReinit) {
                    contextRef.current = { value: _context };
                    cb();
                }
                if (isCallable(onChangeReinit)) onChangeReinit(current, prev);
            },

            deps
        );

        return () => _context.unsubscribe(id);
    }, [deps, listenReinit, onChangeProp, onChangeReinit, _context]);

    const context = useSyncExternalStore(
        subscribeRef,
        () => contextRef.current,
        () => contextRef.current
    );

    return new HookResult(
        { value: context.value.obj, set: context.value.set }, ["value", "set"]
    ) as UseProxyContextResult<T>;
}