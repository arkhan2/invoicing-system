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

const VendorsTopBarContext = createContext<{
  barState: BarState;
  setBarState: (s: BarState | ((prev: BarState) => BarState)) => void;
}>({
  barState: defaultBarState,
  setBarState: () => {},
});

export function useVendorsTopBar() {
  return useContext(VendorsTopBarContext);
}

export function VendorsTopBarProvider({ children }: { children: ReactNode }) {
  const [barState, setBarState] = useState<BarState>(defaultBarState);
  return (
    <VendorsTopBarContext.Provider value={{ barState, setBarState }}>
      {children}
    </VendorsTopBarContext.Provider>
  );
}
