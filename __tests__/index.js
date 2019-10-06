import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

import useHistoryReducer from "..";

function reducer(state, action) {
  if (action.type === "+") {
    state.count += 1;
  }
}

function TestComponent() {
  const [state, changes, dispatch] = useHistoryReducer(reducer, { count: 1 });
  return (
    <div>
      <main data-testid="count">{state.count}</main>
      <button data-testid="inc" onClick={() => dispatch({ type: "+" })}>
        ++
      </button>
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
    </div>
  );
}

test("does basic undo/redo", () => {
  const { getByTestId } = render(<TestComponent />);

  const countEl = getByTestId("count");
  expect(countEl).toHaveTextContent(1);
  getByTestId("inc").click();
  getByTestId("inc").click();
  expect(countEl).toHaveTextContent(3);
  getByTestId("undo").click();
  expect(countEl).toHaveTextContent(2);
  getByTestId("redo").click();
  expect(countEl).toHaveTextContent(3);
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
