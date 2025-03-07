# React Chat App
This is a real-time chat app built with **React**, **Zustand**, & **Firebase**

## Live Demo

View the app live here: [React Chat App](https://react-chat-e1bd4.web.app/)

## Features
- Data is fetched & updated incrementally. Rather than all data being fetched, which is costly,
only data that last changed is. eg., Only new messages rather than all messages ever received
- Block feature that disables chatting until the block is lifted
- Pin a comment to save & effortless scroll to it. Pins are saved in database
- Users can upload an avatar image and write a bio
- Users can send files, images, & emojis

## Technologies Used

- **Database**: Built on **Firebase Firestore**, for real-time updating of messages
- **User authentication**: Managed login and sign-up by **Firebase Authentication**.
- **Emoji Picker**: Supported by **emoji-picker-react** .
- **Relative time formatting**: Display timestamps in relative times (e.g., "1 minute ago") with **timeago.js**.
- **State management**: Manage states across components with **Zustand**
- **Toast notifications**: Pop-up notifications with **react-toastify** 

## Project Structure
#### Firestore Database Collections/Tables

| Collection | Description |
|-----------|-------------|
| chats | Stores content of chat messages, with random chatId as document id |
| userChats | Stores references to chats involving a user, with receiver's username as each chat's id |
| users | Stores details such as createdAt, blockedUsers, using user's username as document id |

#### Database Workflow
1. A. From **users**, get a user's username that matches a target
   B. From **pending** field, get usernames of users who sent a message and put their name
2. A. From **userChats**, go to target username's document, then to **chats** subcollection
   B. From **chats** subcollection, get chatId of each chat for senders' username in 1B
3. From **chats**, get content of messages (array field) named by each chatId in 2B.

## Start

1. **Deploy on Firebase (Only Need to Run Once)**

```bash
npm install -g firebase-tools # Enable Firebase commands in cmd such as login, deploy
firebase login
firebase init # Select which services to use. Create configuration files like firebase.json
npm install firebase # Enable importing Firebase library in code
npm run build # Build optimized build folder before deploying to Firebase
firebase deploy
```
2. **Run Locally**

```bash
npm install # Install Dependencies
npm run dev # App will run on http://localhost:5173/
```

![Demo3](https://github.com/ArceusX/react-firebase-chat/blob/main/demos/demo3.PNG)
![Demo2](https://github.com/ArceusX/react-firebase-chat/blob/main/demos/demo2.PNG)
![Demo1](https://github.com/ArceusX/react-firebase-chat/blob/main/demos/demo1.PNG)