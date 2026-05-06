const https = require('https');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  const username = 'testuser_' + Date.now();
  console.log('Registering', username);
  
  const regRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username,
    display_name: username,
    password: 'password123',
    public_key: 'testkey',
    wrapped_private_key: 'wrapped',
    pbkdf2_salt: 'salt'
  });
  
  const regData = JSON.parse(regRes.body);
  const token = regData.access_token;
  const userId = regData.user.id;
  
  const postRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: `/messages`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    to: userId,
    payload: {
      encrypted_key: 'key1',
      encrypted_key_for_self: 'key2',
      ciphertext: 'cipher',
      iv: 'iv123'
    }
  });
  console.log('Post Status:', postRes.status);
  console.log('Post Body:', postRes.body);

  const msgRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: `/conversations/${userId}/messages`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('Messages Response:', msgRes.body);
}

test().catch(console.error);
