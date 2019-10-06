# useHistoryReducer

This experimental hook provides a light wrapper over `useReducer` which provides undo/redo, forking, and checkpoints. It's built on top of [Immer](https://immerjs.github.io/immer/docs/introduction), so you also get the added benefits it provides.

## Basic example

```js
import React from "react";
import useHistoryReducer from "use-history-reducer";

function reducer(state, action) {
  if (action.type === "increment") {
    state.count += 1;
  }
}

function App() {
  const [state, changes, dispatch] = useHistoryReducer(reducer, { count: 1 });

  return (
    <div>
      <main>{state.count}</main>
      <button onClick={() => dispatch({ type: "increment" })}>++</button>
      <button
        disabled={changes.counts.undos === 0}
        onClick={() => changes.undo()}
      >
        Undo
      </button>
      <button
        disabled={changes.counts.redos === 0}
        onClick={() => changes.redo()}
      >
        Redo
      </button>
    </div>
  );
}
```

## Forking

Forking allows you to break off from the main set of changes temporarily, and either commit all the changes that happen during the fork at once (and in one changeset), or revert them altogether. One use case for this is an input that may change the state many times, and you want only the final value to be recorded.

```js
import React from "react";
import useHistoryReducer from "use-history-reducer";

function reducer(state, action) {
  if (action.type === "SET_COUNT") {
    state.count = action.payload;
  }
}

function App() {
  const [state, changes, dispatch] = useHistoryReducer(reducer, { count: 1 });

  return (
    <div>
      <main>{state.count}</main>
      <input
        type="range"
        min="1"
        max="100"
        value={state.count}
        onMouseDown={() => changes.fork()}
        onMouseUp={() => changes.commit()}
        onChange={e => dispatch({ type: "SET_COUNT", payload: e.target.value })}
      />
      <button
        disabled={changes.counts.undos === 0}
        onClick={() => changes.undo()}
      >
        Undo
      </button>
      <button
        disabled={changes.counts.redos === 0}
        onClick={() => changes.redo()}
      >
        Redo
      </button>
    </div>
  );
}
```

## Checkpoints

By using checkpoints, you can get the the changes made since the last checkpoint. This makes it easy to track unsaved changes you haven't sent to your backend or whatever persistence layer you are using.

```js
import React from "react";
import useHistoryReducer from "use-history-reducer";

function reducer(state, action) {
  if (action.type === "increment") {
    state.count += 1;
  }
}

function App() {
  const [state, changes, dispatch] = useHistoryReducer(reducer, { count: 1 });

  return (
    <div>
      <main>{state.count}</main>
      <button onClick={() => dispatch({ type: "increment" })}>++</button>
      <button
        disabled={changes.counts.unchecked === 0}
        onClick={() => {
          const changes = changes.checkpoint();
          // do something with the patches.
        }}
      >
        Save
      </button>
    </div>
  );
}
```
