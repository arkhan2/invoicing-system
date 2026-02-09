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

const EstimatesTopBarContext = createContext<{
  barState: BarState;
  setBarState: (s: BarState | ((prev: BarState) => BarState)) => void;
}>({
  barState: defaultBarState,
  setBarState: () => {},
});

export function useEstimatesTopBar() {
  return useContext(EstimatesTopBarContext);
}

export function EstimatesTopBarProvider({ children }: { children: ReactNode }) {
  const [barState, setBarState] = useState<BarState>(defaultBarState);
  const pathname = usePathname();

  const clearWhenLeavingImport = useCallback(() => {
    setBarState(defaultBarState);
  }, []);

  useLayoutEffect(() => {
    // Clear custom bar state only when on the list (no sub-route); sub-routes (import, view, edit) set their own.
    if (pathname === "/dashboard/estimates") {
      clearWhenLeavingImport();
    }
  }, [pathname, clearWhenLeavingImport]);

  return (
    <EstimatesTopBarContext.Provider value={{ barState, setBarState }}>
      {children}
    </EstimatesTopBarContext.Provider>
  );
}
