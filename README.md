# React Chat App

This is a real-time chat app built with **React**, **Firebase**, and several other libraries.
## Live Demo

View the app live here: [React Chat App](https://react-chat-e1bd4.web.app/)

## Features

- **Real-time chat**: Built on **Firebase Firestore**, so messages are updated in real-time.
- **User authentication**: Secure login and sign-up with **Firebase Authentication**.
- **Emoji picker**: Add emojis to your messages using the **emoji-picker-react** library.
- **Relative time formatting**: Timestamps are displayed as relative times (e.g., "5 minutes ago") using **timeago.js**.
- **State management**: **Zustand** is used to manage states
- **Toast notifications**: **react-toastify** provides notifications for sending messages

## Technologies Used

- **React**: A popular JavaScript library for building user interfaces.
- **Firebase**: Used for real-time database (Firestore) and user authentication.
- **emoji-picker-react**: A customizable emoji picker for React applications.
- **timeago.js**: Displays relative timestamps like "5 minutes ago" for message times.
- **react-toastify**: A library for displaying non-intrusive toast notifications.
- **Zustand**: A minimal state management solution for React.

## Project Structure
#### Firestore Database Collections/Tables

| Collection | Description |
|-----------|-------------|
| chats | Stores content of chat messages, with random chatId as document id |
| userChats | Stores references to chats involving a user, with receiver's email as each chat's id |
| users | Stores details such as createdAt, blockedUsers, using user's email as document id |

#### Database Workflow
1. From **users**, get email of target user satisfying search condition, eg. username match
2. A. From **userChats**, go to target email's document. Each document has **chats** subcollection
   B. From **chats** subcollection, get chatId (field) of each chat involving target user
3. From **chats**, get content of messages (array field) named by each chatId

## Start

1. **Run Locally**

```bash
npm install # Install Dependencies
npm run dev # App will run on http://localhost:5173/
```

2. **Deploy on Firebase**

```bash
npm run build
# Install if you haven't already. Must choose tools you want to use
npm install -g firebase-tools
firebase login
firebase deploy
```