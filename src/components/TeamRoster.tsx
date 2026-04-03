import React, { useState } from 'react';
import { Team, Player } from '../types';
import { Users, User, TrendingUp, TrendingDown, Minus, BadgeCheck, Image as ImageIcon } from 'lucide-react';
import { cn, getWeeklyNickname, getTeamColor } from '../lib/utils';
import { auth, db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';

interface TeamRosterProps {
  teams: Team[];
  leaderboard: Player[];
}

export function TeamRoster({ teams, leaderboard }: TeamRosterProps) {
  const isAdmin = auth.currentUser?.email === 'boiledfrogsoup@gmail.com';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEarnings, setNewEarnings] = useState<string>('');

  const handleUpdateEarnings = async (teamId: string) => {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        totalEarnings: parseFloat(newEarnings) || 0
      });
      setEditingId(null);
    } catch (err) {
      console.error('Update earnings error:', err);
    }
  };

  const handleImageUpload = async (teamId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          imageUrl: base64
        });
      } catch (err) {
        console.error('Image upload error:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const uniqueTeams = Array.from(new Map(teams.map(t => [t.ownerName.toLowerCase(), t])).values());
  const sortedTeams = [...uniqueTeams].sort((a, b) => {
    const earningsA = a.totalEarnings || 0;
    const earningsB = b.totalEarnings || 0;
    if (earningsB !== earningsA) {
      return earningsB - earningsA;
    }
    return a.ownerName.localeCompare(b.ownerName);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2 sm:px-0">
      {sortedTeams.map((team) => {
        const top40Players = team.players.filter(p => 
          leaderboard.slice(0, 40).some(lp => lp.name.toLowerCase().includes(p.toLowerCase()))
        );

        return (
          <div key={team.id} className="bg-white rounded-[2rem] border border-neutral-200 shadow-xl overflow-hidden flex flex-col group hover:border-emerald-200 transition-all">
            <div className="p-6 border-b border-neutral-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group/img">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg overflow-hidden border-2 border-white" 
                    style={{ backgroundColor: getTeamColor(team.ownerName) }}
                  >
                    {team.imageUrl ? (
                      <img src={team.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      team.ownerName[0]
                    )}
                  </div>
                  {isAdmin && (
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer">
                      <ImageIcon className="w-5 h-5 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(team.id, e)} />
                    </label>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1" style={{ color: getTeamColor(team.ownerName) }}>{team.ownerName}</h3>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">{getWeeklyNickname(team.ownerName, uniqueTeams.map(t => t.ownerName))}</p>
                </div>
              </div>
              <div className="text-right">
                {isAdmin && editingId === team.id ? (
                  <div className="flex flex-col items-end gap-1">
                    <input 
                      type="number" 
                      value={newEarnings} 
                      onChange={(e) => setNewEarnings(e.target.value)}
                      className="w-24 text-right text-sm border-2 border-emerald-100 rounded-lg px-2 py-1 outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateEarnings(team.id)} className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={cn("flex flex-col items-end", isAdmin && "cursor-pointer hover:opacity-70")}
                    onClick={() => {
                      if (isAdmin) {
                        setEditingId(team.id);
                        setNewEarnings(team.totalEarnings?.toString() || '0');
                      }
                    }}
                  >
                    <p className="text-lg font-black text-emerald-600 tracking-tighter">${team.totalEarnings?.toLocaleString() || '0'}</p>
                    <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Earnings</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Roster</h4>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                  {top40Players.length} in Top 40
                </span>
              </div>

              <div className="space-y-1">
                {team.players.map((playerName, idx) => {
                  const inTop40 = leaderboard.slice(0, 40).some(lp => lp.name.toLowerCase().includes(playerName.toLowerCase()));

                  return (
                    <div key={idx} className={cn(
                      "flex items-center justify-between px-4 py-2 rounded-xl border transition-all",
                      inTop40 ? "bg-emerald-50 border-emerald-100 shadow-sm" : "bg-neutral-50/50 border-neutral-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center",
                          inTop40 ? "bg-emerald-100 text-emerald-600" : "bg-neutral-200 text-neutral-400"
                        )}>
                          <User className="w-3 h-3" />
                        </div>
                        <p className="text-sm font-black text-neutral-700 uppercase tracking-tight">{playerName}</p>
                      </div>
                      {inTop40 && (
                        <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
