import { createProxyContext, createProxyContextProvider, useProxyContext, createOnChangeReinit } from "@ptolemy2002/react-proxy-context";
import { useState, useRef } from "react";

type AppContextType = {
    a: number;
    b: number;
    c: number;
    arr: number[];
};
const AppContext = createProxyContext<AppContextType>("AppContext");
const AppContextProvider = createProxyContextProvider(AppContext);

type ConsumerKeyChar = "a" | "b" | "c" | "1" | "f";
function App() {
    const [consumerKey, setConsumerKey] = useState("abc1f");
    const proxyRef = useRef<AppContextType>({a: 1, b: 2, c: 3, arr: [1, 2, 3]});

    function setConsumerKeyElement(char: ConsumerKeyChar, on: boolean) {
        if (on && !consumerKey.includes(char)) {
            setConsumerKey(consumerKey + char);
        } else if (!on && consumerKey.includes(char)) {
            setConsumerKey(consumerKey.replace(char, ""));
        }
    }

    return (
        <div className="App p-3">
            <AppContextProvider
                value={{
                    a: 1,
                    b: 2,
                    c: 3,
                    arr: [1, 2]
                }}

                onChangeProp={(prop, curr, prev) => {
                    console.log("App onChangeProp:", prop, curr, prev);
                }}

                onChangeReinit={(curr, prev) => {
                    console.log("App onChangeReinit:", curr, prev);
                }}

                proxyRef={proxyRef}
                renderDeps={[consumerKey]}
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
                    <br />

                    <label>Listen to first element of arr:</label>
                    <input type="checkbox" checked={consumerKey.includes("f")} onChange={(e) => setConsumerKeyElement("f", e.target.checked)} />
                </div>

                <p>
                    Look into the console to see exactly when the onChange events are triggered and the arguments they receive.
                </p>
            </AppContextProvider>
        </div>
    );
}

function Consumer({consumerKey}: {consumerKey: string}) {
    const [{a, b, c, arr}] = useProxyContext(AppContext, 
        [
          consumerKey.includes("a") && "a",
          consumerKey.includes("b") && "b",
          consumerKey.includes("c") && "c",
          consumerKey.includes("f") && ["arr", 0]
        ],
        (prop, curr, prev) => {
            console.log("Consumer onChangeProp:", prop, curr, prev);
        },
        createOnChangeReinit<AppContextType>((curr, prev) => {
            console.log("Consumer onChangeReinit:", curr, prev);
        }),
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
            {consumerKey.includes("f") && <>arr={arr}<br /></>}
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
            <button onClick={() => context.c -= 1}>Decrement c</button> <br /> <br />
            <button onClick={() => context.arr = [context.arr[0] + 1, context.arr[1]]}>Increment arr[0]</button>
            <button onClick={() => context.arr = [context.arr[0] - 1, context.arr[1]]}>Decrement arr[0]</button> <br /> <br />
            <button onClick={() => context.arr = [context.arr[0], context.arr[1] + 1]}>Increment arr[1]</button>
            <button onClick={() => context.arr = [context.arr[0], context.arr[1] - 1]}>Decrement arr[1]</button>
        </div>
    );
}

export default App;
