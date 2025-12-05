// src/api/aiClient.ts

const BACKEND_URL = "https://fgloversbackend.onrender.com/api/chat";

export type ChatHistoryItem = {
  sender: "user" | "bot";
  text: string;
};

export async function askChatBruti(
  userMessage: string,
  history?: ChatHistoryItem[]
): Promise<string> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        history,
      }),
    });

    if (!response.ok) {
      console.error("Erreur backend:", await response.text());
      return "Le serveur de cerveau en mousse a planté. Réessaie plus tard.";
    }

    const data = await response.json();
    return data.reply as string;
  } catch (err) {
    console.error(err);
    return "ZzzzzZzzzz";
  }
}
