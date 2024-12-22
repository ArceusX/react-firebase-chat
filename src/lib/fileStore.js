// import { create } from "zustand";

// const toLocalTime = (now) => {
//   const options = { month: "short" }; // Short month fileName (e.g., Dec)
//   const month = new Intl.DateTimeFormat("en-US", options).format(now);
//   const day = now.getDate().toString().padStart(2, "0"); // Zero-padded day
//   const year = now.getFullYear();
//   const hours = now.getHours().toString().padStart(2, "0"); // Zero-padded hour
//   const minutes = now.getMinutes().toString().padStart(2, "0"); // Zero-padded minutes

//   return `${month} ${day} ${year} ${hours}:${minutes}`;
// };

// export const useFileStore = create((set) => ({
//   fileOwner: null,
//   fileName: null,         
//   uploadDate: null,
//   fileUrl: null,  

//   setFile: (fileOwner, fileName, uploadDate, fileUrl) => {
//     set({
//       fileOwner: fileOwner,
//       fileName: fileName,           
//       uploadDate: toLocalTime(uploadDate),   
//       fileUrl: fileUrl,      
//     });
//   },
//   resetFile: () => {
//     set({
//       fileOwner: null,
//       fileName: null,         
//       uploadDate: null,
//       fileUrl: null,  
//     });
//   }
// }));
