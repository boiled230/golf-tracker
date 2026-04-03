import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { Team, Player, WeeklyResult } from './types';
import { Leaderboard } from './components/Leaderboard';
import { TeamRoster } from './components/TeamRoster';
import { DraftParser } from './components/DraftParser';
import { WeeklyRecap } from './components/WeeklyRecap';
import { Trophy, Users, LayoutDashboard, FileUp, LogIn, LogOut, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Fuse from 'fuse.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<WeeklyResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ tournamentName: string; lastUpdated: string; players: Player[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teams' | 'draft' | 'recap'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email === 'boiledfrogsoup@gmail.com';

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, '_connection_test', 'test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission-denied')) {
          // This is expected if the collection doesn't exist or is locked, 
          // but if it's 'client is offline' then it's a config issue.
          console.log('Firestore connection test: permission denied (expected for test collection)');
        } else if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection error: the client is offline. Please check your Firebase configuration.");
          setError("Firestore is offline. Please check your connection or configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Teams
  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('ownerName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'teams');
    });
    return () => unsubscribe();
  }, []);

  // Fetch Results
  useEffect(() => {
    const q = query(collection(db, 'results'), orderBy('weekEnding', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resultData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyResult));
      setResults(resultData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'results');
    });
    return () => unsubscribe();
  }, []);

  // Fetch Leaderboard from API
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Failed to fetch leaderboard: ${res.status} ${errData.error || ''}`);
      }
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(`Leaderboard Sync Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 2 * 60 * 1000); // 2 mins
    return () => clearInterval(interval);
  }, []);

  // Fuzzy Matching Logic
  const mappedLeaderboard = useMemo(() => {
    if (!leaderboard || teams.length === 0) return leaderboard?.players || [];

    const fuse = new Fuse(teams.flatMap(t => t.players.map(p => ({ name: p, owner: t.ownerName, color: t.color }))), {
      keys: ['name'],
      threshold: 0.3
    });

    return leaderboard.players.map(p => {
      const result = fuse.search(p.name);
      if (result.length > 0) {
        return {
          ...p,
          teamOwner: result[0].item.owner,
          teamColor: result[0].item.color
        };
      }
      return p;
    });
  }, [leaderboard, teams]);

  const teamStats = useMemo(() => {
    const stats: Record<string, number> = {};
    teams.forEach(t => stats[t.ownerName] = 0);
    mappedLeaderboard.slice(0, 40).forEach(p => {
      if (p.teamOwner) {
        stats[p.teamOwner] = (stats[p.teamOwner] || 0) + 1;
      }
    });
    return stats;
  }, [mappedLeaderboard, teams]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const cleanupDuplicates = async () => {
    if (!isAdmin) return;
    try {
      const seen = new Set<string>();
      const toDelete: string[] = [];
      
      teams.forEach(t => {
        if (seen.has(t.ownerName.toLowerCase())) {
          toDelete.push(t.id);
        } else {
          seen.add(t.ownerName.toLowerCase());
        }
      });

      for (const id of toDelete) {
        await deleteDoc(doc(db, 'teams', id));
      }
      alert(`Deleted ${toDelete.length} duplicate teams.`);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 rotate-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center">
              <span className="text-emerald-600">Golf</span>
              <span className="text-slate-500">Tracker</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-neutral-200" referrerPolicy="no-referrer" />
                <button onClick={handleLogout} className="text-sm font-medium text-neutral-600 hover:text-emerald-600 flex items-center gap-1">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'teams', label: 'Teams', icon: Users },
            ...(isAdmin ? [
              { id: 'draft', label: 'Draft Parser', icon: FileUp },
              { id: 'recap', label: 'Weekly Recap', icon: Trophy },
            ] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 py-4 border-b-2 transition-all font-medium text-sm",
                activeTab === tab.id 
                  ? "border-emerald-600 text-emerald-600" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-900 font-bold">×</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Leaderboard 
                tournamentName={leaderboard?.tournamentName || 'Loading...'}
                lastUpdated={leaderboard?.lastUpdated || ''}
                players={mappedLeaderboard}
                teamStats={teamStats}
                latestResult={results[0] ? {
                  ...results[0],
                  winnerName: teams.find(t => t.id === results[0].winnerTeamId)?.ownerName || results[0].winnerTeamId,
                  winnerTraits: teams.find(t => t.id === results[0].winnerTeamId)?.traits || []
                } : undefined}
                onRefresh={fetchLeaderboard}
              />
            )}
            {activeTab === 'teams' && (
              <TeamRoster 
                teams={teams} 
                leaderboard={mappedLeaderboard}
              />
            )}
            {activeTab === 'draft' && isAdmin && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button 
                    onClick={cleanupDuplicates}
                    className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline"
                  >
                    Cleanup Duplicate Teams
                  </button>
                </div>
                <DraftParser 
                  onTeamsParsed={async (newTeams) => {
                    // Save to Firebase
                    for (const t of newTeams) {
                      // Check if team already exists
                      const existingTeam = teams.find(et => et.ownerName.toLowerCase() === t.ownerName.toLowerCase());
                      if (existingTeam) {
                        // Update existing team instead of adding new one
                        await updateDoc(doc(db, 'teams', existingTeam.id), t);
                      } else {
                        await addDoc(collection(db, 'teams'), t);
                      }
                    }
                    setActiveTab('teams');
                  }}
                />
              </div>
            )}
            {activeTab === 'recap' && isAdmin && (
              <WeeklyRecap 
                results={results}
                teams={teams}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale">
            <Trophy className="w-5 h-5" />
            <span className="font-black italic uppercase tracking-tighter flex items-center">
              <span className="text-emerald-600">Golf</span>
              <span className="text-slate-500">Tracker</span>
            </span>
          </div>
          <p className="text-neutral-400 text-xs font-medium uppercase tracking-widest">© 2026 GolfTracker • Darrell Ltd.</p>
        </div>
      </footer>
    </div>
  );
}
