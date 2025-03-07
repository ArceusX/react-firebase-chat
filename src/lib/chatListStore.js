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
    return null;
  },

  // Delete chatItem in chats. Then if !toDelete, prepend chatItem
  // In effect, if found, shift chatItem to front; else, prepend new
  updateChat: (chatItem, toDelete = false) => {
    let { chats, chatOrder } = get();
    const username = chatItem.user.username;

    if (username in chatOrder) {
      const index = chatOrder[username];
      chats.splice(index, 1);
    } 
    if (!toDelete) {
      chats.unshift(chatItem);
    }

    // Update chatOrder indices for all items
    chatOrder = []
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
  resetChatList: () => {
    set({
      chatOrder: {},
      chats: [],   
    });
  },
}));
