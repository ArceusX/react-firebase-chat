import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatStore = create((set) => ({

  // Use chatId as field in "userChats": thisUser.username -> 
  // "chats": receiver.username to get chats: chatId .data().messages
  chatId: null,
  receiver: null,
  receiverBlocked: false, // Can be changed by thisUser via toggleReceiverBlock
  thisUserBlocked: false,

  selectChat: (chatId, receiver) => {
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
  setThisUserBlock: (thisUserBlocked) => {
    set((state) => ({ ...state, thisUserBlocked }));
  },
  resetChat: () => {
    set({
      chatId: null,
      receiver: null,
      thisUserBlocked: false,
      receiverBlocked: false,
    });
  },
}));
