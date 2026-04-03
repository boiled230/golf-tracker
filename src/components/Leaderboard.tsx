import React, { useState } from 'react';
import { Player, WeeklyResult } from '../types';
import { TrendingUp, TrendingDown, Minus, Trophy, Users, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { cn, getTeamColor, isTournamentDay } from '../lib/utils';
import { LeagueChat } from './LeagueChat';

interface PlayerWithPhoto extends Player {
  photoUrl?: string;
}

interface LeaderboardProps {
  tournamentName: string;
  lastUpdated: string;
  players: PlayerWithPhoto[];
  teamStats: Record<string, number>;
  latestResult?: WeeklyResult;
  onRefresh?: () => void;
}

export function Leaderboard({ tournamentName, lastUpdated, players, teamStats, latestResult, onRefresh }: LeaderboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <div className="space-y-8">
      {latestResult && (
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 p-8 rounded-[2rem] shadow-2xl border-4 border-white/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl rotate-3 shrink-0">
              <Trophy className="w-14 h-14 text-yellow-300 drop-shadow-lg" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-col md:flex-row md:items-baseline gap-3">
                <h4 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none drop-shadow-md">
                  {latestResult.headline}
                </h4>
                <span className="bg-yellow-400 text-emerald-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Winner - {latestResult.winnerName || 'TBD'}
                </span>
              </div>
              <p className="text-xl font-bold text-emerald-50 italic opacity-90">
                {latestResult.subHeadline}
              </p>
              <div className="pt-2 flex items-center gap-2 text-emerald-100/80 font-medium">
                <Sparkles className="w-4 h-4" />
                <p className="text-sm italic">{latestResult.roast}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-neutral-100 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">{tournamentName}</h2>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={cn(
                    "p-3 rounded-2xl hover:bg-neutral-100 text-neutral-400 transition-all border border-neutral-100",
                    isRefreshing && "animate-spin text-emerald-600"
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Live
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-auto text-left border-collapse">
                <tbody className="divide-y divide-neutral-50">
                  {players.slice(0, 40).map((player, idx) => {
                    // Create a Strict 4-Slot Array for each row
                    const teamBadge = player.teamOwner ? (
                      <span 
                        className="font-black uppercase italic tracking-tighter text-[14px] sm:text-[18px] block truncate"
                        style={{ color: getTeamColor(player.teamOwner) }}
                      >
                        {player.teamOwner}
                      </span>
                    ) : (
                      <span className="text-[8px] sm:text-[9px] font-black text-neutral-300 uppercase tracking-widest block">Free Agent</span>
                    );

                    const rowDisplay = [
                      teamBadge,
                      player.totalScore,
                      player.thru || '-'
                    ];

                    return (
                      <tr key={idx} className={cn(
                        "hover:bg-neutral-50/50 transition-all group",
                        player.teamOwner ? "bg-emerald-50/10" : ""
                      )} style={player.teamOwner ? { borderLeft: `4px solid ${getTeamColor(player.teamOwner)}` } : {}}>
                        {/* Slot 1: Number + Team Badge (Auto) */}
                        <td className="w-auto pl-2 pr-4 py-1 leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-neutral-400 min-w-[1.5rem]">
                              {idx + 1}.
                            </span>
                            {rowDisplay[0]}
                          </div>
                        </td>

                        {/* Slot 2: Score (Auto) */}
                        <td className="w-auto px-4 py-1 text-center leading-tight">
                          <div className="flex items-center gap-3 justify-center">
                            <span className={cn(
                              "inline-block px-1.5 sm:px-2 py-0.5 rounded-md font-black text-[11px] sm:text-sm tracking-tighter",
                              String(player.totalScore).startsWith('-') ? "bg-red-50 text-red-600" : 
                              player.totalScore === 'E' ? "bg-neutral-100 text-neutral-600" : "bg-neutral-50 text-neutral-900"
                            )}>
                              {rowDisplay[1]}
                            </span>
                            <div className="flex items-center gap-1">
                              {player.movement === 'rising' && <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500 shrink-0" />}
                              {player.movement === 'falling' && <TrendingDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-red-500 shrink-0" />}
                            </div>
                          </div>
                        </td>

                        {/* Slot 3: Thru (Auto) - Visible on mobile */}
                        <td className="w-auto px-4 py-1 text-right leading-tight">
                          <span className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-tighter">
                            {rowDisplay[2]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-emerald-900 uppercase italic tracking-tighter">Top 40 Golfers</h3>
            </div>
            
            <div className="space-y-2">
              {Object.entries(teamStats)
                .sort(([, a], [, b]) => b - a)
                .map(([owner, count]) => {
                  const isDisaster = count === 0 && isTournamentDay();
                  return (
                    <div 
                      key={owner} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-2xl border transition-all group",
                        isDisaster 
                          ? "bg-red-600 border-red-700 shadow-lg shadow-red-200" 
                          : "bg-neutral-50/50 border-neutral-100 hover:border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg group-hover:scale-110 transition-transform",
                            isDisaster ? "bg-white !text-red-600" : "shadow-emerald-100"
                          )}
                          style={!isDisaster ? { backgroundColor: getTeamColor(owner) } : {}}
                        >
                          {owner[0]}
                        </div>
                        <span 
                          className={cn(
                            "font-black uppercase tracking-tight text-2xl",
                            isDisaster ? "text-white" : ""
                          )} 
                          style={!isDisaster ? { color: getTeamColor(owner) } : {}}
                        >
                          {owner}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-2xl font-black tracking-tighter",
                          isDisaster ? "text-white" : (count > 0 ? "text-emerald-600" : "text-red-500")
                        )}>
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {Object.values(teamStats).some(c => c === 0) && (
              <div className="mt-8 p-5 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-red-700 uppercase tracking-widest">Disaster Watch</h4>
                  <p className="text-xs text-red-600 font-bold">Teams with 0 players in Top 40 detected.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League Chat Section */}
      <div className="mt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-neutral-200" />
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        <div className="max-w-4xl mx-auto">
          <LeagueChat />
        </div>
      </div>
    </div>
  );
}
