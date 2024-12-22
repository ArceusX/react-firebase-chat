import { useEffect, useState, useRef } from "react";
import { onSnapshot, doc, getDoc, getDocs,
         updateDoc, collection } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import { useChatListStore } from "../../lib/chatListStore";
import AddUser from "./AddUser";

import "../css/ChatList.css";

const searchDelay = 300;
const fetchDelay  = 50;

// Used to explain what text being underlined/slashed in chat card means
const quitTitleMsg  = "User has quit chat, but you can still send unread messages";
const blockTitleMsg = "This user has blocked you";

/*
search: 
    searchBar: Input on which to filter chats
    img      : onClick toggles addMode; if True: show <AddUser />

filteredChats: Each chat has div that onClick, fetch & show messages
               in ChatWindow. Each shows avatar, username, & lastMessage
AddUser: Toggle its render by clicking plus/minus img
*/
const ChatList = () => {
  const [addMode, setAddMode] = useState(false);

  // Enable incremental fetching to minimize bandwidth use
  const isFirstRun = useRef(true);

  const { thisUser } = useUserStore();
  const { chats, setChats, updateChat } = useChatListStore();
  let { chatId, receiver, selectChat, setThisUserBlock } = useChatStore();

  const [searchInput, setSearchInput] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);

  // Debounce limits frequency of function calls by delaying call 
  // till delay time passed since last call rather than on each input
  // Filter chats by username, email, lastMessage every {searchDelay}
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchInput === '') {
        setFilteredChats(chats);
      } else {
        setFilteredChats(
          chats.filter(chat => {
            const s = searchInput.toLowerCase();
            return chat.user.username.toLowerCase().includes(s) ||
                   chat.user.email.toLowerCase().includes(s) ||
                   chat.lastMessage.toLowerCase().includes(s) }
          )
        );
      }
    }, searchDelay);

    return () => { clearTimeout(debounceTimeout); };
  }, [searchInput, chats]);
  
  // If isFirstRun, fetch all chats' metadata & populate ChatList
  // Else, fetch only alerts from users who put their name in pending
  // & who recently sent messages/blocks/join rquests
  useEffect(() => {
    const userRef = doc(db, "users", thisUser.username);

    const unSub = onSnapshot(
      userRef,
      async (thisSnap) => {

        const chatsRef = collection(db, "userChats", thisUser.username, "chats");
        let promises;

        if (isFirstRun.current) {
          isFirstRun.current = false;

          const chatsSnap = await getDocs(chatsRef);
          if (!chatsSnap.empty) {

            // For each chatSnap, fetch chat info & chat partner's info
            // For each, merge data, return promise  
            promises = chatsSnap.docs.map((chatSnap) => {
              const item    = chatSnap.data();                 // 2
              const userRef = doc(db, "users", chatSnap.id);   // 3

              // Collect getDoc promises to resolve all in parallel
              return getDoc(userRef).then((userSnap) => {
                const user = { ...userSnap.data(), username: chatSnap.id };
                return { ...item, user };                    // 4
              });
            });
            const chatItems = await Promise.all(promises);
            setChats(chatItems);
          }
        }

        // On later runs, fetch incremental: chat & user info only for
        // user(name)s in pending: those that just sent interactions
        else {
          const pending = thisSnap.data().pending;
          if (!pending.empty) {
            promises = pending.map((sender) => {
              const userRef = doc(db, "users", sender);
              const chatRef = doc(chatsRef, sender);

              return Promise.all(
                [getDoc(userRef), getDoc(chatRef)])
                .then(([userSnap, chatSnap]) => {
                  const user = { ...userSnap.data(), username: sender };
                  const item = chatSnap.data();
                  return { ...item, user };
              });
            });

            // Delay fetch to prevent stale reads & other thread problems
            await new Promise((resolve) => setTimeout(resolve, fetchDelay));

            const chatItems = await Promise.all(promises);

            for (const chatItem of chatItems) {
              updateChat(chatItem, false); // false: chatItem is not deleted
            }

            // If receiver (& ChatWindow is open), set block, disable chatbox 
            receiver = useChatStore.getState().receiver;
            if (receiver) {
              const recvItem = chatItems.find(
                item => receiver.username === item.user.username);
              if (recvItem) setThisUserBlock(recvItem.blocked);
            }
          }
        }

        // Mark all updates as received & executed
        await updateDoc(userRef, { pending: [], });
      },
      (err) => { console.log(err); }
    );

    return () => { unSub(); };
  }, [thisUser.username]);

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
        />
      </div>
      {filteredChats.map((chat) => (
        <div
          className="item"
          key={chat.chatId}
          onClick={() => {
            setAddMode(false);
            selectChat(chat.chatId, chat.user);
          }}
          style={{
            backgroundColor: chat?.replied ? "transparent" : "#82A8FF",
          }} >
        <img
          src={ (chat.user.avatar || "./avatar.png") }
          alt=""
          title={chat.user.email} />
        <div className="texts">
          <span className= {
            chat.hasQuit ? "line-through" : (chat.blocked ? "underline" : "")
          }
          title = {chat.hasQuit ? quitTitleMsg: (chat.blocked ? blockTitleMsg : "")} >
            {chat.user.username}
          </span>
          <p>{chat.lastMessage}</p>
        </div>
        </div>
      ))}

      {addMode &&
      <AddUser setAddMode={setAddMode} defaultValue={searchInput} />}
    </div>
  );
};

export default ChatList;
