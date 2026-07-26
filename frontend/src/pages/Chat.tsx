import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRepository } from '../context/RepositoryContext';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  Bot, 
  User as UserIcon, 
  Edit3, 
  Check, 
  Search,
  Code
} from 'lucide-react';
export const Chat: React.FC = () => {
  const { activeRepo } = useRepository();
  // Sessions listing
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  // Messages details
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [aiResponding, setAiResponding] = useState(false);
  
  // Renaming state
  const [renamingSessionId, setRenamingSessionId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fetchSessions = async () => {
    if (!activeRepo) return;
    setSessionsLoading(true);
    try {
      const searchQuery = sessionSearch ? `&search=${sessionSearch}` : "";
      const response = await axios.get(`/api/v1/chat/sessions?repository_id=${activeRepo.id}${searchQuery}`);
      setSessions(response.data);
      
      // Auto select the first session if none selected
      if (response.data.length > 0 && !activeSession) {
        handleSelectSession(response.data[0]);
      }
    } catch (err) {
      console.error("Failed fetching chat sessions list:", err);
    } finally {
      setSessionsLoading(false);
    }
  };
  useEffect(() => {
    fetchSessions();
  }, [activeRepo, sessionSearch]);
  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, aiResponding]);
  const handleSelectSession = async (session: any) => {
    setActiveSession(session);
    try {
      const response = await axios.get(`/api/v1/chat/sessions/${session.id}`);
      setMessages(response.data.messages);
    } catch (err) {
      console.error("Failed loading session details:", err);
    }
  };
  const handleCreateSession = async () => {
    if (!activeRepo) return;
    try {
      const response = await axios.post('/api/v1/chat/sessions', {
        title: "New Codebase Query",
        repository_id: activeRepo.id
      });
      await fetchSessions();
      handleSelectSession(response.data);
    } catch (err) {
      console.error("Failed creating chat session:", err);
    }
  };
  const handleRenameSession = async (sessionId: number) => {
    if (!renameTitle.trim()) return;
    try {
      await axios.put(`/api/v1/chat/sessions/${sessionId}`, { title: renameTitle });
      setRenamingSessionId(null);
      await fetchSessions();
      if (activeSession?.id === sessionId) {
        setActiveSession({ ...activeSession, title: renameTitle });
      }
    } catch (err) {
      console.error("Failed renaming session:", err);
    }
  };
  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session and its message logs?")) return;
    try {
      await axios.delete(`/api/v1/chat/sessions/${sessionId}`);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
      await fetchSessions();
    } catch (err) {
      console.error("Failed deleting session:", err);
    }
  };
  const handleSendMessage = async (textToSend?: string) => {
    const finalVal = textToSend || inputText;
    if (!finalVal.trim() || !activeSession || aiResponding) return;
    // Push optimistic user message
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: finalVal,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText("");
    setAiResponding(true);
    try {
      const response = await axios.post(`/api/v1/chat/sessions/${activeSession.id}/messages`, {
        content: finalVal
      });
      // Replace optimistic message and append assistant
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), response.data]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `⚠️ Failed to fetch AI response: ${err.response?.data?.detail || err.message}`
        }
      ]);
    } finally {
      setAiResponding(false);
    }
  };
  const suggestionPrompts = [
    "Summarize repository framework",
    "Explain authentication configuration",
    "Show file dependency linkages",
    "Generate codebase README document"
  ];
  // Helper to parse markdown code blocks
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : 'code';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-3 border border-slate-700/80 bg-slate-900 rounded-lg overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950">
              <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> {lang || 'code'}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-slate-200 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      // Inline formatting
      return (
        <span key={index} className="whitespace-pre-line text-sm leading-relaxed">
          {part.split(/(`[^`]+`)/g).map((subPart, subIdx) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return (
                <code key={subIdx} className="bg-slate-100 dark:bg-slate-800 text-brand-650 px-1.5 py-0.5 rounded font-mono text-xs mx-0.5">
                  {subPart.slice(1, -1)}
                </code>
              );
            }
            return subPart;
          })}
        </span>
      );
    });
  };
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* 1. Left Sidebar: Chat Sessions Manager */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col justify-between flex-shrink-0">
        <div className="p-4 flex flex-col gap-4">
          <button
            onClick={handleCreateSession}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chat titles..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 bg-slate-50/30"
            />
          </div>
        </div>
        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {sessionsLoading && sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">No chat sessions.</div>
          ) : (
            sessions.map((sess) => {
              const isActive = activeSession?.id === sess.id;
              const isRenaming = renamingSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => !isRenaming && handleSelectSession(sess)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isActive 
                      ? 'border-brand-500 bg-brand-50/10 text-brand-700 font-bold' 
                      : 'border-transparent text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <MessageSquare className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    {isRenaming ? (
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onBlur={() => handleRenameSession(sess.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSession(sess.id)}
                        autoFocus
                        className="w-full text-xs border border-brand-300 rounded px-1.5 py-0.5 focus:outline-none"
                      />
                    ) : (
                      <span className="truncate text-xs">{sess.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {isRenaming ? (
                      <button onClick={() => handleRenameSession(sess.id)} className="p-1 text-green-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingSessionId(sess.id);
                            setRenameTitle(sess.title);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
      {/* 2. Right Workspace: Chat interface viewport */}
      <section className="flex-1 bg-slate-50/50 flex flex-col justify-between overflow-hidden">
        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-brand-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Repository-Aware AI assistant</p>
                <p className="text-xs text-slate-400 mt-1">Select or create a chat session on the left to ask codebase queries.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-6">
              <Bot className="w-10 h-10 text-brand-500 animate-bounce" />
              <div>
                <p className="text-sm font-bold text-slate-700">Code Analysis chat session is open</p>
                <p className="text-xs text-slate-450 mt-1 max-w-sm">I can explain REST routing paths, controller dependencies, authentication controls, and security issues.</p>
              </div>
              {/* Suggestions grid */}
              <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-4">
                {suggestionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-xs bg-white hover:bg-slate-100 transition-colors border border-slate-150 p-3 rounded-xl font-semibold text-slate-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-4 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isAssistant ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isAssistant ? <Bot className="w-4.5 h-4.5" /> : <UserIcon className="w-4.5 h-4.5" />}
                    </div>
                    <div className={`max-w-[85%] p-4 rounded-2xl ${
                      isAssistant 
                        ? 'bg-white border border-slate-150 text-slate-700 shadow-sm' 
                        : 'bg-brand-650 text-white font-medium shadow'
                    }`}>
                      {isAssistant ? renderMessageContent(msg.content) : <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                    </div>
                  </div>
                );
              })}
              {/* Responder typing state */}
              {aiResponding && (
                <div className="flex gap-4 max-w-3xl mx-auto">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-glow">
                    <Bot className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Input box section */}
        {activeSession && (
          <div className="p-6 border-t border-slate-200/80 bg-white flex-shrink-0">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about endpoints, authentication configurations, or dependencies..."
                className="w-full pl-4 pr-12 py-3.5 border border-slate-200 focus:border-brand-500 rounded-xl focus:outline-none text-sm resize-none h-14 bg-slate-50/30"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || aiResponding}
                className="absolute right-3.5 top-3.5 p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 shadow transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};