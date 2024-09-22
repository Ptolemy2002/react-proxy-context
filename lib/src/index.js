import React, { createContext, useContext, useRef, useCallback, useImperativeHandle } from "react";
import { nanoid } from "nanoid";
import isCallable from "is-callable";
import useForceRerender from "@ptolemy2002/react-force-rerender";
import { useMountEffect, useUnmountEffect } from "@ptolemy2002/react-mount-effects";
import { isNullOrUndefined } from "@ptolemy2002/js-utils";
import HookResult from "@ptolemy2002/react-hook-result";
import { partialMemo } from "@ptolemy2002/react-utils";

/*
    Proxies. Courtesy of StackOverflow:
    https://stackoverflow.com/a/7891968/7369908
*/

export function createProxyContext(defaultValue, name) {
    if (typeof Proxy == "undefined") throw new Error("Proxy is not supported in this environment.");

    const context = createContext(defaultValue);
    context.name = name;
    return context;
}

export const ProxyContextProvider = partialMemo(function ProxyContextProvider({contextClass, children, value, onChange, proxyRef}) {
    const changeSubscribers = useRef({});
    const objRef = useRef();
    const contextRef = useRef({});
    const forceRerender = useForceRerender();
    useImperativeHandle(proxyRef, () => objRef.current, [objRef.current]);

    const subscribe = useCallback((callback, deps, listenReinit=true) => {
        const id = nanoid();

        changeSubscribers.current[id] = {
            id,
            deps,
            callback,
            listenReinit
        };

        return id;
    }, []);

    const unsubscribe = useCallback((id) => {
        delete changeSubscribers.current[id];
    }, []);

    const set = useCallback((newObj) => {
        if (newObj !== objRef.current) {
            const prevObj = objRef.current;
            if (!isNullOrUndefined(newObj)) {
                // The proxy will allow us to notify subscribers when a property is changed.
                objRef.current = new Proxy(newObj, {
                    get: function(target, prop) {
                        const result = Reflect.get(target, prop, newObj);

                        if (isCallable(result)) {
                            return result.bind(objRef.current);
                        } else {
                            return result;
                        }
                    },
                    set: function(target, prop, value) {
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
                                subscriber.callback(prop, value, prevValue);
                            }
                        });
                        
                        if (isCallable(onChange)) onChange(prop, value, prevValue);
                        return true;
                    }
                });
            } else {
                objRef.current = newObj;
            }
            
            Object.values(changeSubscribers.current).forEach(subscriber => {
                if (subscriber.listenReinit) {
                    subscriber.callback(null, objRef.current, prevObj);
                }
            });

            if (isCallable(onChange)) onChange(null, objRef.current, prevObj);
            forceRerender();
        }

        return objRef.current;
    }, [onChange, proxyRef]);
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
}, ["onChange", "proxyRef"]);

export function useProxyContext(contextClass, deps, onChange, listenReinit=true) {
    const context = useContext(contextClass);
    const forceRerender = useForceRerender();
    const id = useRef(null);

    if (context === undefined) {
        throw new Error(`No ${contextClass.name} provider found.`);
    }
    
    useMountEffect(() => {
        id.current = context?.subscribe((prop, current, prev) => {
            forceRerender();
            if (isCallable(onChange)) onChange(prop, current, prev);
        }, deps, listenReinit);
        forceRerender();
    });

    useUnmountEffect(() => {
        context?.unsubscribe(id.current);
    });

    return new HookResult({value: context?.obj, set: context?.set}, ["value", "set"]);
}