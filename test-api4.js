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
  const alice = 'alice_' + Date.now();
  const bob = 'bob_' + Date.now();
  
  const aliceRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: alice, display_name: alice, password: 'password123',
    public_key: 'testkeyA', wrapped_private_key: 'wrappedA', pbkdf2_salt: 'saltA'
  });
  const aliceData = JSON.parse(aliceRes.body);
  
  const bobRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: bob, display_name: bob, password: 'password123',
    public_key: 'testkeyB', wrapped_private_key: 'wrappedB', pbkdf2_salt: 'saltB'
  });
  const bobData = JSON.parse(bobRes.body);
  
  await request({
    hostname: 'whisperbox.koyeb.app',
    path: `/messages`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aliceData.access_token}` }
  }, {
    to: bobData.user.id,
    payload: {
      encrypted_key: 'key1',
      encrypted_key_for_self: 'key2',
      ciphertext: 'cipher',
      iv: 'iv123'
    }
  });
  
  const convRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: `/conversations`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${aliceData.access_token}` }
  });
  
  console.log('Conversations Response:', convRes.body);
}

test().catch(console.error);
