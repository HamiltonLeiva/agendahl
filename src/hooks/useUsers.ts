import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppUser } from "../types/models";

export function useUsers(userId: string | null) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUsers([]);
      setError(null);
      return;
    }

    const usersQuery = query(collection(db, "users"), orderBy("displayName", "asc"));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((entry) => ({
          id: entry.id,
          displayName: String(entry.data().displayName ?? "Sin nombre"),
          email: String(entry.data().email ?? "sin-email@local"),
        }));

        setUsers(mapped);
        setError(null);
      },
      () => {
        setError(
          "No se pudo consultar usuarios en Firestore. Revisa la configuracion del proyecto.",
        );
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return {
    users,
    error,
  };
}
