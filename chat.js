const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const messages = document.getElementById("messages");

sendBtn.addEventListener("click", () => {
  const text = userInput.value.trim();
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.textContent = `You: ${text}`;
  userMsg.style.textAlign = "right";
  messages.appendChild(userMsg);

  userInput.value = "";

  const aiMsg = document.createElement("div");
  aiMsg.textContent = `AI: Hello! You typed "${text}"`;
  aiMsg.style.textAlign = "left";
  messages.appendChild(aiMsg);

  messages.scrollTop = messages.scrollHeight;
});
