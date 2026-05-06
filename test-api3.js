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
  
  const searchRes = await request({
    hostname: 'whisperbox.koyeb.app',
    path: `/users/search?q=testuser`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('Search Status:', searchRes.status);
  console.log('Search Body:', searchRes.body);
}

test().catch(console.error);
