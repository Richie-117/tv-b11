'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  RotateCw,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  BookOpen,
} from 'lucide-react';
import { ChatMessage, Assignment } from '@/types';

export default function StudentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedTaskMention, setSelectedTaskMention] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ type: 'image' | 'document'; url: string; name: string } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChatData = async () => {
    try {
      const [chatRes, assignRes, profRes] = await Promise.all([
        fetch('/api/chat'),
        fetch('/api/admin/assignments'),
        fetch('/api/student/profile'),
      ]);

      if (chatRes.ok) {
        const d = await chatRes.json();
        setMessages(d.messages || []);
      }

      if (assignRes.ok) {
        const d = await assignRes.json();
        setAssignments(d.assignments || []);
      }

      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData?.student?.profileImageUrl) {
          setUserAvatar(profData.student.profileImageUrl);
        }
      }
    } catch (e) {
      console.error('Error fetching chat:', e);
    }
  };

  useEffect(() => {
    fetchChatData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchChatData();
    setLastRefreshed(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image exceeds maximum allowed size of 5MB. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        type: 'image',
        url: reader.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Document exceeds maximum allowed size of 10MB. Please choose a smaller document.');
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        type: 'document',
        url: reader.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingAttachment && !selectedTaskMention) return;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          attachment: pendingAttachment || undefined,
          taskMention: selectedTaskMention || undefined,
          senderAvatar: userAvatar || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setInputText('');
        setPendingAttachment(null);
        setSelectedTaskMention(null);
      }
    } catch (e) {
      console.error('Failed to post message:', e);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
            <div className="w-9 h-9 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>Division Chat</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official academic communication channel · Notices, peer discussion, and task mentions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="text-[11px] font-mono text-slate-500 mr-1 hidden sm:block">
            Synced: {lastRefreshed}
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-colors touch-target"
            title="Refresh feed"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#0088FF] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
        {/* Banner */}
        <div className="p-3.5 bg-[#161F30] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] flex items-center justify-center text-white font-bold text-sm shadow">
              UCR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Batch 11 Television Studies Feed</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  48 Members
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Official student and faculty exchange</p>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0A0E17]/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MessageSquare className="w-10 h-10 mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No Messages Yet</p>
              <p className="text-xs">Feel free to post a question or mention a task.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSuper = msg.senderRole === 'SuperAdmin';
              const isRep = msg.senderRole?.includes('Representative') || msg.senderRole?.includes('Rep');

              return (
                <div key={msg.id} className="flex gap-3 max-w-2xl">
                  {msg.senderAvatar ? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-9 h-9 rounded-xl object-cover border border-[#23324A] flex-shrink-0 shadow"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow ${
                        isSuper
                          ? 'bg-[#FF7900]'
                          : isRep
                          ? 'bg-[#0088FF]'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 bg-[#161F30] border border-[#23324A] rounded-2xl p-3.5 shadow-md space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{msg.senderName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isSuper
                              ? 'bg-[#FF7900]/20 text-[#FF7900] border-[#FF7900]/30'
                              : isRep
                              ? 'bg-[#0088FF]/20 text-[#38BDF8] border-[#0088FF]/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {msg.senderRole}
                        </span>
                        {msg.course && (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            [{msg.course}]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>

                    {msg.taskMention && (
                      <div className="p-2 rounded-xl bg-[#0088FF]/15 border border-[#0088FF]/30 text-xs flex items-center gap-2 text-[#38BDF8]">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-bold">Referenced Task: {msg.taskMention.taskTitle}</span>
                      </div>
                    )}

                    {msg.text && (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {msg.attachment && (
                      <div className="pt-2">
                        {msg.attachment.type === 'image' ? (
                          <div className="rounded-xl overflow-hidden border border-[#23324A] max-w-sm">
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.name}
                              className="w-full max-h-60 object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111827] border border-[#23324A] text-xs text-slate-300">
                            <FileText className="w-4 h-4 text-[#FF7900]" />
                            <span className="font-mono truncate">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#161F30] border-t border-[#1E293B] space-y-2">
          {(pendingAttachment || selectedTaskMention) && (
            <div className="flex items-center gap-2 flex-wrap">
              {pendingAttachment && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-white">
                  <span>Attachment: {pendingAttachment.name}</span>
                  <button onClick={() => setPendingAttachment(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {selectedTaskMention && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0088FF]/20 border border-[#0088FF]/40 text-xs text-[#38BDF8]">
                  <span>Task: {selectedTaskMention.taskTitle}</span>
                  <button onClick={() => setSelectedTaskMention(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={docInputRef}
              onChange={handleDocSelect}
              accept=".pdf,.doc,.docx,.zip,.txt"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors touch-target"
              title="Attach Image"
            >
              <ImageIcon className="w-5 h-5 text-[#0088FF]" />
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors touch-target"
              title="Attach Document"
            >
              <Paperclip className="w-5 h-5 text-[#FF7900]" />
            </button>

            {assignments.length > 0 && (
              <select
                value={selectedTaskMention?.taskId || ''}
                onChange={(e) => {
                  const assign = assignments.find((a) => a.id === e.target.value);
                  if (assign) setSelectedTaskMention({ taskId: assign.id, taskTitle: assign.title });
                  else setSelectedTaskMention(null);
                }}
                className="hidden sm:block px-2.5 py-2 rounded-xl bg-[#111827] border border-[#23324A] text-xs text-slate-300 focus:outline-none focus:border-[#0088FF] max-w-[150px] truncate"
              >
                <option value="">Mention Task...</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send a message or query to Division Chat..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A0E17] border border-[#23324A] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF] transition-colors"
            />

            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0072D6] text-white shadow-lg shadow-[#0088FF]/25 transition-all active:scale-95 touch-target flex items-center justify-center"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
