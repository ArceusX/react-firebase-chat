import { collection, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { useState } from "react";
import { toast } from "react-toastify";
import {createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile} 
from "firebase/auth";
import { doc, setDoc, getDoc, writeBatch } from "firebase/firestore";

import upload from "../../lib/upload";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";

import "../css/Login.css";

// Use: Check if username has char not allowed for use in Firestore key
// For char in key, check if it exists in charsSet.
// Thru hashing, set checks match in O(1) time, compared to Array's O(n) 
function isInValidKey(key) {
  const charsSet = new Set(["@", ".", "/", "\\", "\0", "\n", "\r", "\t", "~", "*", "[", "]", "#", "%"]);
  return [...key].some(disallowed => charsSet.has(disallowed));
}

const Login = () => {
  const { thisUser, fetchUserData } = useUserStore();

  // To disable clicking Login & Register buttons multiple times
  const [loading, setLoading] = useState(false);

  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });

  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  // If usual checks pass (no blank field, passwords match,
  // username & email are not taken), create documents in db
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      let { username, email, password, rePassword } = Object.fromEntries(formData);

      username = username.trim(), email = email.trim();
      const emptyFields = [];
      if (!username) emptyFields.push("username");
      if (!email) emptyFields.push("email");
      if (!password) emptyFields.push("password");
      if (!avatar.file) emptyFields.push("avatar");
      if (emptyFields.length > 0) {
        return toast.warn(`These fields are empty: ${emptyFields.join(", ")}.`);
      }
      if (isInvalidUsername(username)) {
        return toast.warn("Your username contains disallowed characters");
      }
      if (rePassword !== password) {
        return toast.warn('The re-entered password does not match');
      }

      const userRef = doc(db, "users", username);
      if ((await getDoc(userRef)).exists()) {
        return toast.warn("This username is already in use");
      }

      const profile = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(profile.user, {
        displayName: username,
      });
      const {downloadUrl, uploadName, date} = await upload("avatars", avatar.file);

      const batch = writeBatch(db);

      batch.set(doc(db, "users", username), {
        email,
        avatar: downloadUrl,
        avatarName: uploadName,
        bio: "",
        uid: profile.user.uid,
        blockedUsers: [],
        createdAt: serverTimestamp(),
        pending: [],
      });
      batch.set(doc(db, "userChats", username), {});
      batch.set(doc(db, 'emails', email), { username });

      await batch.commit();

      toast.success("Account created! Login now!");
    }
    catch (err) {
      if (err.code === "auth/email-already-in-use") {
        return toast.warn("This email is already in use");
      }
      toast.error(err.message);
      console.log(err);
    } 

    finally { setLoading(false); }
  };

  // signInWithEmailAndPassword calls onAuthStateChanged in App to fetchUserData
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // fetch only if onAuthStateChanged in App hasn't
      if (!thisUser) await fetchUserData(cred.user.displayName);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="item">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}> {loading ? "Loading" : "Sign In"}</button>
        </form>
      </div>
      <div className="separator"></div>
      <div className="item">
        <h2>Create Account</h2>
        <form onSubmit={handleRegister}>
          <label htmlFor="avatar">
            <img src={avatar.url || "./avatar.png"} alt="" />
            Upload Avatar
          </label>
          <input
            type="file"
            id="avatar"
            style={{ display: "none" }}
            onChange={handleAvatar} />
          <input type="text" placeholder="Username" name="username" />
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <input type="password" placeholder="Re-Enter Password" name="rePassword" />
          <button disabled={loading}> {loading ? "Registering" : "Sign Up"} </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
