import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";

import ChatWindow from "./components/classes/ChatWindow";
import UserPanel from "./components/classes/UserPanel";
import ChatListPanel from "./components/classes/ChatListPanel";
import Login from "./components/classes/Login";
import Alert from "./components/classes/Alert";

const App = () => {
  const { thisUser, fetching, fetchUserData } = useUserStore();
  const { chatId } = useChatStore();

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
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
        {chatId && <ChatWindow />}
        {chatId && <UserPanel />}
      </>
    ) : <Login />
    }
    <Alert />
  </div>
);
};

export default App;
