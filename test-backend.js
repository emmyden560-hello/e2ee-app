const crypto = require('crypto');

async function test() {
  const BASE_URL = 'https://whisperbox.koyeb.app';
  
  // 1. Register user 1
  const user1 = 'testuser1_' + Date.now();
  const res1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: user1,
      display_name: 'Test User 1',
      password: 'password123',
      public_key: 'b64pubkey1',
      wrapped_private_key: 'b64privkey1',
      pbkdf2_salt: 'salt1'
    })
  });
  console.log('User 1 register:', res1.status, await res1.text());

  // 2. Register user 2
  const user2 = 'testuser2_' + Date.now();
  const res2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: user2,
      display_name: 'Test User 2',
      password: 'password123',
      public_key: 'b64pubkey2',
      wrapped_private_key: 'b64privkey2',
      pbkdf2_salt: 'salt2'
    })
  });
  console.log('User 2 register:', res2.status, await res2.text());

  // 3. Send message from user1 to user2
  const res3 = await fetch(`${BASE_URL}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: user1,
      recipient: user2,
      message: 'b64encryptedmessage'
    })
  });
  console.log('Send message:', res3.status, await res3.text());
}

test().catch(console.error);
