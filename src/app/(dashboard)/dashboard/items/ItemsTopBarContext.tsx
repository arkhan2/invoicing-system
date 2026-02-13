"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type BarState = {
  rightSlot?: ReactNode | null;
};

const defaultBarState: BarState = { rightSlot: null };

const ItemsTopBarContext = createContext<{
  barState: BarState;
  setBarState: (s: BarState | ((prev: BarState) => BarState)) => void;
}>({
  barState: defaultBarState,
  setBarState: () => {},
});

export function useItemsTopBar() {
  return useContext(ItemsTopBarContext);
}

export function ItemsTopBarProvider({ children }: { children: ReactNode }) {
  const [barState, setBarState] = useState<BarState>(defaultBarState);
  return (
    <ItemsTopBarContext.Provider value={{ barState, setBarState }}>
      {children}
    </ItemsTopBarContext.Provider>
  );
}
