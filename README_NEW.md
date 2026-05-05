# WhisperBox - End-to-End Encrypted Messaging App

A secure messaging application with client-side end-to-end encryption using Web Crypto API. The backend never sees plaintext data.

**Backend API**: https://whisperbox.koyeb.app/  
**API Docs**: https://whisperbox.koyeb.app/docs

---

## 🔐 Security Overview

- ✅ **E2EE Encryption**: All messages encrypted before leaving your device
- ✅ **RSA-2048**: Unique key pair per user
- ✅ **AES-256-GCM**: Message content encryption
- ✅ **IndexedDB**: Private keys stay on device (never extracted)
- ✅ **Zero-Knowledge**: Backend stores ciphertext only
- ✅ **No Plaintext**: Complete separation of concerns

[📖 Full Security Architecture →](./ARCHITECTURE.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎯 How It Works

### Registration
1. Enter username
2. Generate RSA-2048 key pair (in browser)
3. Store private key in IndexedDB (non-extractable)
4. Send public key to backend
5. Done! ✅

### Sending a Message
1. Fetch recipient's public key
2. Generate ephemeral AES-256 key
3. Encrypt message with AES-GCM
4. Wrap AES key for sender & recipient (RSA)
5. Send encrypted bundle to backend

### Receiving a Message
1. Fetch encrypted messages from backend
2. Retrieve private key from IndexedDB
3. Decrypt AES key with private key
4. Decrypt message content
5. Display plaintext (locally only!)

---

## 📦 Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main app
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Styles
│
├── components/
│   ├── Onboarding.tsx     # Registration
│   ├── SendMessage.tsx    # Send encrypted messages
│   └── Inbox.tsx          # Receive & decrypt messages
│
├── lib/
│   ├── api.ts             # Backend API
│   ├── crypto.ts          # Encryption/decryption
│   ├── auth.ts            # Account setup
│   └── storage.ts         # IndexedDB
│
└── types/
    └── index.ts           # TypeScript definitions
```

---

## 🛡️ Security

### Protected
✅ Message confidentiality  
✅ User privacy (no plaintext storage)  
✅ Key security (private keys never exported)  
✅ Message integrity (AES-GCM auth)  

### Not Protected
⚠️ Metadata (server knows who messages whom)  
⚠️ Perfect forward secrecy  
⚠️ No user authentication (first-use trust)  

[Full Details →](./ARCHITECTURE.md)

---

## 📚 Tech Stack

- **Next.js 16** - React framework
- **React 19** - UI
- **TypeScript** - Type safety
- **Web Crypto API** - Native encryption
- **IndexedDB** - Client-side storage
- **Tailwind CSS** - Styling

---

## 🚀 Deployment

### Vercel

```bash
# Set environment variable
NEXT_PUBLIC_API_BASE_URL=https://whisperbox.koyeb.app/api

# Deploy
vercel
```

---

## 📄 Encryption Details

**Key Generation**
- Algorithm: RSA-OAEP
- Key Size: 2048 bits
- Hash: SHA-256

**Message Encryption**
- Content: AES-256-GCM
- IV: 96-bit random
- Auth: 128-bit tag

**Packet Format**
```
[IV 12B] + [EncKey_Recipient 256B] + [EncKey_Sender 256B] + [Ciphertext]
```

---

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete technical documentation.

**Built with ❤️ and cryptography** 🔐
