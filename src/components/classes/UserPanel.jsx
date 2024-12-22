import {
  arrayRemove, arrayUnion, doc, updateDoc,
  getDoc, deleteDoc, writeBatch, } from "firebase/firestore";
  
import { db } from "../../lib/firebase"; 
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";

import "../css/UserPanel.css";

// Shows metadata & buttons to change settings when chat is open
const UserPanel = () => {
  const { chatId, receiver, thisUserBlocked, receiverBlocked,
          toggleReceiverBlock, resetChat } = useChatStore();
  const { thisUser } = useUserStore();
  const { chats, chatOrder, updateChat } = useChatListStore();

  // 1. Toggle receiver's entry in thisUser's blockedUsers
  // 2. Alert receiver that thisUser has toggled block
  // 3. Alert receiver to check updates in pending
  // 4. Toggle local state to re-render
  const handleBlock = async () => {
    const thisChatRef = doc(db, "users", thisUser.username);
      const recvChatRef  = doc(db, "userChats", receiver.username, "chats", thisUser.username);
    try {
      const batch = writeBatch(db);

      batch.update(thisChatRef, {                             // 1
        blockedUsers: receiverBlocked ? arrayRemove(receiver.username) : arrayUnion(receiver.username),
      });

      batch.update(recvChatRef, {                             // 2
        blocked: !receiverBlocked,
      });

      batch.update(doc(db, "users", receiver.username), {     // 3
        pending: arrayUnion(thisUser.username),
      });

      batch.commit();
      toggleReceiverBlock();
      
    } catch (err) {
      console.log(err);
    }
  };

  // 1: Delete thisUser's ref to chat. Then if receiver (other party)..
  //    2A: is in chat, notify receiver via pending that thisUser left
  //    2B: lacks ref to chat, delete chat as both users havequit
  // 3. Delete chat card in ChatList (updateChat with toDelete = true )
  const handleQuit = async () => {
    try {
      const recvRef = doc(db, "userChats", receiver.username, "chats", thisUser.username);
      const recvChat = await getDoc(recvRef);

      const batch = writeBatch(db);

      if (recvChat.exists()) {            // 2A
        batch.update(recvRef, { hasQuit: true });

        batch.update(doc(db, "users", receiver.username), {
          pending: arrayUnion(thisUser.username),
        });
      }
      // If receiver is not in that chat, both parties have quit,
      // so delete that chat's messages in db
      else {                              // 2B
        batch.delete(doc(db, "chats", chatId));
      }

      const thisChatRef = doc(db, "userChats", thisUser.username, "chats", receiver.username);
      batch.delete(thisChatRef);        // 1

      await batch.commit();

      updateChat({user: { username: receiver.username } }, true); // 3
    } 
    catch (err) { console.log(err); }
    finally {
      resetChat();
    }
  };

  return (
    <div className="userPanel">
      <div className="user">
        <img src={receiver?.avatar || "./avatar.png"} alt="" />
        <span className="username">{receiver?.username}</span>
        <div className="icons">
          <img src="./phone.png" alt="" />
          <img src="./video.png" alt="" />
          <img src="./info.png" alt="" />
        </div>
      </div>
      <div className="info">
        <div className="option">
          <div className="title">
            <span>Chat Settings</span>
            <img src="./arrowDown.png" alt="" />
          </div>
        </div>
        <div className="option">
          <div className="title">
            <span>Shared Files</span>
            <img src="./arrowUp.png" alt="" />
          </div>
        </div>
        <div className="option">
          <div className="photos">
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="../../../public/alien.jpg"
                  alt=""
                />
                <span>photo_2024_2.png</span>
              </div>
              <img src="./download.png" alt="" className="icon" />
            </div>
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="../../../public/alien.jpg"
                  alt=""
                />
                <span>photo_2024_2.png</span>
              </div>
              <img src="./download.png" alt="" className="icon" />
            </div>
          </div>
        </div>
        <button onClick={handleBlock}>
          { thisUserBlocked ? "You Are Blocked" :
           (receiverBlocked ? "Unblock User" : "Block User")}
        </button>
        <button onClick={handleQuit} title="Delete from your side">
          Delete Chat
        </button>
      </div>
    </div>
  );
};

export default UserPanel;
