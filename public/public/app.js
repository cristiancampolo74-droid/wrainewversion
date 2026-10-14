const conversation = document.getElementById("conversation");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const voiceButton = document.getElementById("voice-button");
const voiceStatus = document.getElementById("voice-status");
const connectionLabel = document.getElementById("connection-label");
const statusDot = document.querySelector(".status-dot");
const clearButton = document.getElementById("clear-button");
const errorMessage = document.getElementById("error-message");

let isSending = false;
let recognition = null;
let isListening = false;
let speechGeneration = 0;

const initialConversation = conversation.innerHTML;

function showError(message) {
errorMessage.textContent = message;
errorMessage.classList.add("visible");
}

function clearError() {
errorMessage.textContent = "";
errorMessage.classList.remove("visible");
}

function setConnectionStatus(online, label) {
connectionLabel.textContent = label;
statusDot.classList.toggle("online", online);
}

function setVoiceStatus(message) {
voiceStatus.textContent = message;
}

function createMessage(text, sender) {
const article = document.createElement("article");
article.className = `chat-message ${sender}`;

const avatar = document.createElement("div");
avatar.className = "message-avatar";
avatar.textContent = sender === "user" ? "TU" : "WR";

const content = document.createElement("div");
content.className = "message-content";

const author = document.createElement("span");
author.className = "message-author";
author.textContent = sender === "user" ? "TU" : "WR AI";

if (sender !== "user") {
const badge = document.createElement("span");
badge.textContent = "ASSISTANT";
author.appendChild(badge);
}

const paragraph = document.createElement("p");
paragraph.textContent = text;

const time = document.createElement("span");
time.className = "message-time";
time.textContent = new Date().toLocaleTimeString("it-IT", {
hour: "2-digit",
minute: "2-digit"
});

content.append(author, paragraph, time);
article.append(avatar, content);
conversation.appendChild(article);

conversation.scrollTop = conversation.scrollHeight;

return article;
}

async function checkServer() {
try {
const response = await fetch("/api/health");
if (!response.ok) throw new Error("Server non disponibile");

```
const data = await response.json();

if (data.status === "ok") {
  setConnectionStatus(true, "SERVER CONNESSO");
} else {
  setConnectionStatus(false, "SERVER NON DISPONIBILE");
}
```

} catch {
setConnectionStatus(false, "SERVER NON RAGGIUNGIBILE");
}
}

async function sendMessage(message) {
const text = message.trim();

if (!text || isSending) return;

clearError();
stopSpeaking();

createMessage(text, "user");
messageInput.value = "";

isSending = true;
sendButton.disabled = true;
messageInput.disabled = true;
setVoiceStatus("ELABORAZIONE IN CORSO");

const loadingMessage = createMessage("Sto elaborando la tua domanda...", "assistant");

try {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 45000);

```
let response;

try {
  response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: text }),
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}

const data = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(data.error || `Errore del server (${response.status}).`);
}

if (typeof data.answer !== "string" || !data.answer.trim()) {
  throw new Error("Il server non ha restituito una risposta valida.");
}

loadingMessage.remove();

createMessage(data.answer, "assistant");

setVoiceStatus("RISPOSTA RICEVUTA");

// Per ora la risposta viene soltanto visualizzata.
// Aggiungeremo la lettura vocale in un passaggio dedicato.
```

} catch (error) {
loadingMessage.remove();

```
if (error.name === "AbortError") {
  showError("La richiesta ha impiegato troppo tempo. Riprova.");
} else {
  showError(error.message || "Impossibile contattare WR AI.");
}

setVoiceStatus("PRONTO ALL'ASCOLTO");
```

} finally {
isSending = false;
sendButton.disabled = false;
messageInput.disabled = false;
messageInput.focus();
}
}

chatForm.addEventListener("submit", (event) => {
event.preventDefault();
sendMessage(messageInput.value);
});

document.querySelectorAll(".suggestion").forEach((button) => {
button.addEventListener("click", () => {
sendMessage(button.textContent);
});
});

clearButton.addEventListener("click", () => {
stopSpeaking();

if (recognition && isListening) {
recognition.abort();
}

conversation.innerHTML = initialConversation;
clearError();
setVoiceStatus("PRONTO ALL'ASCOLTO");
});

function stopSpeaking() {
speechGeneration++;

if ("speechSynthesis" in window) {
window.speechSynthesis.cancel();
}
}

function setupVoiceRecognition() {
const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
voiceButton.addEventListener("click", () => {
showError(
"Il riconoscimento vocale non è supportato da questo browser. " +
"Puoi comunque scrivere le domande."
);
});
return;
}

recognition = new SpeechRecognition();
recognition.lang = "it-IT";
recognition.continuous = false;
recognition.interimResults = false;
recognition.maxAlternatives = 1;

recognition.onstart = () => {
isListening = true;
voiceButton.classList.add("listening");
setVoiceStatus("TI STO ASCOLTANDO");
clearError();
};

recognition.onresult = (event) => {
const transcript = event.results[0][0].transcript.trim();

```
if (transcript) {
  messageInput.value = transcript;
  sendMessage(transcript);
}
```

};

recognition.onerror = (event) => {
if (event.error !== "aborted") {
showError("Errore del microfono: " + event.error);
}

```
setVoiceStatus("PRONTO ALL'ASCOLTO");
```

};

recognition.onend = () => {
isListening = false;
voiceButton.classList.remove("listening");

```
if (!isSending) {
  setVoiceStatus("PRONTO ALL'ASCOLTO");
}
```

};

voiceButton.addEventListener("click", () => {
if (isListening) {
recognition.stop();
return;
}

```
if (isSending) return;

stopSpeaking();

try {
  recognition.start();
} catch {
  showError("Impossibile avviare il microfono. Riprova.");
}
```

});
}

setupVoiceRecognition();
checkServer();
