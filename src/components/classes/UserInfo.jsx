import { useState } from 'react';
import { doc, updateDoc, } from "firebase/firestore";
import { toast } from "react-toastify";

import { useUserStore } from "../../lib/userStore";
import { db } from "../../lib/firebase";

import "../css/UserInfo.css"

const maxBioLength = 75;

// Used in ChatListPanel to show thisUser's profile
const UserInfo = () => {

  const { thisUser } = useUserStore();
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

  return (
    <div className='userInfo'>
      <div className="user">
        <img src={thisUser.avatar || "./avatar.png"} alt="" />
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