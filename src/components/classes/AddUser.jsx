import { useState } from "react";
import { collection, doc, getDoc, getDocs, query,
         serverTimestamp, writeBatch, updateDoc,
         setDoc, where, addDoc, arrayUnion } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";
import { useChatStore } from "../../lib/chatStore";

import "../css/AddUser.css";

const AddUser = ({ setAddMode, defaultValue}) => {

  // Searched-for user
  const [receiver, setReceiver] = useState(null);

  // Set by handleSearch; msg for failed search
  const [searchMsg, setSearchMsg] = useState("");

  // In handleSearch, handleAdd, disallow multiple btn clicks
  const [btnDisabled, setBtnDisabled] = useState(false);

  const { thisUser } = useUserStore();

  // Use to add chat card to ChatList
  const { getChat, updateChat } = useChatListStore();
  
  // Use to open chat in ChatWindow with user just added
  const { selectChat } = useChatStore();

  // Search for target username, failing for below cases:
  //    A. Target is thisUser: thisUser cannot join chat with itself
  //    B. Chat for target & thisUser already exists: open chat instead
  // Else, show card (avatar, username) & button to add button
  const handleSearch = async (e) => {
    e.preventDefault();
    const username = e.target.elements.username.value;

    if (username === "") return;
    if (username == thisUser.username) {
      setReceiver(null);
      setSearchMsg("Cannot add yourself");
      setTimeout(() => { setSearchMsg(""); }, 3000);
      return;
    }

    setBtnDisabled(true);
    try {
      const foundChat = getChat(username);
      if (foundChat) {
        selectChat(foundChat.chatId, foundChat.user);
        setAddMode(false);
      }
      else {
        const recvSnap = await getDoc(doc(db, "users", username));
        // Check if target username exists, then if chat between
        // thisUser & receiver already exists (ie thisChatSnap.exists())
        if (recvSnap.exists()) {
          const thisChatRef = doc(db, "userChats", thisUser.username, "chats", username);
          const thisChatSnap = await getDoc(thisChatRef);
          setReceiver({...recvSnap.data(), username, });
        }
        else {
          setReceiver(null);
          setSearchMsg(`${username} does not have a profile`);
          setTimeout(() => { setSearchMsg(""); }, 3000);
        }
      }
    } catch (err) {
      console.log(err);
    }
    finally {
      setBtnDisabled(false);
    }
  };

  // Start chat for thisUser & receiver. Check if that chat exists & if..
  // 1: chat already does: Copy receiver's ref & pass copy to thisUser
  // 2: chat does not    : Make new (setDoc) & assign refs to both users
  // Collect chat info & receiver's user info & render item in ChatList
  const handleAdd = async () => {

    setBtnDisabled(true);

    const thisChatsRef = doc(db, "userChats", thisUser.username);
    const thisChatRef  = doc(thisChatsRef, "chats", receiver.username);

    const recvChatsRef = doc(db, "userChats", receiver.username);
    const recvChatRef  = doc(recvChatsRef, "chats", thisUser.username);

    let   chatData, recvChatSnap;
    const batch = writeBatch(db);

    try {
      recvChatSnap = await getDoc(recvChatRef);

      // If chat already exists, let thisUser rejoin by copying receiver's ref
      if (recvChatSnap.exists()) {

        // "replied : false": Inform thisUser it is their turn to reply
        chatData = { ...recvChatSnap.data(), hasQuit: false, replied: false };

        // "hasQuit: false": Inform receiver that thisUser has rejoined
        batch.update(recvChatRef, { hasQuit: false });

        batch.set(thisChatRef, chatData);
      }

      else {
        const newChatRef = doc(collection(db, "chats"));
        batch.set(newChatRef, {
          createdAt: serverTimestamp(),
          messages: [],
        });

        chatData = {
          chatId: newChatRef.id,
          lastMessage: "",
          updatedAt: serverTimestamp(),
          replied: false,
          hasQuit: false,
          blocked: false,
        };

        batch.set(recvChatRef, chatData);
        batch.set(thisChatRef, chatData);
      }

      // Alert receiver to pull updates for a chat
      batch.update(doc(db, "users", receiver.username), {
          pending: arrayUnion(thisUser.username),
      });

      await batch.commit();

      const recvSnap = await getDoc(doc(db, "users", receiver.username));
      const user = ({...recvSnap.data(), username: receiver.username });

      updateChat({ ...chatData, user });
      selectChat(recvChatSnap.data().chatId, user);
    } catch (err) {
      console.log(err);
    }
    finally {
      setAddMode(false);
      setBtnDisabled(false);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username"
        name="username" defaultValue={defaultValue} />
        <button disabled={btnDisabled} >Search</button>
      </form>
      {receiver && (
        <div className="user">
          <div className="detail">
            <img src={receiver.avatar || "./avatar.png"} alt="" />
            <span title={receiver.email} >{receiver.username}</span>
          </div>
          <button disabled={btnDisabled} onClick={handleAdd}>Add User</button>
        </div>
      )}
      {searchMsg && (
        <div className="searchMsg">{searchMsg}</div>
      )}
    </div>
  );
};

export default AddUser;
