import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, } from "firebase/firestore";
import { db } from "./lib/firebase";

import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";
import { useChatListStore } from "./lib/chatListStore";

import ChatWindow from "./components/classes/ChatWindow";
import UserPanel from "./components/classes/UserPanel";
import ChatListPanel from "./components/classes/ChatListPanel";
import Login from "./components/classes/Login";
import Alert from "./components/classes/Alert";

// Icon to show for uploaded file that is not image
const aImgPath = "./attachment.png";

const App = () => {
  let { thisUser, fetching, fetchUserData } = useUserStore();
  let { chatId, resetChat } = useChatStore();
  const { resetChatList } = useChatListStore();
  const messageRefs = useRef([]);

  const scrollToMessage = (index) => {
    if (messageRefs.current[index]) {
      messageRefs.current[index].scrollIntoView({ behavior: "smooth" });
    }
  };

  // Continue last session if not logged-out
  useEffect(() => {
    const unSub = onAuthStateChanged(auth, async (user) => {
      thisUser = useUserStore.getState().thisUser;
      if (thisUser) {
        let receiver = useChatStore.getState().receiver;
        if (receiver) {
          await updateDoc(
            doc(db, "userChats", thisUser.username, "chats", receiver.username),
            { pinnedList: useChatStore.getState().pinnedList }
          );
        }
        resetChat();
        resetChatList();
      }
      fetchUserData(user?.displayName);
    });

    return () => { unSub(); };
  }, [fetchUserData]);

  if (fetching) return <div className="container"></div>
  
// If thisUser (logged in), show dashboard. Else, show Login page
return (
  <div className="container">
    {thisUser ? (
      <>
        <ChatListPanel />
        {chatId && <ChatWindow messageRefs={messageRefs} alt={aImgPath} />}
        {chatId && <UserPanel onMessageClick = {scrollToMessage} alt={aImgPath} />}
      </>) 
    : <Login />
    }
    <Alert />
  </div>
);
};

export default App;
