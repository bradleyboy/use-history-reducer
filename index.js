import { produceWithPatches, applyPatches } from "immer";
import { useReducer, useRef, useMemo } from "react";

const UNDO = Symbol("UNDO");
const REDO = Symbol("REDO");

const BEGIN_FORK = Symbol("BEGIN_FORK");
const COMMIT_FORK = Symbol("COMMIT_FORK");
const REVERT_FORK = Symbol("REVERT_FORK");

class History {
  constructor(initialState) {
    this.undoable = [];
    this.redoable = [];
    this.forkedPatches = [];
    this.forkedState = null;
    this.checkpointState = initialState;
    this.checkpointPatches = [];
  }

  checkpoint() {
    const [state, patches] = produceWithPatches(this.checkpointState, draft => {
      applyPatches(draft, this.checkpointPatches);
    });

    this.checkpointPatches = [];
    this.checkpointState = state;

    return patches;
  }

  push(patches) {
    this.undoable = [patches, ...this.undoable];
    this.redoable = [];

    if (this.isForked()) {
      this.forkedPatches.push(...patches.patches);
    } else {
      this.checkpointPatches.push(...patches.patches);
    }
  }

  rewind(count = 1) {
    const lastPatches = this.undoable.slice(0, count);

    lastPatches.reverse();

    this.redoable = [...lastPatches, ...this.redoable];
    this.undoable = this.undoable.slice(count);

    if (this.isForked()) {
      this.forkedPatches.pop();
    } else {
      this.checkpointPatches.push(...lastPatches[0].inversePatches);
    }

    return lastPatches[0].inversePatches;
  }

  forward(count = 1) {
    const nextPatches = this.redoable.slice(0, count);

    nextPatches.reverse();

    this.undoable = [...nextPatches, ...this.undoable];
    this.redoable = this.redoable.slice(count);

    const patches = nextPatches[0].patches;

    if (this.isForked()) {
      this.forkedPatches.push(...patches);
    } else {
      this.checkpointPatches.push(...nextPatches[0].patches);
    }

    return patches;
  }

  isForked() {
    return this.forkedState !== null;
  }

  fork(state) {
    this.forkedState = {
      state,
      undoable: this.undoable.slice(0),
      redoable: this.redoable.slice(0)
    };
  }

  commit() {
    const [state, patches, inversePatches] = produceWithPatches(
      this.forkedState.state,
      draft => {
        applyPatches(draft, this.forkedPatches);
      }
    );

    this.undoable = [{ patches, inversePatches }, ...this.forkedState.undoable];
    this.redoable = [];

    this.forkedState = null;
    this.forkedPatches = [];

    this.checkpointPatches.push(...patches);

    return state;
  }

  revert() {
    this.undoable = this.forkedState.undoable;
    this.redoable = this.forkedState.redoable;

    const state = this.forkedState.state;

    this.forkedState = null;
    this.forkedPatches = [];

    return state;
  }
}

export default function useHistoryReducer(reducer, initialState) {
  const history = useRef(new History(initialState));

  const finalReducer = useMemo(() => {
    const reducerWithPatches = produceWithPatches(reducer);

    return (state, action) => {
      switch (action.type) {
        case BEGIN_FORK:
          history.current.fork(state);

          return state;

        case REVERT_FORK:
          return history.current.revert();

        case COMMIT_FORK:
          return history.current.commit();

        case UNDO:
          return applyPatches(state, history.current.rewind(action.payload));

        case REDO:
          return applyPatches(state, history.current.forward(action.payload));

        default: {
          const [newState, patches, inversePatches] = reducerWithPatches(
            state,
            action
          );

          history.current.push({ patches, inversePatches });

          return newState;
        }
      }
    };
  }, [reducer]);

  const [state, dispatch] = useReducer(finalReducer, initialState);

  return [
    state,
    {
      undoCount: history.current.undoable.length,
      redoCount: history.current.redoable.length,
      undo: (n = 1) => dispatch({ type: UNDO, payload: n }),
      redo: (n = 1) => dispatch({ type: REDO, payload: n }),
      fork: () => dispatch({ type: BEGIN_FORK }),
      commit: () => dispatch({ type: COMMIT_FORK }),
      revert: () => dispatch({ type: REVERT_FORK }),
      checkpoint: () => history.current.checkpoint()
    },
    dispatch
  ];
}
