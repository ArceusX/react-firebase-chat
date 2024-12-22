import { auth } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import ChatList from "./ChatList"
import UserInfo from "./UserInfo"

import "../css/ChatListPanel.css"

const ChatListPanel = () => {
  const { resetChat } = useChatStore();

  const handleLogout = () => {
    auth.signOut();
    resetChat();
  };

  return (
    <div className='chatListPanel'>
      <UserInfo/>
      <ChatList/>
      <button className="logout" onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default ChatListPanel