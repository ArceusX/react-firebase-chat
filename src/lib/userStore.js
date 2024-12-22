import { doc, getDoc } from "firebase/firestore";
import { create } from "zustand";
import { db } from "./firebase";

export const useUserStore = create((set) => ({
  // Logged-in user
  thisUser: null,
  fetching: true,
  fetchUserData: async (username) => {
    if (!username) return set({ thisUser: null, fetching: false });

    try {
      const userSnap = await getDoc(doc(db, "users", username));
      set({
        thisUser: userSnap.exists() ? { ...userSnap.data(), username } : null,
        fetching: false,
      });

    } catch (err) {
      set({ thisUser: null, fetching: false, });
      console.log(err);
    }
  },
}));
