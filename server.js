require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

// Pubblica i file del sito dalla cartella public
app.use(express.static(path.join(__dirname, "public")));

// Controlla che il server sia attivo
app.get("/api/health", (req, res) => {
res.json({
status: "ok",
message: "WR AI server attivo"
});
});

// Riceve una domanda e la invia all'intelligenza artificiale
app.post("/api/chat", async (req, res) => {
try {
const { message } = req.body;

```
if (typeof message !== "string" || !message.trim()) {
  return res.status(400).json({
    error: "Inserisci una domanda."
  });
}

if (message.length > 4000) {
  return res.status(400).json({
    error: "La domanda è troppo lunga."
  });
}

if (!process.env.OPENAI_API_KEY) {
  return res.status(503).json({
    error: "Chiave API non configurata sul server."
  });
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await client.responses.create({
  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  instructions: [
    "Ti chiami WR AI.",
    "Rispondi in italiano, in modo naturale, chiaro e conciso.",
    "Sei un assistente personale pensato anche per motociclisti.",
    "La moto dell'utente è una Husqvarna WR 125 2T del 2009 modificata,",
    "con carburatore da 38 mm e miscela di riferimento al 2,2%.",
    "Non inventare specifiche tecniche non confermate.",
    "Per le operazioni potenzialmente pericolose, dai priorità alla sicurezza."
  ].join(" "),
  input: message,
  max_output_tokens: 500
});

const answer = response.output_text;

if (!answer) {
  return res.status(502).json({
    error: "L'intelligenza artificiale non ha restituito una risposta."
  });
}

res.json({ answer });
```

} catch (error) {
console.error("Errore durante la richiesta AI:", error.message);

```
if (error.status === 401) {
  return res.status(502).json({
    error: "La chiave API non è valida o non è stata accettata."
  });
}

if (error.status === 429) {
  return res.status(429).json({
    error: "Limite API raggiunto o credito API insufficiente."
  });
}

res.status(500).json({
  error: "Si è verificato un errore durante la richiesta AI."
});
```

}
});

// Avvia il server
app.listen(PORT, "0.0.0.0", () => {
console.log(`WR AI avviato sulla porta ${PORT}`);
});
