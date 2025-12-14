/* eslint-disable */
import { createContext, useContext, useRef, useCallback, useImperativeHandle, Context, ReactNode, useSyncExternalStore, useEffect } from "react";
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
    (current: T, prev?: T, initial?: boolean) => void
    ;

export function createProxyContext<T>(name: string): ProxyContext<T> {
    if (typeof Proxy == "undefined") throw new Error("Proxy is not supported in this environment.");

    const context = createContext<ProxyContextValueWrapper<T> | undefined>(
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

export type ProxyContext<T> = ContextWithName<ProxyContextValueWrapper<T> | undefined>;

export type ProxyContextProviderProps<T> = {
    children: ReactNode;
    value: T | ProxyContextValueWrapper<T>;
    onChangeProp?: OnChangePropCallback<T>;
    onChangeReinit?: OnChangeReinitCallback<T>;
    proxyRef?: React.MutableRefObject<T>;
};

export type ProxyContextChangeSubscriber<T> = {
    id: string;
    deps: Dependency<T>[] | null;
    propCallback: OnChangePropCallback<T>;
    reinitCallback: OnChangeReinitCallback<T>;
};

export class ProxyContextValueWrapper<T> {
    private value!: T;
    changeSubscribers: Record<string, ProxyContextChangeSubscriber<T>> = {};

    constructor(value: T) {
        this.set(value);
    }

    subscribe(
        propCallback: OnChangePropCallback<T>,
        reinitCallback: OnChangeReinitCallback<T>,
        deps: Dependency<T>[] | null
    ) {
        const id = nanoid();

        this.changeSubscribers[id] = {
            id,
            deps,
            propCallback,
            reinitCallback
        };

        return id;
    }

    unsubscribe(id: string) {
        delete this.changeSubscribers[id];
    }

    emitChange(prop: keyof T, current: T[keyof T], prev?: T[keyof T]) {
        Object.values(this.changeSubscribers).forEach(subscriber => {
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
                    subProp => isCallable(subProp) && subProp(prop, current as any, prev as any, this.value as Exclude<T, null | undefined>)
                )
            ) {
                subscriber.propCallback(prop, current, prev);
            }
        });
    }

    emitReinit(current: T, prev?: T, initial=false) {
        Object.values(this.changeSubscribers).forEach(subscriber => {
            subscriber.reinitCallback(current, prev, initial);
        });
    }

    get(): T {
        return this.value;
    }

    set(newObj: T): T {
        const self = this;
        if (newObj !== this.value) {
            const prevObj = this.value;

            if (newObj !== null && newObj !== undefined) {
                this.value = new Proxy(newObj, {
                    get: function (target, prop) {
                        const result = Reflect.get(target, prop, newObj);

                        if (isCallable(result)) {
                            return (result as Function).bind(self.value);
                        } else {
                            return result;
                        }
                    },

                    set: (target, _prop, value) => {
                        const prop = _prop as keyof object;

                        const prevValue = target[prop];

                        // Do this so that any setters in the object will be called before we make comparisons
                        // and notify subscribers.
                        Reflect.set(target, prop, value, newObj);
                        value = target[prop];

                        this.emitChange(prop as keyof T, value, prevValue);
                        return true;
                    }
                });
            } else {
                this.value = newObj;
            }

            this.emitReinit(this.value!, prevObj);
        }

        return this.value;
    }
}

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
        // The undefined value will be changed before the first render.
        const wrapperRef = useRef<ProxyContextValueWrapper<T> | undefined>(undefined);
        if (wrapperRef.current === undefined) {
            wrapperRef.current = value instanceof ProxyContextValueWrapper ? value : new ProxyContextValueWrapper<T>(value);
            onChangeReinit?.(wrapperRef.current.get(), value instanceof ProxyContextValueWrapper ? value.get() : undefined, true);
        }

        const forceRerender = useForceRerender();
        useImperativeHandle(proxyRef, () => wrapperRef.current!.get(), [wrapperRef.current!.get()]);
        useEffect(() => {
            const id = wrapperRef.current!.subscribe(
                onChangeProp ?? (() => {}),
                (...args) => {
                    if (isCallable(onChangeReinit)) onChangeReinit(...args);
                    forceRerender();
                },
                null
            );

            return () => {
                wrapperRef.current!.unsubscribe(id);
            };
        }, [onChangeProp, onChangeReinit, forceRerender]);

        return (
            <contextClass.Provider value={wrapperRef.current}>
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
        // The binding is necessary to fix a strange issue I'm having.
        { value: context.value.get(), set: context.value.set.bind(context.value) }, ["value", "set"]
    ) as UseProxyContextResult<T>;
}