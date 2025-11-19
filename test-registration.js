const axios = require('axios');

async function testRegistration() {
  try {
    console.log('Testing registration endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      email: 'test@test.com',
      password: 'testpassword123',
      display_name: 'Test_user'
    }, {
      withCredentials: true,
      timeout: 5000
    });
    
    console.log('✓ Registration successful:', response.data);
  } catch (error) {
    console.error('✗ Registration failed:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('  No response received:', error.message);
    } else {
      console.error('  Error:', error.message);
    }
  }
}

testRegistration();
