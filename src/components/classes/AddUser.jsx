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
  const [target, setTarget] = useState(null);

  // Set by handleSearch; msg for failed search
  const [searchMsg, setSearchMsg] = useState("");

  // In handleSearch, handleAdd, disallow multiple btn clicks
  const [btnDisabled, setBtnDisabled] = useState(false);

  const { thisUser } = useUserStore();

  // Use to add chat card to ChatList
  const { getChat, updateChat } = useChatListStore();
  
  // Receiver is user in ChatWindow and different from target
  // Use to open chat in ChatWindow with user just added
  const { receiver, pinnedList, loadChat } = useChatStore();

  // Search for target username, failing for below cases:
  //    A. Target is thisUser: thisUser cannot join chat with itself
  //    B. Chat for target & thisUser already exists: open chat instead
  //    C. Target has blocked thisUser: show searchMsg
  // Else, show card (avatar, username) & button to add button
  const handleSearch = async (e) => {
    e.preventDefault();
    const username = e.target.elements.username.value;

    if (username === "") return;
    if (username == thisUser.username) {
      setTarget(null);
      setSearchMsg("Cannot add yourself");
      setTimeout(() => { setSearchMsg(""); }, 3000);
      return;
    }

    setBtnDisabled(true);
    try {
      const foundChat = getChat(username);
      if (foundChat) {
        loadChat(
          foundChat.chatId, foundChat.user,
          receiver ? doc(db, "userChats", thisUser.username, "chats", receiver.username) : null,
          { pinnedList }
        ); // TODO Write pin
        setAddMode(false);
      }
      else {
        const recvSnap = await getDoc(doc(db, "users", username));

        // Check if target username exists, then if chat between
        // thisUser & target already exists (ie thisChatSnap.exists())
        if (recvSnap.exists()) {

          if (recvSnap.data().blockedUsers.includes(thisUser.username)) {
            setTarget(null);
            setSearchMsg(`${username} has blocked you.`);
            setTimeout(() => { setSearchMsg(""); }, 3000);
          }
          else {
            setTarget({...recvSnap.data(), username, });
          }
        }
        else {
          setTarget(null);
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

  // Start chat for thisUser & target. Check if that chat exists & if..
  // 1: chat already does: Copy target's ref & pass copy to thisUser
  // 2: chat does not    : Make new (setDoc) & assign refs to both users
  // Collect chat info & target's user info & render item in ChatList
  const handleAdd = async () => {
    setBtnDisabled(true);

    const thisChatsRef = doc(db, "userChats", thisUser.username);
    const thisChatRef  = doc(thisChatsRef, "chats", target.username);

    const recvChatsRef = doc(db, "userChats", target.username);
    const recvChatRef  = doc(recvChatsRef, "chats", thisUser.username);

    let   chatData, recvChatSnap;
    const batch = writeBatch(db);

    try {
      recvChatSnap = await getDoc(recvChatRef);

      // If chat already exists, let thisUser rejoin by copying target's ref
      if (recvChatSnap.exists()) {
        
        // Store recv's old data, update hasQuit for recv, clear
        // pinnedList in old data, write it for thisUser's
        chatData = { ...recvChatSnap.data(), hasQuit: false, replied: false };
        batch.update(recvChatRef, { hasQuit: false });
        chatData.pinnedList = [];
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
          pinnedList: [],
          replied: false, // false: It's thisUser's turn to reply
          hasQuit: false, // false: Target hasn't left
          blocked: false, // false: Target hasn't blocked thisUser
        };

        batch.set(recvChatRef, chatData);
        batch.set(thisChatRef, chatData);
      }

      // Alert target to pull updates for a chat
      batch.update(doc(db, "users", target.username), {
          pending: arrayUnion(thisUser.username),
      });

      await batch.commit();

      const recvSnap = await getDoc(doc(db, "users", target.username));
      const user = ({...recvSnap.data(), username: target.username });

      updateChat({ ...chatData, user });
      loadChat(
        chatData.chatId, user,
        receiver ? doc(db, "userChats", thisUser.username, "chats", receiver.username) : null,
        { pinnedList }
      ); // TODO Write pin
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
      {target && (
        <div className="user">
          <div className="detail">
            <img src={target.avatar || "./avatar.png"} alt="" />
            <span title={target.email} >{target.username}</span>
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
