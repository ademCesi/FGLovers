// src/components/ChatBruti.tsx
import React, { useState, useEffect, useRef } from "react";
import { askChatBruti } from "../api/aiClient";
import SvgIcon from "./SvgIcon";

type Sender = "user" | "bot";

interface Message {
  id: number;
  sender: Sender;
  text: string;
}

export const ChatBruti: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "bot",
      text: "Je suis Florent l'éléphant savant. Pose-moi une question, je te promets je me trompe jamais !",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [counter, setCounter] = useState(2);

  // Ref pour scroller en bas
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Dès que les messages changent (ou le loader), on descend
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: counter,
      sender: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setCounter((c) => c + 1);
    setInput("");
    setIsLoading(true);

    try {
      // On envoie aussi l'historique
      const reply = await askChatBruti(trimmed, messages);

      const botMsg: Message = {
        id: counter + 1,
        sender: "bot",
        text: reply,
      };

      setMessages((prev) => [...prev, botMsg]);
      setCounter((c) => c + 2);
    } catch (e) {
      console.error(e);
      const errorMsg: Message = {
        id: counter + 1,
        sender: "bot",
        text:
          "Oups, j'ai trébuché sur un câble imaginaire. L'IA n'a pas répondu. Réessaie plus tard.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      setCounter((c) => c + 2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="allChatContainer">
          <div className="svgContainer">
            <SvgIcon name="elephant" size={200} />
          </div>
          <div className="chat-container">
            <header className="chat-header">
              <div className="chat-header-title">Florent l'éléphant</div>
            </header>
            <main className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${
                    msg.sender === "user" ? "user" : "bot"
                  }`}
                >
                  <div className="bubble">{msg.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message bot">
                  <div className="bubble bubble-loading">
                    Florent réfléchit ...
                  </div>
                </div>
              )}
              {/* Ancre pour scroller tout en bas */}
              <div ref={messagesEndRef} />
            </main>

            <footer className="chat-footer">
              <input
                type="text"
                placeholder="Pose ta question (ou pas)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <SvgIcon
                className="buttonCursor"
                name="button"
                size={64}
                onClick={handleSend}
              />
            </footer>
          </div>
        </div>
      )}
      <div className="button-chat">
        {isOpen ? (
          <SvgIcon
            className="buttonCursor"
            name="elphOn"
            size={160}
            onClick={() => {
              setIsOpen(false);
            }}
          />
        ) : (
          <SvgIcon
            className="buttonCursor"
            name="elphOff"
            size={160}
            onClick={() => {
              setIsOpen(true);
            }}
          />
        )}
      </div>
    </>
  );
};
