import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { format } from "timeago.js";
import { onSnapshot, arrayUnion, query, collection,
         doc, getDoc, getDocs, updateDoc,
         serverTimestamp, writeBatch} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import upload from "../../lib/upload";
import { db, storage } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";

// Currently unused. TODO Use it
//import { useFileStore } from "../../lib/fileStore";

import "../css/ChatWindow.css";

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [emojiOn, setEmojiOn] = useState(false);

  // Message typed in chat box. Used with handleEmoji, handleSend
  const [text, setText] = useState("");

  // Used with handleImg. Reset after handleSend
  const [img, setImg] = useState({
    file: null,
    url: "",
  });

  const { thisUser } = useUserStore();

  // chatId  : Document in databse from which to fetch messages
  // receiver: User to which to send message (in its pending [])
  // (thisUser/receiver)Blocked: Flags to disable chatbox
  const { chatId, receiver, thisUserBlocked, receiverBlocked } = useChatStore();
  
  // Sent message is put as .lastMessage of matching chat card in ChatList
  const { updateLastMessage } = useChatListStore();

  // Unused for feature yet to be implemented
  //let { fileOwner, fileName, fileDate, fileUrl, setFile } = useFileStore();

  const endRef = useRef(null);

  // Fetch messages when selectChat changes chat in ChatWindow
  useEffect(() => {
    const unSub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      setMessages(snap.data().messages);
    });

    return () => { unSub(); };
  }, [chatId]);

  // Auto scroll to bottom when messages change (new message added)
  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setEmojiOn(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  // Write to below 2 db documents, & 2 more if receiver is in chat:
  //  "chats": chatId: messages;
  //  "userChats": thisUser.username: "chats": receiver.username; 
  const handleSend = async () => {
    if (text === "" && !img.file) return; 

    let imgUrl = null, date = null;
    try {
      if (img.file) {
        // () around destructuring lets JS interpret already defined
        // variables as expression rather than as code block
        ({downloadUrl: imgUrl, date} = await upload("uploads", img.file));
        
        //setFile(thisUser.username, img.file.name, date, imgUrl);
        //({ fileOwner, fileName, fileDate, fileUrl } = useFileStore.getState());
      }
      else { date = new Date(); }

      const batch = writeBatch(db);

      // 1. Append new message to messages array
      batch.update(doc(db, "chats", chatId), {
        messages: arrayUnion({
          sender: thisUser.username,
          text,
          createdAt: date, // Can't use serverTimestamp() in arrayUnion
          ...(imgUrl && { img: imgUrl }),  // Write image URL if it's not null
        }),
      });

      // 2. Update most recent message and mark that thisUser replied
      const thisChatRef = doc(db, "userChats", thisUser.username, "chats", receiver.username);
      batch.update(thisChatRef, {
        lastMessage: text,
        replied: true,
        updatedAt: serverTimestamp(),
      });

      const recvChatRef = doc(db, "userChats", receiver.username, "chats", thisUser.username);
      const recvChatSnap = await getDoc(recvChatRef);

      // 3. Check existence before updating receiver so
      //    to not re-add user who quit chat against wish
      if (recvChatSnap.exists()) {
        batch.update(recvChatRef, {
          lastMessage: text,
          replied: false,
          updatedAt: serverTimestamp(),
        });

        // 4. Tell receiver to check for messages from thisUser
        await updateDoc(doc(db, "users", receiver.username), {
          pending: arrayUnion(thisUser.username),
        });
      }

      updateLastMessage(receiver.username, text);

      await batch.commit();

    } catch (err) {
      console.log(err);
    } finally {
      setImg({file: null, url: "",});
      setText("");
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={receiver.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span className="username">{receiver?.username}</span>
            <p className="bio" title="Bio">{receiver.bio.trim()}</p>
          </div>
        </div>
      </div>
      <div className="center">
        {messages.map((message) => (
          <div
            className={
              message.sender === thisUser.username ? "message own" : "message"
            }
            key={`${message.sender}-${message.createdAt?.toDate()}`}
          >
            <div className="texts">
              {message.img && <img src={message.img} alt="" />}
              {message.text && (<p>{message.text}</p>)}
              <span title={message.createdAt.toDate()}>
                {format(message.createdAt.toDate())}
              </span>
            </div>
          </div>
        ))}
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
        </div>
        <textarea
          rows="2" 
          placeholder={
            thisUserBlocked ? "Blocked. Chat is disabled" :
            (receiverBlocked ? "Unblock to chat" : "Type your message") }
            
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={thisUserBlocked || receiverBlocked}
        />
        <div className="emoji">
          <img
            src="./emoji.png"
            alt=""
            onClick={() => setEmojiOn((prev) => !prev)}
          />
          <div className="picker">
          <EmojiPicker 
              open={emojiOn} 
              onEmojiClick={handleEmoji}
              categories={['smileys_people']} 
              skinTonesDisabled={true} />
          </div>
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={thisUserBlocked || receiverBlocked} >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;