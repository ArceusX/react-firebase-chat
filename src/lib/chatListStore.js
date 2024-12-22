import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatListStore = create((set, get) => ({

  // key  : receiver's username in chat
  // value: pos of that chat(Item) in chats
  chatOrder: {},
  chats: [],   

  // Sort chatItems so more recent chat is given higher pos/index
  setChats: (chatItems) => {
    chatItems.sort((a, b) => b.updatedAt - a.updatedAt);
    const chatOrder = {};
    for (let i = 0; i < chatItems.length; i++) {
      chatOrder[chatItems[i].user.username] = i;
    }
    set({
      chats: chatItems,
      chatOrder,
    });
  },
  getChat: (username) => {
    const { chats, chatOrder } = get();
    if (username in chatOrder) {
      return chats[chatOrder[username]];
    }
    else return null;
  },

  // If target chatItem is in chats: delete it, then if !toDelete,
  // push new copy of same chatItem. Either case, fill hole by shifting
  // chatItems positioned after it
  // If target chatItem is not & !toDelete, append it (no shift needed)
  updateChat: (chatItem, toDelete = false) => {
    const { chats, chatOrder } = get();
    const username = chatItem.user.username;

    if (username in chatOrder) {
      const index = chatOrder[username];
      chats.splice(index, 1);

      if (!toDelete) {
        chats.unshift(chatItem);
      } else {
        delete chatOrder[username];
      }
    } 
    else if (!toDelete) {
      chats.unshift(chatItem);
    }

    // Update chatOrder indices for all items
    for (let i = 0; i < chats.length; i++) {
      chatOrder[chats[i].user.username] = i;
    }
    set({
      chats,
      chatOrder,
    });
  },
  updateLastMessage: (username, text) => {
    const { chats, chatOrder, updateChat } = get();
    if (username in chatOrder) {
      const chatItem = chats[chatOrder[username]];
      chatItem.lastMessage = text;
      chatItem.replied = true;
      updateChat(chatItem);
    }
  },
}));
