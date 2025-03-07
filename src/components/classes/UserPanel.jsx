import {
  arrayRemove, arrayUnion, doc, updateDoc,
  getDoc, deleteDoc, writeBatch, } from "firebase/firestore";
  
import { db } from "../../lib/firebase"; 
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";

import "../css/UserPanel.css";

function timestampToDate(t) {
  return new Date(t.seconds * 1000).toLocaleDateString();
}

// Shows metadata & buttons to change settings when chat is open
const UserPanel = ({ onMessageClick, alt }) => {

  const { chatId, receiver, thisUserBlocked, receiverBlocked,
          toggleReceiverBlock, messages, pinnedList, resetChat }
          = useChatStore();  
      
  const { thisUser } = useUserStore();
  const { chats, chatOrder, getChat, updateChat } = useChatListStore();

  // 1. Toggle receiver's entry in thisUser's blockedUsers
  // 2. If thisUser hasn't left (ie thisUser is not alone):
  //    A. Alert receiver that thisUser toggles block
  //    B. Alert receiver to check updates in pending
  // 3. Toggle local state to re-render
  const handleBlock = async () => {
    const thisChatRef = doc(db, "users", thisUser.username);
    const recvChatRef = doc(db, "userChats", receiver.username, "chats", thisUser.username);
    
    try {
      const batch = writeBatch(db);

      batch.update(thisChatRef, {                             // 1
        blockedUsers: receiverBlocked ? arrayRemove(receiver.username) : arrayUnion(receiver.username),
      });

      if (!getChat(receiver.username).alone) {
        batch.update(recvChatRef, {                           // 2A
          blocked: !receiverBlocked,
        });

        batch.update(doc(db, "users", receiver.username), {   // 2B
          pending: arrayUnion(thisUser.username),
        });
      }

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
        batch.update(recvRef, { alone: true });

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
        <img src={receiver.avatar || "./avatar.png"} alt="" />
        <span className="username">{receiver.username}</span>
        <span className="date">
          Joined On {new Date(receiver.createdAt.seconds * 1000).toLocaleDateString()}
        </span>
        <div className="icons">
          <img src="./phone.png" alt="" />
          <img src="./info.png" alt="" />
        </div>
      </div>
      <div className="info">
        <div className="option">
          <div className="title">
            <span title="Click to scroll">Pinned</span>
            <img src="./arrowUp.png" alt="" />
          </div>
        </div>
        <div className="option">
          {messages
            .map((message, index) => {
              if (pinnedList.includes(index)) {
                return (
                  <div
                    key={index} 
                    className="message"
                    onClick={() => onMessageClick(index)} >
                    <img
                      style={{ visibility: message.file ? 'visible' : 'hidden' }}
                      src={message.hasImg ? message.file : alt}
                    />
                    <span className="texts">
                      {message.fileName ? message.fileName : message.text}
                    </span>
                  </div>
                );
              }
              return null;
            })}
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
