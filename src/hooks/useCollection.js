import { useCallback, useEffect, useState } from "react";
import { deleteRow, loadCollection, upsertRow } from "../supabase";
import { uuid } from "../lib/appUtils";

export function useCollection(table, isGuest) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollection(table).then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, [table]);

  const add = useCallback(async (item) => {
    if (isGuest) return;
    const id = item.id || uuid();
    const full = { ...item, id };
    setItems((prev) => [...prev, full]);
    await upsertRow(table, id, full);
    return full;
  }, [table, isGuest]);

  const replace = useCallback(async (id, full) => {
    if (isGuest) return;
    setItems((prev) => prev.map((item) => (item.id === id ? full : item)));
    await upsertRow(table, id, full);
  }, [table, isGuest]);

  const remove = useCallback(async (id) => {
    if (isGuest) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    await deleteRow(table, id);
  }, [table, isGuest]);

  return { items, loading, add, replace, remove };
}
