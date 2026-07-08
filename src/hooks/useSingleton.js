import { useCallback, useEffect, useState } from "react";
import { loadSingleton, saveSingleton } from "../supabase";

export function useSingleton(table, def, isGuest) {
  const [value, setValue] = useState(def);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSingleton(table).then((result) => {
      if (result !== null) setValue(result);
      setLoading(false);
    });
  }, [table]);

  const set = useCallback(async (nextValue) => {
    if (isGuest) return;
    const resolved = typeof nextValue === "function" ? nextValue(value) : nextValue;
    setValue(resolved);
    await saveSingleton(table, resolved);
  }, [table, value, isGuest]);

  return [value, set, loading];
}
