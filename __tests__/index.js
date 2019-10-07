import React from "react";
import { render } from "@testing-library/react";

import "@testing-library/jest-dom/extend-expect";

import useHistoryReducer from "..";

function reducer(state, action) {
  if (action.type === "+") {
    state.count += 1;
  }
}

function TestComponent({ onCheckpoint }) {
  const [state, changes, dispatch] = useHistoryReducer(reducer, {
    count: 1,
    user: { name: "fred" }
  });

  return (
    <div>
      <main data-testid="count">{state.count}</main>
      <p data-testid="name">{state.user.name}</p>
      <button data-testid="inc" onClick={() => dispatch({ type: "+" })}>
        ++
      </button>
      <p data-testid="undo-count">{changes.counts.undos}</p>
      <p data-testid="redo-count">{changes.counts.redos}</p>
      <p data-testid="unchecked-count">{changes.counts.unchecked}</p>
      <button onClick={() => changes.undo()} data-testid="undo">
        undo
      </button>
      <button onClick={() => changes.redo()} data-testid="redo">
        redo
      </button>
      <button onClick={() => changes.fork()} data-testid="fork">
        fork
      </button>
      <button onClick={() => changes.revert()} data-testid="revert">
        revert
      </button>
      <button onClick={() => changes.commit()} data-testid="commit">
        commit
      </button>
      <button
        onClick={() => onCheckpoint(changes.checkpoint())}
        data-testid="checkpoint"
      >
        checkpoint
      </button>
    </div>
  );
}

test("does basic undo/redo", () => {
  const { getByTestId } = render(<TestComponent />);

  const countEl = getByTestId("count");
  const nameEl = getByTestId("name");
  const undoCountEl = getByTestId("undo-count");
  const redoCountEl = getByTestId("redo-count");

  expect(countEl).toHaveTextContent(1);
  expect(nameEl).toHaveTextContent('fred');
  expect(undoCountEl).toHaveTextContent(0);
  expect(redoCountEl).toHaveTextContent(0);

  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(countEl).toHaveTextContent(3);
  expect(undoCountEl).toHaveTextContent(2);
  expect(redoCountEl).toHaveTextContent(0);
  expect(nameEl).toHaveTextContent('fred');

  getByTestId("undo").click();
  expect(nameEl).toHaveTextContent('fred');
  expect(countEl).toHaveTextContent(2);
  expect(undoCountEl).toHaveTextContent(1);
  expect(redoCountEl).toHaveTextContent(1);

  getByTestId("redo").click();
  expect(nameEl).toHaveTextContent('fred');
  expect(countEl).toHaveTextContent(3);
  expect(undoCountEl).toHaveTextContent(2);
  expect(redoCountEl).toHaveTextContent(0);
});

test("forks then cancels", () => {
  const { getByTestId } = render(<TestComponent />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();

  getByTestId("fork").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(countEl).toHaveTextContent(4);

  getByTestId("revert").click();
  expect(countEl).toHaveTextContent(2);
});

test("forks then commits", () => {
  const { getByTestId } = render(<TestComponent />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();

  getByTestId("fork").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  getByTestId("undo").click();
  getByTestId("redo").click();
  expect(countEl).toHaveTextContent(5);

  getByTestId("commit").click();
  expect(countEl).toHaveTextContent(5);

  getByTestId("undo").click();
  expect(countEl).toHaveTextContent(2);

  getByTestId("redo").click();
  expect(countEl).toHaveTextContent(5);
});

test("checkpoint returns patches since initialState", () => {
  const handler = jest.fn();
  const { getByTestId } = render(<TestComponent onCheckpoint={handler} />);

  const countEl = getByTestId("count");
  const uncheckedCountEl = getByTestId("unchecked-count");

  expect(countEl).toHaveTextContent(1);
  expect(uncheckedCountEl).toHaveTextContent(0);

  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(uncheckedCountEl).toHaveTextContent(2);
  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(1);
  expect(handler.mock.calls[0][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 3 }
  ]);
  expect(uncheckedCountEl).toHaveTextContent(0);

  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(2);
  expect(handler.mock.calls[1][0]).toStrictEqual([]);

  getByTestId("undo").click();
  expect(uncheckedCountEl).toHaveTextContent(1);
  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(3);
  expect(handler.mock.calls[2][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 2 }
  ]);
  expect(uncheckedCountEl).toHaveTextContent(0);

  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(4);
  expect(handler.mock.calls[3][0]).toStrictEqual([]);

  getByTestId("redo").click();
  expect(uncheckedCountEl).toHaveTextContent(1);
  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(5);
  expect(handler.mock.calls[4][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 3 }
  ]);

  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(uncheckedCountEl).toHaveTextContent(2);
  getByTestId("checkpoint").click();
  expect(handler.mock.calls.length).toBe(6);
  expect(handler.mock.calls[5][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 5 }
  ]);
  expect(uncheckedCountEl).toHaveTextContent(0);
});

test("checkpoint works across a fork + commit", () => {
  const handler = jest.fn();
  const { getByTestId } = render(<TestComponent onCheckpoint={handler} />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();

  getByTestId("checkpoint").click();

  getByTestId("fork").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(countEl).toHaveTextContent(5);

  getByTestId("commit").click();
  expect(countEl).toHaveTextContent(5);

  getByTestId("checkpoint").click();
  expect(handler.mock.calls[1][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 5 }
  ]);
});

test("checkpoint works across a fork + revert", () => {
  const handler = jest.fn();
  const { getByTestId } = render(<TestComponent onCheckpoint={handler} />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();

  getByTestId("checkpoint").click();

  getByTestId("inc").click();

  getByTestId("fork").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(countEl).toHaveTextContent(6);

  getByTestId("revert").click();
  expect(countEl).toHaveTextContent(3);

  getByTestId("checkpoint").click();
  expect(handler.mock.calls[1][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 3 }
  ]);
});

test("checkpoint during fork only saves up to the fork", () => {
  const handler = jest.fn();
  const { getByTestId } = render(<TestComponent onCheckpoint={handler} />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();

  getByTestId("checkpoint").click();

  getByTestId("inc").click();

  getByTestId("fork").click();
  getByTestId("inc").click();
  getByTestId("inc").click();
  getByTestId("inc").click();

  getByTestId("checkpoint").click();
  expect(handler.mock.calls[1][0]).toStrictEqual([
    { op: "replace", path: ["count"], value: 3 }
  ]);
});
