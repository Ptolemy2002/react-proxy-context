import { createContext, useContext, useRef, useCallback, useImperativeHandle, Context, ReactNode } from "react";
import { nanoid } from "nanoid";
import isCallable from "is-callable";
import useForceRerender from "@ptolemy2002/react-force-rerender";
import { useMountEffect, useUnmountEffect } from "@ptolemy2002/react-mount-effects";
import { isNullOrUndefined } from "@ptolemy2002/js-utils";
import HookResult, {HookResultData} from "@ptolemy2002/react-hook-result";
import { partialMemo } from "@ptolemy2002/react-utils";

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
        deps: Dependency<T>[]
    ) => string;
    unsubscribe: (id: string) => void;
};

export function createProxyContext<T>(name: string): ContextWithName<ProxyContextValue<T> | undefined> {
    if (typeof Proxy == "undefined") throw new Error("Proxy is not supported in this environment.");

    const context = createContext<ProxyContextValue<T> | undefined>(
        undefined
    ) as ContextWithName<ProxyContextValue<T> | undefined>;

    context.name = name;
    return context;
}

export type Dependency<T> = keyof T | (
    <K extends keyof T>(prop: K, current: T[K], prev: T[K], obj: T) => boolean
) | null | undefined | false;

export type ProxyContextProviderProps<T> = {
    children: ReactNode;
    value: T;
    onChangeProp?: OnChangePropCallback<T>;
    onChangeReinit?: OnChangeReinitCallback<T>;
    proxyRef?: React.MutableRefObject<T>;
};

export function createProxyContextProvider<T extends object>(
    contextClass: ContextWithName<ProxyContextValue<T> | undefined>
) {
    return partialMemo(function ProxyContextProvider({
        children,
        value,
        onChangeProp,
        onChangeReinit,
        proxyRef
    }: ProxyContextProviderProps<T>) {
        const changeSubscribers = useRef<
            {
                [key: string]: {
                    id: string;
                    deps: Dependency<T>[];
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
            deps: Dependency<T>[]
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

        const set = useCallback((newObj: T) => {
            if (newObj !== objRef.current) {
                const prevObj = objRef.current;
                if (!isNullOrUndefined(newObj)) {
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
                            const prop = _prop as keyof T;
                            const prevValue = target[prop];
                            // Do this so that any setters in the object will be called before we make comparisons
                            // and notify subscribers.
                            Reflect.set(target, prop, value, newObj);
                            value = target[prop];

                            Object.values(changeSubscribers.current).forEach(subscriber => {
                                if (
                                    !subscriber.deps
                                    ||
                                    (
                                        subscriber.deps.includes(prop)
                                        &&
                                        prevValue !== value
                                    )
                                    ||
                                    subscriber.deps.some(subProp => isCallable(subProp) && subProp(prop, value, prevValue, newObj))
                                ) {
                                    subscriber.propCallback(prop, value, prevValue);
                                }
                            });

                            if (isCallable(onChangeProp)) onChangeProp(prop, value, prevValue);
                            return true;
                        }
                    });
                } else {
                    objRef.current = newObj;
                }

                Object.values(changeSubscribers.current).forEach(subscriber => {
                    subscriber.reinitCallback(objRef.current!, prevObj);
                });

                if (isCallable(onChangeReinit)) onChangeReinit(objRef.current!, prevObj);
                forceRerender();
            }

            contextRef.current.obj = objRef.current;
            return objRef.current;
        }, [onChangeProp, onChangeReinit]);
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
    }, ["children", "onChangeProp", "onChangeReinit", "proxyRef"], `${contextClass.name}Provider (Memo)`);
}

export type UseProxyContextResult<T> = HookResultData<{
    value: T;
    set: (newObj: T) => T;
}, readonly [T, (newObj: T) => T]>;

export function useProxyContext<T>(
    contextClass: ContextWithName<ProxyContextValue<T> | undefined>,
    deps: Dependency<T>[] = [],
    onChangeProp?: OnChangePropCallback<T>,
    onChangeReinit?: OnChangeReinitCallback<T>,
    listenReinit = true
): UseProxyContextResult<T> {
    const context = useContext(contextClass);
    const forceRerender = useForceRerender();
    const id = useRef<string | null>(null);

    if (context === undefined) {
        throw new Error(`No ${contextClass.name} provider found.`);
    }

    useMountEffect(() => {
        id.current = context?.subscribe(
            (prop, current, prev?) => {
                forceRerender();
                if (isCallable(onChangeProp)) onChangeProp(prop, current, prev);
            },
            (current, prev?) => {
                if (listenReinit) forceRerender();
                if (isCallable(onChangeReinit)) onChangeReinit(current, prev);
            },
            deps);
    });

    useUnmountEffect(() => {
        context.unsubscribe(id.current!);
    });

    return new HookResult(
        { value: context.obj, set: context.set }, ["value", "set"]
    ) as UseProxyContextResult<T>;
}