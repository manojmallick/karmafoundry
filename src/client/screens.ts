export type Screen = "GAME" | "VOTE" | "LEADERBOARD" | "TUTORIAL" | "REWARD";

export interface ScreenState {
  current: Screen;
  history: Screen[];
}

export const initialScreenState: ScreenState = {
  current: "GAME",
  history: [],
};

export function navigateTo(state: ScreenState, screen: Screen): ScreenState {
  return {
    current: screen,
    history: [...state.history, state.current],
  };
}

export function goBack(state: ScreenState): ScreenState {
  if (state.history.length === 0) {
    return state;
  }

  const newHistory = [...state.history];
  const previous = newHistory.pop()!;

  return {
    current: previous,
    history: newHistory,
  };
}
