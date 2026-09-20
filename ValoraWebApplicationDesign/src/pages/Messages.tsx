import { useState, useRef, useEffect } from "react";
import type { Conversation, Message } from "../types";
import { messagingApi, connectChatWebSocket } from "../services/api";
import UndiscoveredAvatar from "../components/UndiscoveredAvatar";

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

  // Audio Transcription with Gemini State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Cleanup audio tracks and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startVoiceRecording = async () => {
    setTranscribeError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setTranscribeError("Microphone recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const chunks = audioChunksRef.current;
        if (chunks.length === 0) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setIsTranscribing(true);

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            try {
              const res = await messagingApi.transcribeAudio(base64Data, audioBlob.type);
              if (res && res.text) {
                setInput((prev) => (prev.trim() ? `${prev.trim()} ${res.text}` : res.text));
              } else {
                setTranscribeError("No clear speech detected. Please try recording again.");
              }
            } catch (apiErr: any) {
              console.error("Transcribe API error:", apiErr);
              setTranscribeError("Failed to transcribe audio. Please check your connection and try again.");
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch (readErr) {
          console.error("Error reading audio data:", readErr);
          setIsTranscribing(false);
          setTranscribeError("Failed to process audio recording.");
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setTranscribeError("Microphone permission was denied. Please allow microphone access to transcribe audio.");
      } else {
        setTranscribeError("Could not access microphone: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopAndTranscribe = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

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
        <UndiscoveredAvatar photo={conv.profile.photo} name={conv.profile.name} size="sm" />
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
            <UndiscoveredAvatar photo={conv.profile.photo} name={conv.profile.name} size="lg" className="mx-auto mb-2" />
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
        {/* Error notification */}
        {transcribeError && (
          <div className="mb-2.5 p-2.5 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{transcribeError}</span>
            </div>
            <button
              onClick={() => setTranscribeError(null)}
              className="text-stone hover:text-charcoal p-1 text-[11px]"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Transcribing Indicator */}
        {isTranscribing && (
          <div className="mb-2.5 p-2 bg-brand-light border border-brand/20 rounded-xl text-xs text-brand flex items-center justify-center gap-2">
            <svg className="animate-spin w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span className="font-medium">Transcribing voice note into text with Gemini…</span>
          </div>
        )}

        {/* Recording active state */}
        {isRecording ? (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-4 h-4">
                <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </div>
              <div className="text-xs font-semibold text-red-900 flex items-center gap-2">
                <span>Listening to speech…</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-red-200 shadow-2xs">{formatSeconds(recordingSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs text-stone hover:text-charcoal bg-white border border-mist rounded-xl hover:bg-ivory transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopAndTranscribe}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop & Transcribe
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${conv.profile.name}… (type or use mic to transcribe)`}
              rows={1}
              aria-label={`Message ${conv.profile.name}`}
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm bg-ivory border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors resize-none max-h-32"
              style={{ minHeight: "42px" }}
            />

            {/* Transcribe Audio Microphone Button */}
            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={isTranscribing}
              title="Record voice audio to transcribe into text"
              aria-label="Record voice note to transcribe"
              className="w-10 h-10 border border-mist bg-ivory hover:bg-cream text-flint hover:text-brand rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            {/* Send Button */}
            <button
              onClick={send}
              disabled={!input.trim() || isTranscribing}
              aria-label="Send message"
              className="w-10 h-10 bg-brand text-ivory rounded-full flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-40 shrink-0 shadow-xs"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-stone mt-1.5 px-1">
          <span>Write with keyboard or tap the mic icon to transcribe speech into text</span>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    messagingApi.getConversations().then((data) => {
      if (active) {
        setConvs(data || []);
        setLoading(false);
        const count = (data || []).reduce(
          (acc, c) => acc + (c.unreadCount || (c.isNew ? 1 : 0)),
          0
        );
        window.dispatchEvent(new CustomEvent("valora:messages-updated", { detail: count }));
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleSelectConv = (conv: Conversation) => {
    setSelected(conv);
    setConvs((prev) => {
      const updated = prev.map((c) =>
        c.id === conv.id ? { ...c, unreadCount: 0, isNew: false } : c
      );
      const count = updated.reduce(
        (acc, c) => acc + (c.unreadCount || (c.isNew ? 1 : 0)),
        0
      );
      window.dispatchEvent(new CustomEvent("valora:messages-updated", { detail: count }));
      return updated;
    });
  };

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
                  onClick={() => handleSelectConv(conv)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer border-b border-mist transition-colors ${
                    selected?.id === conv.id ? "bg-brand-light" : "hover:bg-ivory"
                  }`}
                >
                  <div className="relative shrink-0">
                    <UndiscoveredAvatar
                      photo={conv.profile.photo}
                      name={conv.profile.name}
                      size="md"
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
