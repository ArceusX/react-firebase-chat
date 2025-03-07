import { auth } from "../../lib/firebase";
import ChatList from "./ChatList"
import UserInfo from "./UserInfo"

import "../css/ChatListPanel.css"

const ChatListPanel = () => {
  const handleLogout = () => {
    auth.signOut();
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