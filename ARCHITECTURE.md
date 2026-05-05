# WhisperBox - E2EE Secure Messaging App

A secure end-to-end encrypted messaging application built with Next.js, React, and the Web Crypto API. Messages are encrypted on the client-side and the backend never sees plaintext data.

## 🔐 Security Features

- **End-to-End Encryption (E2EE)**: All messages are encrypted before leaving the device
- **RSA-2048 Key Pairs**: Unique keys generated locally for each user
- **AES-256-GCM**: Symmetric encryption for message content
- **IndexedDB Storage**: Private keys stored securely in browser's local storage
- **No Plaintext on Backend**: Server only stores encrypted blobs
- **Zero-Knowledge Architecture**: The server never has access to unencrypted data

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Client)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐  │
│  │ Key Manager  │─────▶│ Crypto Engine│─────▶│ IndexedDB │  │
│  │              │      │              │      │  (Vault)  │  │
│  │ • Generate   │      │ • Encrypt    │      │           │  │
│  │ • Export     │      │ • Decrypt    │      │ Private   │  │
│  │ • Store      │      │ • Compress   │      │ Keys Only │  │
│  └──────────────┘      └──────────────┘      └───────────┘  │
│         △                      △                              │
│         │                      │                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         UI Components (React)                        │   │
│  │ ┌─────────────────┐  ┌──────────────┐               │   │
│  │ │  Onboarding     │  │  SendMessage │  ┌─────────┐  │   │
│  │ │  (Key Gen)      │  │  (Encrypt)   │  │  Inbox  │  │   │
│  │ └─────────────────┘  └──────────────┘  │(Decrypt)│  │   │
│  └──────────────────────────────────────────┴─────────┴──┘  │
│         △ HTTP/HTTPS △                                       │
└─────────┼─────────────┼───────────────────────────────────────┘
          │             │
       Fetch           Fetch
       Plain           Encrypted
       Text            Blob
          │             │
    ┌─────▼─────────────▼──────────────────────────────────┐
    │            Backend (Zero-Knowledge)                   │
    ├────────────────────────────────────────────────────────┤
    │  ┌──────────────┐    ┌──────────────┐                 │
    │  │  User Auth   │    │ Public Key   │                 │
    │  │              │    │ Storage      │                 │
    │  │ • Register   │    │              │                 │
    │  │ • Validate   │    │ • Store Keys │                 │
    │  └──────────────┘    │ • Retrieve   │                 │
    │         △            └──────────────┘                 │
    │         │                    △                         │
    │  ┌──────────────────────────────┐                     │
    │  │   Message Storage (DB)       │                     │
    │  │                              │                     │
    │  │ • Ciphertext Only            │                     │
    │  │ • Sender/Recipient IDs       │                     │
    │  │ • Timestamps                 │                     │
    │  │ • Delivery Status            │                     │
    │  └──────────────────────────────┘                     │
    └────────────────────────────────────────────────────────┘
```

## 🔄 Encryption Flow

### Sending a Message

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Inputs Message                                      │
│    "Hello, Secret Message!"                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch Recipient's Public Key from Backend               │
│    GET /api/users/public-key/alice                         │
│    Response: {public_key: "MIIBIjANBg..."}                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Generate Session AES-256 Key                            │
│    • Unique key per message                                │
│    • Random 96-bit IV                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Encrypt Message with AES-256-GCM                        │
│    Input: "Hello, Secret Message!"                         │
│    Output: [ciphertext]                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Encrypt AES Key for Both Parties (RSA-OAEP)            │
│    • EncryptedKey_Recipient = RSA(Recipient_PublicKey)     │
│    • EncryptedKey_Sender = RSA(Sender_PublicKey)          │
│                                                             │
│    Why Both? Sender needs to read their sent messages      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Bundle and Encode                                       │
│    Packet: [IV] + [EncKey_R] + [EncKey_S] + [Ciphertext]  │
│    Output: Base64-encoded bundle                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Send to Backend                                         │
│    POST /api/messages/send                                 │
│    Body: {sender, recipient, message: base64Blob}         │
│                                                             │
│    ✅ Backend stores only encrypted blob                   │
│    ❌ Backend cannot read the content                      │
└─────────────────────────────────────────────────────────────┘
```

### Receiving a Message

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Fetch Encrypted Messages from Backend                   │
│    GET /api/messages/inbox/alice                           │
│    Response: [{sender, message: base64Blob, ...}, ...]    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Retrieve Private Key from IndexedDB                      │
│    Only exists locally - never sent to server              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Unpack the Encrypted Bundle                             │
│    Extract: [IV] + [EncKey_Recipient] + [EncKey_Sender]   │
│             + [Ciphertext]                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Decrypt AES Key with Private Key (RSA-OAEP)            │
│    AES_Key = RSA_Decrypt(Private_Key, EncKey_Recipient)   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Decrypt Message with AES-GCM                            │
│    Plaintext = AES_GCM_Decrypt(AES_Key, IV, Ciphertext)   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Display Message                                         │
│    "Hello, Secret Message!" 🔓 ✅                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Management

### Frontend Key Storage

```
Device Storage:
├── IndexedDB (Vault)
│   └── private_key: CryptoKey {
│       name: "RSA-OAEP",
│       type: "private",
│       extractable: false,  ⚠️ CRITICAL: Cannot be exported
│       usages: ["encrypt", "decrypt"]
│   }
│
├── localStorage
│   └── whisper_username: "alice"
│   └── (Encrypted public key cached for performance)
│
└── Memory (Session Only)
    └── Sender Public Key (loaded on demand from server)
```

