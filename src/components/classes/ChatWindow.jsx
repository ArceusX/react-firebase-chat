import { useEffect, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { onSnapshot, arrayUnion, query, collection,
         doc, getDoc, updateDoc,
         serverTimestamp, writeBatch} from "firebase/firestore";

import upload from "../../lib/upload";
import { db, } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";

import MessageList from "./MessageList";

import "../css/ChatWindow.css";

const ChatWindow = ({ messageRefs, alt }) => {

  const { setMessages, setPinnedList } = useChatStore();

  const [emojiOn, setEmojiOn] = useState(false);

  // Message typed in chat box. Used with handleEmoji, handleSend
  const [text, setText] = useState("");

  // Used with handleImg. Reset after handleSend
  const [file, setFile] = useState({
    file: null,
    url: "",
    name: "",
  });

  const { thisUser } = useUserStore();

  // chatId  : Document in databse from which to fetch messages
  // receiver: User to which to send message (in its pending [])
  // (thisUser/receiver)Blocked: Flags to disable chatbox
  const { chatId, receiver, thisUserBlocked, receiverBlocked } = useChatStore();
  
  // Sent message is put as .lastMessage of matching chat card in ChatList
  const { updateLastMessage } = useChatListStore();

  // Fetch messages when loadChat changes chat in ChatWindow
  useEffect(() => {
    const unSub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      setMessages(snap.data().messages);
    });

    return () => { unSub(); };
  }, [chatId]);

  useEffect(() => {
    const fetchPinnedList = async () => {
      if (!receiver) {
        setPinnedList([]);
        return;
      }
      const thisChatRef = doc(db, "userChats", thisUser.username, "chats", receiver.username);
      setPinnedList((await getDoc(thisChatRef)).data().pinnedList);
    };

    fetchPinnedList();
  }, [receiver?.username]);


  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setEmojiOn(false);
  };

  const handleFile = (e) => {
    if (e.target.files[0]) {
      const selectedFile = e.target.files[0];

      setFile({
        file: selectedFile,
        url: selectedFile.type.startsWith("image/")
          ? URL.createObjectURL(selectedFile)
          : null,
        name: selectedFile.name,
      });
    }
  };

  // Write to below 2 db documents, & 2 other if receiver is in chat:
  //  "chats": chatId: messages;
  //  "userChats": thisUser.username: "chats": receiver.username; 
  const handleSend = async () => {
    if (text === "" && !file.file) return; 

    let downloadUrl = null, uploadName = null, date = null;
    try {
      if (file.file) {
        // () around destructuring lets JS interpret already defined
        // variables as expression rather than as code block
        ({downloadUrl, uploadName, date} = await upload("uploads", file.file));
      }
      else { date = new Date(); }

      const batch = writeBatch(db);

      // 1. Append new message to messages array
      batch.update(doc(db, "chats", chatId), {
        messages: arrayUnion({
          sender: thisUser.username,
          text,
          createdAt: date, // Can't use serverTimestamp() in arrayUnion
          ...(file.url && { hasImg: true }),
          ...(downloadUrl && { file: downloadUrl }),
          ...(uploadName && { fileName: uploadName }),
        }),
      });

      // 2. Update most recent message and mark that thisUser replied
      const thisChatRef = doc(db, "userChats", thisUser.username, "chats", receiver.username);
      batch.update(thisChatRef, {
        lastMessage: text,
        replied: true,
        updatedAt: serverTimestamp(),
      });

      // 3. Check existence before updating receiver so
      //    to not re-add user who quit chat against wish

      const recvChatRef = doc(db, "userChats", receiver.username, "chats", thisUser.username);
      const recvChatSnap = await getDoc(recvChatRef);

      if (recvChatSnap.exists()) {
        batch.update(recvChatRef, {
          lastMessage: text,
          replied: false,
          updatedAt: serverTimestamp(),
        });

        // 4. Alert receiver to new message from thisUser
        await updateDoc(doc(db, "users", receiver.username), {
          pending: arrayUnion(thisUser.username),
        });
      }

      updateLastMessage(receiver.username, text);

      await batch.commit();

    } catch (err) {
      console.log(err);
    } finally {
      setFile({file: null, url: "", name: ""});
      setText("");
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={receiver.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span className="username">{receiver.username}</span>
            <p className="bio" title="Bio">{receiver.bio.trim()}</p>
          </div>
        </div>
      </div>
      <div className="center">
        <MessageList file={file} alt={alt} refs={messageRefs} />
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./clip.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleFile}
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