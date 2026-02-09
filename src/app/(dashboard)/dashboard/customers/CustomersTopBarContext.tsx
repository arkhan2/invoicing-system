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

const CustomersTopBarContext = createContext<{
  barState: BarState;
  setBarState: (s: BarState | ((prev: BarState) => BarState)) => void;
}>({
  barState: defaultBarState,
  setBarState: () => {},
});

export function useCustomersTopBar() {
  return useContext(CustomersTopBarContext);
}

export function CustomersTopBarProvider({ children }: { children: ReactNode }) {
  const [barState, setBarState] = useState<BarState>(defaultBarState);
  return (
    <CustomersTopBarContext.Provider value={{ barState, setBarState }}>
      {children}
    </CustomersTopBarContext.Provider>
  );
}
