import { updateDoc,  } from "firebase/firestore";
import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatStore = create((set) => ({

  // Use any chatId field from "userChats": thisUser.username ->
  // "chats": receiver.username as key to "chats" to get messages
  chatId: null,
  receiver: null,
  receiverBlocked: false, // Can be changed by thisUser via toggleReceiverBlock
  thisUserBlocked: false,

  messages: [],
  pinnedList: [],

  // Called by handleSearch, handleAdd, or onClick of card in ChatList
  // Save data to database doc before overwriting variables
  loadChat: async (chatId, receiver, doc = null, data = null) => {

    if (doc && data) {
      await updateDoc(doc, { ...data, });
    }

    const thisUser = useUserStore.getState().thisUser;
    set({
      chatId,
      receiver,
      receiverBlocked: thisUser.blockedUsers.includes(receiver.username),
      thisUserBlocked: receiver.blockedUsers.includes(thisUser.username),
    });
  },
  toggleReceiverBlock: () => set((state) => (
    {receiverBlocked: !state.receiverBlocked }
  )),
  setThisUserBlocked: (thisUserBlocked) => {
    set((state) => ({ ...state, thisUserBlocked }));
  },

  // setMessages & setPinnedList are called as result of loadChat 
  setMessages: (messages) => set(() => ({ messages })),
  setPinnedList: (pinnedList) => set(() => ({ pinnedList })),
  togglePin: (index) => {
    set((state) => ({
      pinnedList: state.pinnedList.includes(index)
        ? state.pinnedList.filter(item => item !== index)
        : [...state.pinnedList, index],
    }));
  },

  // Called in handleQuit or from log out
  resetChat: () => {
    set({
      chatId: null,
      receiver: null,
      thisUserBlocked: false,
      receiverBlocked: false,
      messages: [],
      pinnedList: [],
    });
  },
}));
