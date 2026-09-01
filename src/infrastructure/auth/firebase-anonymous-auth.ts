import type { User } from "firebase/auth";
import { signInAnonymously } from "firebase/auth";
import { getFirebaseServices } from "@/infrastructure/firebase/client";

let signInPromise: Promise<User> | null = null;

/**
 * Creates a private Firebase identity without presenting a login screen.
 * Firebase restores the same anonymous identity in the same browser profile.
 */
export async function getAnonymousUser(): Promise<User> {
  const { auth } = getFirebaseServices();
  await auth.authStateReady();

  if (auth.currentUser) return auth.currentUser;

  signInPromise ??= signInAnonymously(auth)
    .then(({ user }) => user)
    .catch((error: unknown) => {
      signInPromise = null;
      throw error;
    });

  return signInPromise;
}
