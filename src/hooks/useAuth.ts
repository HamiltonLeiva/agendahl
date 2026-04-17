import { useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      if (!nextUser) return;

      await setDoc(
        doc(db, "users", nextUser.uid),
        {
          displayName: nextUser.displayName ?? "Sin nombre",
          email: nextUser.email ?? "sin-email@local",
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    });

    return () => unsubscribe();
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
      login: () => signInWithPopup(auth, provider),
      logout: () => signOut(auth),
    }),
    [isLoading, user],
  );
}
