import { useState } from 'react';
import { doc, getDoc, updateDoc, } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { toast } from "react-toastify";

import upload from "../../lib/upload";
import { useUserStore } from "../../lib/userStore";
import { db } from "../../lib/firebase";

import "../css/UserInfo.css"

const maxBioLength = 75;

// Used in ChatListPanel to show thisUser's profile
const UserInfo = () => {

  const { thisUser, setAvatar } = useUserStore();
  const [bio, setBio] = useState('Bio: Hit Enter to Change');

  // Attached to bio textarea, to write to db on 'Enter' press
  const handleKeyDown = async (event) => {
    if (event.key === 'Enter') {
      // Prevent newline as 'Enter' is used to 'Submit'
      event.preventDefault();

      const thisRef = doc(db, "users", thisUser.username);
      try {
        await updateDoc(thisRef, { bio });
        toast.success("Bio successfully changed!");
      } catch (err) {
        console.log(err);
      }
    }
  };

  // Upload new avatar img, delete old img, update record, setAvatar in local 
  const handleAvatarChange = async (e) => {
    if (e.target.files[0]) {
      try {
        const {downloadUrl, uploadName, date} = await upload("avatars", e.target.files[0]);
        
        const thisSnap = await getDoc(doc(db, "users", thisUser.username));
        await deleteObject(ref(getStorage(), `avatars/${thisSnap.data().avatarName}`));

        await updateDoc(doc(db, "users", thisUser.username), {
          avatar: downloadUrl,
          avatarName: uploadName,
        });
        setAvatar(downloadUrl);
      }
      catch (err) {
        toast.error(err.message);
        console.log(err);
      }
    }
  };
  return (
    <div className='userInfo'>
      <div className="user">
        <label htmlFor="avatar">
          <img title="Click to change" src={thisUser.avatar || "./avatar.png"} alt="" />
        </label>
        <input
          type="file"
          id="avatar"
          style={{ display: "none" }}
          onChange={handleAvatarChange} />
        <span className="username">{thisUser.username}</span>
      </div>
    <textarea
      type="text"
      className="bio"
      value={bio}
      onChange={(event) => setBio(event.target.value)}
      onKeyDown={handleKeyDown}
    />
    </div>
  )
}

export default UserInfo