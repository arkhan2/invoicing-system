"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type BarState = {
  title?: string | null;
  titleSuffix?: ReactNode;
  rightSlot?: ReactNode;
};

const defaultBarState: BarState = { title: null, titleSuffix: null, rightSlot: null };

const InvoicesTopBarContext = createContext<{
  barState: BarState;
  setBarState: (s: BarState | ((prev: BarState) => BarState)) => void;
}>({
  barState: defaultBarState,
  setBarState: () => {},
});

export function useInvoicesTopBar() {
  return useContext(InvoicesTopBarContext);
}

export function InvoicesTopBarProvider({ children }: { children: ReactNode }) {
  const [barState, setBarState] = useState<BarState>(defaultBarState);
  const pathname = usePathname();

  const clearWhenLeaving = useCallback(() => {
    setBarState(defaultBarState);
  }, []);

  useLayoutEffect(() => {
    if (pathname === "/dashboard/sales") {
      clearWhenLeaving();
    }
  }, [pathname, clearWhenLeaving]);

  return (
    <InvoicesTopBarContext.Provider value={{ barState, setBarState }}>
      {children}
    </InvoicesTopBarContext.Provider>
  );
}
