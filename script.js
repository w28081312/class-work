let apiKey = localStorage.getItem('geminiApiKey') || '';
let chatHistory = [];

// 初始化時檢查 API Key
document.addEventListener('DOMContentLoaded', () => {
  updateKeyStatus();
  if (apiKey) {
    document.getElementById('apiKey').value = apiKey;
    // 檢查可用的模型
    listAvailableModels();
  }
});

function updateKeyStatus() {
  const status = document.getElementById('keyStatus');
  if (apiKey) {
    status.textContent = 'API Key 已設定';
    status.style.color = '#4caf50';
  } else {
    status.textContent = '請設定 API Key';
    status.style.color = '#f44336';
  }
}

function saveKey() {
  const input = document.getElementById('apiKey');
  const key = input.value.trim();
  if (key) {
    apiKey = key;
    localStorage.setItem('geminiApiKey', key);
    updateKeyStatus();
    showError('API Key 已儲存！', 'success');
  } else {
    showError('請輸入有效的 API Key。', 'error');
  }
}

function clearChat() {
  const chatBox = document.getElementById('chat');
  chatBox.innerHTML = '';
  chatHistory = [];
  showError('對話已清除', 'success');
}

function showError(message, type = 'error') {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  errorDiv.style.backgroundColor = type === 'error' ? '#ffebee' : '#e8f5e9';
  errorDiv.style.color = type === 'error' ? '#c62828' : '#2e7d32';
  
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 3000);
}

async function listAvailableModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();
    console.log('可用模型:', data);
    
    if (data.models && data.models.length > 0) {
      const modelNames = data.models.map(model => model.name).join(', ');
      console.log('模型列表:', modelNames);
    }
  } catch (err) {
    console.error('獲取模型列表失敗:', err);
  }
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const chatBox = document.getElementById('chat');
  const message = input.value.trim();

  if (!message) {
    showError('請輸入訊息。', 'error');
    return;
  }

  if (!apiKey) {
    showError('請先設定 API Key。', 'error');
    return;
  }

  addMessage(message, true);
  chatHistory.push({ role: 'user', content: message });
  input.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading';
  loadingDiv.style.display = 'block';
  chatBox.appendChild(loadingDiv);

  try {
    console.log('發送請求到 Gemini API...');
    console.log('API Key:', apiKey);
    
    const requestBody = {
      contents: [{
        parts: [{ text: message }]
      }]
    };
    
    console.log('請求內容:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('收到回應，狀態碼:', response.status);
    const data = await response.json();
    console.log('回應內容:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      const errorMessage = data.error?.message || `HTTP error! status: ${response.status}`;
      console.error('API 錯誤:', errorMessage);
      throw new Error(errorMessage);
    }

    loadingDiv.remove();

    if (data.candidates && data.candidates.length > 0) {
      const reply = data.candidates[0].content.parts[0].text;
      addMessage(reply, false);
      chatHistory.push({ role: 'model', content: reply });
    } else {
      console.error('沒有候選回應:', data);
      showError('無法取得 Gemini 回覆', 'error');
    }
  } catch (err) {
    loadingDiv.remove();
    console.error('完整錯誤訊息:', err);
    console.error('錯誤堆疊:', err.stack);
    showError(`發送失敗：${err.message}`, 'error');
  }
}

function addMessage(text, isUser = false) {
  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user' : 'ai'}`;
  div.textContent = text;
  document.getElementById('chat').appendChild(div);
  document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
}