### Backend Storage

```
Database:
├── users
│   ├── id: UUID
│   ├── username: "alice"
│   ├── public_key: "MIIBIjANBgkq..." (Base64 SPKI Format)
│   └── created_at: timestamp
│
└── messages
    ├── id: UUID
    ├── sender_id: UUID
    ├── recipient_id: UUID
    ├── message: "y7uJ3kL9mN2..." (Encrypted Base64)
    ├── created_at: timestamp
    └── delivered: boolean
```

## 🛡️ Security Properties

### ✅ Achieved

- **Confidentiality**: Only sender and recipient can read messages
- **Authentication**: Users are identified by unique usernames
- **No Plaintext Leaks**: Messages encrypted before transmission
- **Forward Secrecy (Partial)**: Each message uses a unique AES key
- **Key Isolation**: Private keys never leave the device
- **Replay Attack Resistance**: Each message has unique IV and AES key

### ⚠️ Limitations & Considerations

1. **No Perfect Forward Secrecy**: If recipient's private key is compromised, old messages can be decrypted
   - Mitigation: Rotate keys periodically by creating new accounts

2. **No Message Integrity Signatures**: Cannot verify message authenticity
   - Mitigation: Could add HMAC or sign with sender's private key

3. **Metadata Leaks**: Backend sees who is messaging whom
   - Mitigation: Could implement recipient-agnostic message queues

4. **Single Device Limitation**: Private key tied to one device
   - Mitigation: Cloud backup with encryption layer

5. **No Out-of-Band Verification**: Cannot verify public keys are authentic
   - Mitigation: Could implement trust-on-first-use or key fingerprints

6. **Browser-Based Vulnerabilities**: Subject to XSS, CSRF, malicious browser extensions
   - Mitigation: CSP headers, security headers, code review

## 📦 Packet Format

```
Message Packet Structure (Total Size: 524+ bytes)

┌────────────────────────────────────────────────────────────┐
│ Byte Range │ Content                   │ Size              │
├────────────────────────────────────────────────────────────┤
│ 0-11       │ Initialization Vector     │ 12 bytes          │
│            │ (IV for AES-GCM)          │                   │
├────────────────────────────────────────────────────────────┤
│ 12-267     │ Encrypted AES Key         │ 256 bytes         │
│            │ (For Recipient)           │ (RSA-2048 = 256)  │
│            │ Encrypted with Recipient  │                   │
│            │ Public Key                │                   │
├────────────────────────────────────────────────────────────┤
│ 268-523    │ Encrypted AES Key         │ 256 bytes         │
│            │ (For Sender)              │ (RSA-2048 = 256)  │
│            │ Encrypted with Sender     │                   │
│            │ Public Key                │                   │
├────────────────────────────────────────────────────────────┤
│ 524+       │ Encrypted Message         │ Variable          │
│            │ (AES-GCM ciphertext)      │ (Message length   │
│            │ + 16-byte auth tag        │  + 16 bytes)      │
└────────────────────────────────────────────────────────────┘

Total Overhead: ~524 bytes per message
```

## 🚀 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Crypto**: Web Crypto API (Browser Native)
- **Storage**: IndexedDB (IDB library)
- **UI**: Tailwind CSS, Lucide Icons
- **Backend API**: REST (Whisperbox)
- **Build**: Vite (via Next.js)

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd e2ee-app

# Install dependencies
npm install

# Configure backend URL (if needed)
# Edit .env.local and set NEXT_PUBLIC_API_BASE_URL

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] User Registration
  - [ ] Generate key pair successfully
  - [ ] Store private key in IndexedDB
  - [ ] Register with backend
  - [ ] Cache username in localStorage

- [ ] Sending Messages
  - [ ] Fetch recipient's public key
  - [ ] Encrypt message locally
  - [ ] Send encrypted blob to backend
  - [ ] Display success message

- [ ] Receiving Messages
  - [ ] Fetch inbox messages
  - [ ] Retrieve private key from IndexedDB
  - [ ] Decrypt messages successfully
  - [ ] Handle decryption errors gracefully

- [ ] Security
  - [ ] No plaintext visible in network tab
  - [ ] Private key not logged or exposed
  - [ ] Error messages don't leak sensitive info

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user with public key

### Users
- `GET /api/users/public-key/{username}` - Fetch user's public key

### Messages
- `POST /api/messages/send` - Send encrypted message
- `GET /api/messages/inbox/{username}` - Fetch user's encrypted messages

## 🐛 Known Issues

1. **Slow Key Generation**: RSA-2048 key generation takes 5-10 seconds on slower devices
2. **Large Message Packets**: Encrypted packets are significantly larger than plaintext
3. **No Message Deletion**: Messages persist on backend indefinitely
4. **No User Recovery**: Lost device = lost keys (cannot recover account)

## 🔮 Future Improvements

- [ ] Group messaging with per-recipient encryption
- [ ] Message deletion (client confirms, backend deletes after N days)
- [ ] Key rotation with key versioning
- [ ] Message reactions and reactions encryption
- [ ] Audio/video call encryption (DTLS-SRTP)
- [ ] Offline message queuing
- [ ] Message read receipts
- [ ] Typing indicators (encrypted metadata)
- [ ] User presence (anonymized)

## 📄 License

This project is part of the HNG Stage 4B Frontend task.

## 🔗 Resources

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Whisperbox API Docs](https://whisperbox.koyeb.app/docs)
