import { createProxyContext, ProxyContextProvider, useProxyContext } from "@ptolemy2002/react-proxy-context";
import { useState } from "react";

const AppContext = createProxyContext(undefined, "AppContext");

function App() {
    const [consumerKey, setConsumerKey] = useState("abc1");

    function setConsumerKeyElement(char, on) {
        if (on && !consumerKey.includes(char)) {
            setConsumerKey(consumerKey + char);
        } else if (!on && consumerKey.includes(char)) {
            setConsumerKey(consumerKey.replace(char, ""));
        }
    }

    return (
        <div className="App p-3">
            <ProxyContextProvider
                contextClass={AppContext}
                value={{
                    a: 1,
                    b: 2,
                    c: 3
                }}

                onChange={(prop, curr, prev) => {
                    console.log("App onChange:", prop, curr, prev);
                }}
            >
                {/* When the key changes, react will forcefully remount the component. This is necessart to reinitialize the useProxyContext hook. */}
                <Consumer key={consumerKey} consumerKey={consumerKey} />
                <ContextController />

                <div>
                    <label>Listen to a:</label>
                    <input type="checkbox" checked={consumerKey.includes("a")} onChange={(e) => setConsumerKeyElement("a", e.target.checked)} />
                    <br />

                    <label>Listen to b:</label>
                    <input type="checkbox" checked={consumerKey.includes("b")} onChange={(e) => setConsumerKeyElement("b", e.target.checked)} />
                    <br />

                    <label>Listen to c:</label>
                    <input type="checkbox" checked={consumerKey.includes("c")} onChange={(e) => setConsumerKeyElement("c", e.target.checked)} />
                    <br />

                    <label>Listen with reinit:</label>
                    <input type="checkbox" checked={consumerKey.includes("1")} onChange={(e) => setConsumerKeyElement("1", e.target.checked)} />
                </div>

                <p>
                    Look into the console to see exactly when the onChange events are triggered and the arguments they receive.
                </p>
            </ProxyContextProvider>
        </div>
    );
}

function Consumer({consumerKey}) {
    const [{a, b, c}] = useProxyContext(AppContext, 
        [consumerKey.includes("a") && "a", consumerKey.includes("b") && "b", consumerKey.includes("c") && "c"],
        (prop, curr, prev) => {
            console.log("Consumer onChange:", prop, curr, prev);
        },
        consumerKey.includes("1")
    );
    console.log("Consumer render");

    if (consumerKey === "") return <p>Not listening to AppContext</p>;
    return (
        <p>
            Listening to AppContext{consumerKey.includes("1") && " with reinit"} <br />
            {consumerKey.includes("a") && <>a={a}<br /></>}
            {consumerKey.includes("b") && <>b={b}<br /></>}
            {consumerKey.includes("c") && <>c={c}<br /></>}
        </p>
    );
}

function ContextController() {
    const [context, setContext] = useProxyContext(AppContext);

    return (
        <div>
            <button onClick={() => setContext({...context})}>Reinit</button> <br /> <br />
            <button onClick={() => context.a += 1}>Increment a</button>
            <button onClick={() => context.a -= 1}>Decrement a</button> <br /> <br />
            <button onClick={() => context.b += 1}>Increment b</button>
            <button onClick={() => context.b -= 1}>Decrement b</button> <br /> <br />
            <button onClick={() => context.c += 1}>Increment c</button>
            <button onClick={() => context.c -= 1}>Decrement c</button>
        </div>
    );
}

export default App;
