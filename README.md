<div align="center">
  
  # 🚀 FileDrop
  
  **Secure, Ephemeral, and Blazingly Fast File Sharing**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Realtime-4ade80?style=flat&logo=supabase)](https://supabase.com/)
  [![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange?style=flat&logo=webrtc)](https://webrtc.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

  <br />

  <p>
    FileDrop is a modern, privacy-first file and text sharing application designed for absolute simplicity. No accounts, no subscriptions, and no tracking. Just instant, secure data transfers across devices.
  </p>

</div>

---

## ✨ Key Features

### 🛡️ Secure & Ephemeral Normal Rooms
- **Custom Room Creation:** Generate random room names or create your own custom named rooms. 
- **Password Protected:** Every room is secured with a password, ensuring only intended recipients can join.
- **Auto-Destructing:** Rooms automatically expire and are permanently wiped from the database after a chosen timeframe (1 to 30 days).
- **Store Text & Files:** Upload large files, images, code snippets, or text clips. Everything syncs in real-time.

### ⚡ Direct Mode (P2P WebRTC)
- **Zero Server Storage:** Share massive, multi-gigabyte files instantly without ever uploading them to a server.
- **No Size Limits:** Files stream directly between browsers over WebRTC. 
- **Maximum Privacy:** When you close the tab, the room vanishes instantly. Absolute privacy guaranteed.
- **Live Transfer Progress:** See real-time upload and download progress bars as chunks are transferred over the network.

### 🎨 Beautiful Modern UI
- **Glassmorphism:** Built with stunning glassmorphic cards, smooth gradients, and interactive animations using Framer Motion.
- **Responsive:** Works perfectly on Desktop, Tablet, and Mobile.
- **Custom Scrollbars:** Immersive design down to the smallest details.

---

## 🛠️ Tech Stack

- **Frontend Framework:** [Next.js 14](https://nextjs.org/) (App Router, React 18)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL & Storage)
- **Realtime Sync:** Supabase Realtime Broadcast Channels
- **P2P Networking:** WebRTC (RTCPeerConnection, RTCDataChannel)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- A [Supabase](https://supabase.com/) account (Free tier is perfectly fine)

### 1. Clone the repository
```bash
git clone https://github.com/deepanshugoel1122/FileDrop.git
cd FileDrop
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabase Setup
You will need to run the `supabase_schema.sql` file provided in the repository inside your Supabase SQL Editor. This will set up the `rooms` table, `files` storage bucket, and appropriate RLS policies for secure ephemeral sharing.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔒 Security & Privacy

FileDrop is built with privacy at its core.
1. **No Accounts:** We do not collect user emails, names, or tracking data.
2. **Password Hashing:** Passwords are mathematically hashed (`SHA-256`) *before* they are sent to the database. The server never knows your plain-text password.
3. **Database Rules:** Strict Row Level Security (RLS) ensures rooms can only be accessed with the correct credentials.
4. **Direct Mode:** Bypasses our backend infrastructure entirely, utilizing secure WebRTC Data Channels.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/deepanshugoel1122/FileDrop/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  Made with ❤️ for the community by Deepanshu Goel.
</div>
