async function listGeminiModels() {
  const apiKey = 'YOUR_API_KEY_HERE';
  const url = 'https://openrouter.ai/api/v1/models';
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const data = await response.json();
    const geminiModels = data.data.filter(m => m.id.toLowerCase().includes('gemini'));
    console.log(geminiModels.map(m => m.id));
  } catch (error) {
    console.error("List failed:", error);
  }
}

listGeminiModels();
