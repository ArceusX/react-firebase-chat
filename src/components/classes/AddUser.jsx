import { useState } from "react";
import { collection, doc, getDoc, serverTimestamp,
         writeBatch, arrayUnion } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatListStore } from "../../lib/chatListStore";
import { useChatStore } from "../../lib/chatStore";

import "../css/AddUser.css";

const AddUser = ({ setAddMode, defaultValue, delay = 3000}) => {

  // Searched-for user. When clicked, opens "Add User" btn
  const [target, setTarget] = useState(null);

  // Set by handleSearch; msg for failed search
  const [searchMsg, setSearchMsg] = useState("");

  // In handleSearch, handleAdd, disallows multiple btn clicks
  const [btnDisabled, setBtnDisabled] = useState(false);

  const { thisUser } = useUserStore();

  // Use to add chat card to ChatList
  const { getChat, updateChat } = useChatListStore();
  
  // Receiver is user in current ChatWindow & not same as target
  // Before adding target & loading new chat, must write data of
  // current chat with receiver
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
    if (username == thisUser.username) {    // Check for Case A
      setTarget(null);
      setSearchMsg("Cannot add yourself");
      setTimeout(() => { setSearchMsg(""); }, delay);
      return;
    }

    setBtnDisabled(true);
    try {
      const foundChat = getChat(username);
      if (foundChat) {                    // Check for Case B
        // 
        loadChat(
          foundChat.chatId, foundChat.user,
          receiver ? doc(db, "userChats", thisUser.username, "chats", receiver.username) : null,
          { pinnedList }
        );
        setAddMode(false);
      }
      else {
        const recvSnap = await getDoc(doc(db, "users", username));

        // Check target username exists, & if so, if target has blocked thisUser
        if (recvSnap.exists()) {
          if (recvSnap.data().blockedUsers.includes(thisUser.username)) {
            setTarget(null);
            setSearchMsg(`${username} has blocked you.`);
            setTimeout(() => { setSearchMsg(""); }, delay);
          }
          else {
            setTarget({...recvSnap.data(), username, });
          }
        }
        else {
          setTarget(null);
          setSearchMsg(`${username} does not have a profile`);
          setTimeout(() => { setSearchMsg(""); }, delay);
        }
      }
    } catch (err) {
      console.log(err);
    }
    finally {
      setBtnDisabled(false);
    }
  };

  // Create chat between thisUser & target. If such chat...
  // 1: Already exists : Copy target's ref & pass copy to thisUser
  // 2: Does not exist : Make new (setDoc) & assign refs to both users
  // Collect chat info & target's user info & render item in ChatList
  const handleAdd = async () => {
    setBtnDisabled(true);

    // thisUser & receiver both have their own receipt in "userChats"
    const thisChatsRef = doc(db, "userChats", thisUser.username);
    const thisChatRef  = doc(thisChatsRef, "chats", target.username);

    const recvChatsRef = doc(db, "userChats", target.username);
    const recvChatRef  = doc(recvChatsRef, "chats", thisUser.username);

    let   chatData, recvChatSnap;
    const batch = writeBatch(db);

    try {
      recvChatSnap = await getDoc(recvChatRef);

      // If chat already exists, thisUser rejoins by copying target's ref
      if (recvChatSnap.exists()) {

        // thisUser copies recv's chat data, with some fields reset
        // Alert recv that they are no longer alone in chat 
        chatData = { ...recvChatSnap.data(), pinnedList : [], alone: false, replied: false };
        batch.set(thisChatRef, chatData);
        batch.update(recvChatRef, { alone: false });
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
          replied: false, // false: Both users are expected to reply
          alone: false,   // false: Neither user is alone in chat
          blocked: false, // false: Neither user has blocked the other
        };

        batch.set(recvChatRef, chatData);
        batch.set(thisChatRef, chatData);
      }

      // Alert target to pull updates for chat with thisUser
      batch.update(doc(db, "users", target.username), {
        pending: arrayUnion(thisUser.username),
      });

      await batch.commit();

      // Fetch target's profile & prepend it to ChatList
      const recvSnap = await getDoc(doc(db, "users", target.username));
      const user = ({...recvSnap.data(), username: target.username });

      updateChat({ ...chatData, user });

      // loadChat writes current chat's pinnedList to database, then load new
      loadChat(
        chatData.chatId, user,
        receiver ? doc(db, "userChats", thisUser.username, "chats", receiver.username) : null,
        { pinnedList }
      );
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
