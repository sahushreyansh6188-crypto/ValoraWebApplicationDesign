import { useState, useRef, useEffect } from "react";
import type { Conversation, Message } from "../types";
import { conversations as initialConvs } from "../data/mock";
import { messagingApi, connectChatWebSocket } from "../services/api";

const starters = [
  "I noticed we're both interested in zero-waste — how long have you been living that way?",
  "Your bio about slow mornings really resonated. What does your ideal morning look like?",
  "We both value authenticity. Is there something you find hard to be authentic about?",
];

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-xs md:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isMine
          ? "bg-brand text-ivory rounded-br-sm"
          : "bg-white border border-mist text-flint rounded-bl-sm"
      }`}>
        {msg.text}
        <div className={`text-[10px] mt-1 ${isMine ? "text-brand-mid" : "text-stone"}`}>
          {msg.timestamp.split(",")[1]?.trim() || msg.timestamp}
          {isMine && msg.read && (
            <span className="ml-1" aria-label="Read">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationPane({
  conv,
  onBack,
}: {
  conv: Conversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(conv.messages);
  const [input, setInput] = useState("");
  const [showStarters, setShowStarters] = useState(conv.messages.length <= 2);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(conv.messages);
    let active = true;
    messagingApi.getMessages(conv.id).then((serverMsgs) => {
      if (active && serverMsgs && serverMsgs.length > 0) {
        setMessages(serverMsgs);
      }
    }).catch(() => {});
    messagingApi.markRead(conv.id).catch(() => {});
    return () => { active = false; };
  }, [conv.id]);

  useEffect(() => {
    const disconnect = connectChatWebSocket((event) => {
      if (event.type === "message:received" && event.payload) {
        const payload = event.payload;
        if (payload.conversationId === conv.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      }
    });
    return disconnect;
  }, [conv.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const currentText = input.trim();
    setInput("");
    setShowStarters(false);

    const tempId = `m_${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      senderId: "me",
      text: currentText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      const serverMsg = await messagingApi.sendMessage(conv.id, currentText);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? serverMsg : m)));
    } catch (err) {
      console.warn("Failed sending message via API:", err);
    }
  };

  const sendStarter = async (s: string) => {
    setShowStarters(false);
    const tempId = `m_${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      senderId: "me",
      text: s,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      const serverMsg = await messagingApi.sendMessage(conv.id, s);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? serverMsg : m)));
    } catch (err) {
      console.warn("Failed sending starter via API:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-mist bg-white">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-cream transition-colors"
          aria-label="Back to conversations"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <img src={conv.profile.photo} alt={conv.profile.name} className="w-9 h-9 rounded-full object-cover border border-mist" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-charcoal">{conv.profile.name}</p>
          <p className="text-xs text-stone">
            {conv.profile.compatibilityScore}% aligned · matched {conv.matchedAt}
          </p>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-cream transition-colors text-stone" aria-label="More options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ivory">
        {/* Match info card */}
        <div className="flex justify-center">
          <div className="bg-white border border-mist rounded-2xl px-5 py-4 text-center max-w-xs">
            <img src={conv.profile.photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-brand-light mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-charcoal">You matched with {conv.profile.name}</p>
            <p className="text-xs text-stone mt-1">{conv.matchedAt} · {conv.profile.compatibilityScore}% aligned</p>
          </div>
        </div>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === "me"} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Conversation starters */}
      {showStarters && messages.length <= 2 && (
        <div className="px-4 py-3 border-t border-mist bg-white">
          <p className="text-xs text-stone font-medium mb-2.5">Conversation starters based on your shared values</p>
          <div className="space-y-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => sendStarter(s)}
                className="w-full text-left text-xs bg-brand-light text-brand px-3.5 py-2.5 rounded-xl hover:bg-brand-light/80 transition-colors leading-relaxed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-mist bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={`Message ${conv.profile.name}…`}
            rows={1}
            aria-label={`Message ${conv.profile.name}`}
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm bg-ivory border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors resize-none max-h-32"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send message"
            className="w-10 h-10 bg-brand text-ivory rounded-full flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-stone mt-1.5 text-center">
          Valora keeps all conversations private. <a href="#" className="underline">Safety guidelines</a>
        </p>
      </div>
    </div>
  );
}

export default function Messages() {
  const [convs, setConvs] = useState<Conversation[]>(initialConvs);
  const [selected, setSelected] = useState<Conversation | null>(null);

  useEffect(() => {
    let active = true;
    messagingApi.getConversations().then((data) => {
      if (active && data && data.length > 0) {
        setConvs(data);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="md:ml-60 h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Conversations list */}
      <div className={`w-full md:w-80 border-r border-mist flex flex-col ${selected ? "hidden md:flex" : "flex"}`}>
        <div className="px-5 py-4 border-b border-mist">
          <h1 className="font-display text-2xl text-charcoal">Messages</h1>
        </div>

        {convs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-charcoal mb-1">No conversations yet</p>
              <p className="text-xs text-stone">When you get a match, conversations will appear here.</p>
            </div>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto" role="listbox" aria-label="Conversations">
            {convs.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <li
                  key={conv.id}
                  role="option"
                  aria-selected={selected?.id === conv.id}
                  onClick={() => setSelected(conv)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer border-b border-mist transition-colors ${
                    selected?.id === conv.id ? "bg-brand-light" : "hover:bg-ivory"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.profile.photo}
                      alt={conv.profile.name}
                      className="w-11 h-11 rounded-full object-cover border border-mist"
                    />
                    {conv.isNew && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-clay rounded-full border-2 border-white" aria-label="Unread" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className={`text-sm ${conv.unreadCount ? "font-semibold text-charcoal" : "font-medium text-flint"}`}>
                        {conv.profile.name}
                      </span>
                      <span className="text-[10px] text-stone shrink-0 ml-2">{conv.matchedAt}</span>
                    </div>
                    <p className={`text-xs truncate ${conv.unreadCount ? "text-charcoal font-medium" : "text-stone"}`}>
                      {lastMsg?.senderId === "me" ? "You: " : ""}{lastMsg?.text}
                    </p>
                  </div>
                  {conv.unreadCount ? (
                    <span className="shrink-0 w-5 h-5 bg-clay rounded-full text-ivory text-[10px] font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Chat pane */}
      <div className={`flex-1 ${!selected ? "hidden md:flex items-center justify-center bg-ivory" : "flex flex-col"}`}>
        {selected ? (
          <ConversationPane conv={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-flint font-medium mb-1">Select a conversation</p>
            <p className="text-stone text-sm">Choose someone from the list to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
