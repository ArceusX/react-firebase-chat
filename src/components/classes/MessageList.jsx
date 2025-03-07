import { useEffect, useRef } from "react";
import { format } from "timeago.js";
import { doc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";

import "../css/MessageList.css";

// file: Show attached image or file (as alt) 
// alt : icon to show if file is not image (not jpg, png, etc)
// refs: Need to populate refs to enable scroll in UserPanel pins 
const MessageList = ({ file, alt, refs }) => {

  const { thisUser } = useUserStore();

  let { receiver, messages, pinnedList, togglePin } = useChatStore();

  const endRef = useRef(null);   // Ref to bottom of component

  // Auto scroll to bottom when messages change (new message added)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Before app is unloaded (eg closed, refreshed), push pinnedList to db
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      (async () => {
        if (receiver) {
          await updateDoc(
            doc(db, "userChats", thisUser.username, "chats", receiver.username),
            { pinnedList: useChatStore.getState().pinnedList }
          );
        }
      })();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handlePin = (index) => {
    togglePin(index);
  };

  // Each message's pin-button is visible on hover or while pinned
  // Use "own" class to show thisUser's message on right (flex-end)
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div
          className={
            message.sender === thisUser.username ? "message own" : "message"
          }
          key={index}
          ref={(el) => { refs.current[index] = el; }} >
          <div className="texts">
            {message.file && (
              <>
                <a href={message.file}>
                  <img
                    alt=""
                    className={message.hasImg ? "" : "notImage"}
                    src={message.hasImg ? message.file : alt}
                  />
                </a>
                <span className="fileName">{message.fileName}</span>
              </>
            )}

            {message.text && <p>{message.text}</p>}
            <span title={message.createdAt.toDate()}>
              {format(message.createdAt.toDate())}
            </span>
          </div>
          <div className={`pin-button ${pinnedList.includes(index) ? 'pinned' : ''}`}
               onClick={() => handlePin(index)}></div>
        </div>
      ))}
      {file.file && (
        <div className="message own">
          <div className="texts">
            <img alt=""
            className={file.url ? "" : "notImage"}
            src={file.url ? file.url : alt} />

            {!file.url && <span className="fileName">{file.name}</span>}
          </div>
        </div>
      )}
      <div ref={endRef} ></div>
    </div>
  );
};

export default MessageList;
