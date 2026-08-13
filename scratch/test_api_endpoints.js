import axios from 'axios';

async function test() {
  const loginUrl = 'http://localhost:8080/api/auth/login';
  console.log('Logging in to:', loginUrl);
  
  try {
    const loginRes = await axios.post(loginUrl, {
      email: 'task.literaturechronicle@gmail.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in! Token obtained.');
    
    const apiClient = axios.create({
      baseURL: 'http://localhost:8080/api',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const endpoints = [
      { name: 'books', url: '/books', params: { limit: 100000 } },
      { name: 'authors', url: '/auth/authors', params: { limit: 100000 } },
      { name: 'platforms', url: '/platforms' },
      { name: 'withdrawals', url: '/withdrawals' },
      { name: 'sales', url: '/sales', params: { limit: 100000 } },
      { name: 'royalties', url: '/royalties', params: { limit: 100000 } }
    ];
    
    console.log('Testing endpoints...');
    for (const ep of endpoints) {
      try {
        console.log(`Calling ${ep.name} (${ep.url})...`);
        const start = Date.now();
        const res = await apiClient.get(ep.url, { params: ep.params });
        const data = res.data.data || res.data || [];
        console.log(`  ${ep.name} SUCCESS: status=${res.status}, items=${Array.isArray(data) ? data.length : 'not an array'}, time=${Date.now() - start}ms`);
      } catch (err) {
        console.error(`  ${ep.name} FAILED: status=${err.response?.status}, message=${err.response?.data?.message || err.message}`);
      }
    }
  } catch (err) {
    console.error('Login failed:', err.response?.data || err.message);
  }
}

test();
