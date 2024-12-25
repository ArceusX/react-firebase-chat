import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

const upload = async (path, file) => {
  const date = new Date();
  // Make string valid for file name
  const fixed = date.toISOString().replace(/[:.]/g, "-");
  const uploadName = `${fixed}_${file.name}`;
  const storageRef = ref(storage, `${path}/${uploadName}`);
  
  try {
    const snap = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snap.ref);
    return {downloadUrl, uploadName, date};
  } catch (error) {
    throw error.code;
  }
};

export default upload;
