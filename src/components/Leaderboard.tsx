import React, { useState } from 'react';
import { Player, WeeklyResult } from '../types';
import { TrendingUp, TrendingDown, Minus, Trophy, Users, RefreshCw, Sparkles, AlertTriangle, Music, MessageSquare, Clock, Beer, Wine, Zap, Timer, Flame, Smile, Target, DollarSign, Shirt, Cpu, Leaf, Dog, BookOpen, Film, Gamepad2, Dumbbell } from 'lucide-react';
import { cn, getTeamColor, isTournamentDay } from '../lib/utils';
import { LeagueChat } from './LeagueChat';

const TraitIcon = ({ traits }: { traits?: string[] }) => {
  if (!traits || traits.length === 0) return <Sparkles className="w-5 h-5" />;
  
  const traitStr = traits.join(' ').toLowerCase();
  
  if (traitStr.includes('music')) return <Music className="w-5 h-5" />;
  if (traitStr.includes('talk')) return <MessageSquare className="w-5 h-5" />;
  if (traitStr.includes('late')) return <Clock className="w-5 h-5" />;
  if (traitStr.includes('beer')) return <Beer className="w-5 h-5" />;
  if (traitStr.includes('wine')) return <Wine className="w-5 h-5" />;
  if (traitStr.includes('fast')) return <Zap className="w-5 h-5" />;
  if (traitStr.includes('slow')) return <Timer className="w-5 h-5" />;
  if (traitStr.includes('angry') || traitStr.includes('mad')) return <Flame className="w-5 h-5" />;
  if (traitStr.includes('happy') || traitStr.includes('smile')) return <Smile className="w-5 h-5" />;
  if (traitStr.includes('target') || traitStr.includes('skill')) return <Target className="w-5 h-5" />;
  if (traitStr.includes('money') || traitStr.includes('cash')) return <DollarSign className="w-5 h-5" />;
  if (traitStr.includes('style') || traitStr.includes('shirt')) return <Shirt className="w-5 h-5" />;
  if (traitStr.includes('tech') || traitStr.includes('computer')) return <Cpu className="w-5 h-5" />;
  if (traitStr.includes('nature') || traitStr.includes('leaf')) return <Leaf className="w-5 h-5" />;
  if (traitStr.includes('dog') || traitStr.includes('cat') || traitStr.includes('animal')) return <Dog className="w-5 h-5" />;
  if (traitStr.includes('book') || traitStr.includes('read')) return <BookOpen className="w-5 h-5" />;
  if (traitStr.includes('movie') || traitStr.includes('film')) return <Film className="w-5 h-5" />;
  if (traitStr.includes('game')) return <Gamepad2 className="w-5 h-5" />;
  if (traitStr.includes('sport') || traitStr.includes('gym')) return <Dumbbell className="w-5 h-5" />;
  
  return <Sparkles className="w-5 h-5" />;
};

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
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 p-4 sm:p-8 rounded-[2rem] shadow-2xl border-4 border-white/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="space-y-2 flex-1">
              <div className="flex flex-col md:flex-row md:items-baseline gap-3">
                <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none drop-shadow-md">
                  {latestResult.headline}
                </h4>
                <span className="bg-yellow-400 text-emerald-900 px-6 py-2 rounded-full text-lg font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                  Winner - {latestResult.winnerName || 'TBD'}
                  <Trophy className="w-5 h-5" />
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
            <div className="px-4 sm:px-8 py-6 border-b border-neutral-100 bg-white flex items-center justify-between">
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
              <table className="w-full text-left border-collapse table-auto">
                <tbody className="divide-y divide-neutral-50">
                  {players.slice(0, 40).map((player, idx) => {
                    // Create a Strict 5-Slot Array for each row
                    const rawName = player.teamOwner || 'Free Agent';
                    const prefix = `${idx + 1}. `;
                    const limit = 9; // Character limit for mobile
                    
                    const displayName = isMobile && rawName.length > limit 
                      ? `${prefix}${rawName.substring(0, limit - 1)}-`
                      : `${prefix}${rawName}`;

                    const teamBadge = player.teamOwner ? (
                      <span 
                        className="font-black uppercase italic tracking-tighter text-[9px] sm:text-[12px] block truncate"
                        style={{ color: getTeamColor(player.teamOwner) }}
                      >
                        {displayName}
                      </span>
                    ) : (
                      <span className="text-[6px] sm:text-[7px] font-black text-neutral-300 uppercase tracking-widest block">{displayName}</span>
                    );

                    const rowData = [
                      teamBadge,
                      player.thru || '-',
                      player.today || '-',
                      player.r1 || '-',
                      player.r2 || '-'
                    ];

                    return (
                      <tr key={idx} className={cn(
                        "hover:bg-neutral-50/50 transition-all group",
                        player.teamOwner ? "bg-emerald-50/10" : ""
                      )} style={player.teamOwner ? { borderLeft: `4px solid ${getTeamColor(player.teamOwner)}` } : {}}>
                        {/* 1: PLAYER (Team Badge with prefix) */}
                        <td className="px-2 sm:px-4 py-0.5 border-r border-neutral-100 max-w-[75px] sm:max-w-none overflow-hidden">
                          {rowData[0]}
                        </td>

                        {/* 2: THRU */}
                        <td className="px-1 sm:px-4 py-0.5 text-center border-r border-neutral-100 whitespace-nowrap">
                          <span className="text-[10px] font-black text-neutral-400 uppercase">
                            {rowData[1]}
                          </span>
                        </td>

                        {/* 3: TODAY */}
                        <td className="px-1 sm:px-4 py-0.5 text-center border-r border-neutral-100 whitespace-nowrap">
                          <span className="text-[10px] font-black text-neutral-500">
                            {rowData[2]}
                          </span>
                        </td>

                        {/* 4: R1 */}
                        <td className="px-1 sm:px-4 py-0.5 text-center border-r border-neutral-100 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-neutral-400">
                            {rowData[3]}
                          </span>
                        </td>

                        {/* 5: R2 */}
                        <td className="px-1 sm:px-4 py-0.5 text-center whitespace-nowrap">
                          <span className="text-[10px] font-bold text-neutral-400">
                            {rowData[4]}
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
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-emerald-900 uppercase italic tracking-tighter">Top 40 Golfers</h3>
            </div>
            
            <div className="space-y-1">
              {Object.entries(teamStats)
                .sort(([, a], [, b]) => b - a)
                .map(([owner, count]) => {
                  const isDisaster = count === 0 && isTournamentDay();
                  return (
                    <div 
                      key={owner} 
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded-xl border transition-all group",
                        isDisaster 
                          ? "bg-red-600 border-red-700 shadow-lg shadow-red-200" 
                          : "bg-neutral-50/50 border-neutral-100 hover:border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg group-hover:scale-110 transition-transform",
                            isDisaster ? "bg-white !text-red-600" : "shadow-emerald-100"
                          )}
                          style={!isDisaster ? { backgroundColor: getTeamColor(owner) } : {}}
                        >
                          {owner[0]}
                        </div>
                        <span 
                          className={cn(
                            "font-black uppercase tracking-tight text-lg",
                            isDisaster ? "text-white" : ""
                          )} 
                          style={!isDisaster ? { color: getTeamColor(owner) } : {}}
                        >
                          {owner}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-xl font-black tracking-tighter",
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
              <div className="mt-4 p-3 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest">Disaster Watch</h4>
                  <p className="text-[10px] text-red-600 font-bold">0 players in Top 40 detected.</p>
                </div>
              </div>
            )}
          </div>

          {/* League Chat moved to Sidebar */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden flex flex-col h-[700px]">
            <div className="flex-1 overflow-hidden">
              <LeagueChat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
