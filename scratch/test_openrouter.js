async function testOpenRouter() {
  const apiKey = 'YOUR_API_KEY_HERE';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: 'Say hello' }]
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testOpenRouter();
