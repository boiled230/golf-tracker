import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Send, Smile, User, Edit2, X, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

// @ts-ignore
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: any;
  gif?: string;
  color?: string;
}

export function LeagueChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [nickname, setNickname] = useState(localStorage.getItem('chat_nickname') || 'Guest');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      console.error('Chat snapshot error:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent, gifUrl?: string) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !gifUrl) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        sender: nickname,
        senderId: auth.currentUser?.uid || 'guest',
        timestamp: serverTimestamp(),
        gif: gifUrl || null,
        color: localStorage.getItem('team_color') || '#10b981'
      });
      setNewMessage('');
      setShowGifPicker(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const saveNickname = () => {
    if (tempNickname.trim()) {
      setNickname(tempNickname);
      localStorage.setItem('chat_nickname', tempNickname);
      setIsEditingNickname(false);
    }
  };

  const searchGifs = async () => {
    if (!gifSearch.trim() || !GIPHY_API_KEY) return;

    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${gifSearch}&limit=12`);
      const data = await res.json();
      setGifs(data.data);
    } catch (error) {
      console.error('Giphy error:', error);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-neutral-200 shadow-2xl overflow-hidden flex flex-col h-full">
      {/* Header (Nickname only) */}
      <div className="px-4 py-2 border-b border-neutral-100 bg-emerald-900 text-white flex items-center justify-end">
        <div className="flex items-center gap-3">
          {isEditingNickname ? (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
              <input 
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:ring-0 w-24 placeholder:text-white/30"
                placeholder="Nickname..."
                autoFocus
              />
              <button onClick={saveNickname} className="text-emerald-400 hover:text-emerald-300">
                <Send className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingNickname(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-3 py-1.5"
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest">{nickname}</span>
              <Edit2 className="w-3 h-3 text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 bg-neutral-50/50"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex items-baseline gap-2 max-w-full",
              msg.senderId === auth.currentUser?.uid ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0">
              {msg.sender}:
            </span>
            <div 
              className={cn(
                "px-2 py-1 rounded-xl shadow-sm border",
                msg.senderId === auth.currentUser?.uid 
                  ? "bg-emerald-600 border-emerald-700 text-white" 
                  : "bg-white border-neutral-200 text-neutral-800"
              )}
            >
              {msg.text && <p className="text-xs font-medium leading-tight">{msg.text}</p>}
              {msg.gif && (
                <img 
                  src={msg.gif} 
                  alt="GIF" 
                  className="rounded-lg mt-1 max-w-[150px] h-auto" 
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-neutral-100 relative">
        <AnimatePresence>
          {showGifPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-4 right-4 mb-4 bg-white rounded-2xl border border-neutral-200 shadow-2xl p-4 z-50"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
                    placeholder="Search GIFs..."
                    className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button onClick={() => setShowGifPicker(false)} className="p-2 hover:bg-neutral-100 rounded-xl">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {gifs.map((gif) => (
                  <button 
                    key={gif.id}
                    onClick={() => handleSendMessage(undefined, gif.images.fixed_height.url)}
                    className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img src={gif.images.fixed_height_small.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowGifPicker(!showGifPicker)}
            className="p-3 bg-neutral-100 text-neutral-500 rounded-2xl hover:bg-neutral-200 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-neutral-50 border-neutral-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 border"
          />
          <button 
            type="submit"
            className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
