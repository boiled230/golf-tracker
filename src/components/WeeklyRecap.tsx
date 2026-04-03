import React, { useState } from 'react';
import { WeeklyResult, Team } from '../types';
import { Trophy, Calendar, Sparkles, MessageSquareQuote, TrendingDown, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface WeeklyRecapProps {
  results: WeeklyResult[];
  teams: Team[];
}

export function WeeklyRecap({ results, teams }: WeeklyRecapProps) {
  const [generating, setGenerating] = useState(false);
  const [selectedGolfer, setSelectedGolfer] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('The Masters');
  const [customTournament, setCustomTournament] = useState('');
  const [isCustomTournament, setIsCustomTournament] = useState(false);
  const [previewOptions, setPreviewOptions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const tournaments = [
    'The Masters',
    'PGA Championship',
    'U.S. Open',
    'The Open Championship',
    'The Players Championship',
    'WM Phoenix Open',
    'Arnold Palmer Invitational',
    'RBC Heritage',
    'Wells Fargo Championship',
    'the Memorial Tournament',
    'Travelers Championship',
    'FedEx St. Jude Championship',
    'BMW Championship',
    'TOUR Championship',
    'Valero Texas Open',
    'Rocket Mortgage Classic',
    'John Deere Classic',
    'Genesis Invitational',
    'Cognizant Classic',
    'Puerto Rico Open',
    'Valspar Championship',
    'Texas Children\'s Houston Open',
    'Corales Puntacana Championship',
    'Zurich Classic of New Orleans',
    'THE CJ CUP Byron Nelson',
    'Myrtle Beach Classic',
    'Charles Schwab Challenge',
    'RBC Canadian Open',
    'ISCO Championship',
    'Barracuda Championship',
    '3M Open',
    'Wyndham Championship',
    'Custom...'
  ];

  const allGolfers = Array.from(new Set(teams.flatMap(t => t.players))).sort();

  const generateRecap = async () => {
    if (!selectedGolfer) return;
    const tournamentToUse = isCustomTournament ? customTournament : selectedTournament;
    if (!tournamentToUse) return;

    setGenerating(true);
    setSelectedIndex(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const winnerTeam = teams.find(t => t.players.includes(selectedGolfer)) || teams[0];
      const teamsWithNoTop40 = teams.filter(t => (t.playersInTop40 || 0) === 0).map(t => t.ownerName);
      const allOwnerNames = teams.map(t => t.ownerName);
      const ownerTraits = teams.map(t => `${t.ownerName}: ${t.traits?.join(', ') || 'None'}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 humorous fantasy golf weekly recap options. 
        Winner Team: ${winnerTeam.ownerName}
        Winning Golfer: ${selectedGolfer}
        Tournament: ${tournamentToUse}
        Teams with 0 Top 40 players: ${teamsWithNoTop40.join(', ') || 'None'}
        All Team Owners: ${allOwnerNames.join(', ')}
        Owner Personality Traits:
        ${ownerTraits}
        
        Style: Sports headlines, wordplay, professional but fun.
        IMPORTANT: 
        1. Use puns involving the golfer's name and the course/tournament name.
        2. Integrate the Team Owner’s personality traits into the roast or headline.
        3. DO NOT roast teams that lost generally. 
        4. ONLY call out teams if they have NO top 40 golfers this week.
        5. The headline should prominently feature the winning team name.
        6. Each option should have a headline, subHeadline, and a 2-3 sentence roast/banter.
        7. For EACH option, generate a new, unique, funny golf-themed nickname for EVERY team owner (e.g. 'The Sand Trap King', 'Birdie Baron', 'Three-Putt Professional').
        
        Example: 'Hubbard’s Houston Heist: [Owner Name]’s [Trait] energy leads to a Texas Takeover!'
        
        Return JSON array of 3 objects.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subHeadline: { type: Type.STRING },
                roast: { type: Type.STRING },
                nicknames: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ownerName: { type: Type.STRING },
                      nickname: { type: Type.STRING }
                    },
                    required: ['ownerName', 'nickname']
                  }
                }
              },
              required: ['headline', 'subHeadline', 'roast', 'nicknames']
            }
          }
        }
      });

      const options = JSON.parse(response.text || '[]');
      setPreviewOptions(options.map((opt: any) => ({
        ...opt,
        winnerTeamId: winnerTeam.id,
        winningGolfer: selectedGolfer,
        weekEnding: new Date().toISOString().split('T')[0],
        tournamentName: tournamentToUse
      })));
    } catch (err) {
      console.error('Recap generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const publishRecap = async () => {
    if (selectedIndex === null || !previewOptions[selectedIndex]) return;
    const option = previewOptions[selectedIndex];
    try {
      // Publish result
      await addDoc(collection(db, 'results'), option);
      
      // Update team nicknames
      if (option.nicknames && Array.isArray(option.nicknames)) {
        const { updateDoc, doc } = await import('firebase/firestore');
        for (const nick of option.nicknames) {
          const team = teams.find(t => t.ownerName.toLowerCase() === nick.ownerName.toLowerCase());
          if (team) {
            await updateDoc(doc(db, 'teams', team.id), {
              nickname: nick.nickname
            });
          }
        }
      }

      setPreviewOptions([]);
      setSelectedIndex(null);
      setSelectedGolfer('');
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  return (
    <div className="space-y-12">
      <div className="bg-white rounded-[2rem] border border-neutral-200 p-8 shadow-xl space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-emerald-900 uppercase italic tracking-tighter">Weekly Recap Manager</h2>
          <p className="text-neutral-500 font-medium">Generate multiple options and choose the best one for the dashboard.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Select Tournament</label>
            <div className="space-y-3">
              <select 
                value={isCustomTournament ? 'Custom...' : selectedTournament} 
                onChange={(e) => {
                  if (e.target.value === 'Custom...') {
                    setIsCustomTournament(true);
                  } else {
                    setIsCustomTournament(false);
                    setSelectedTournament(e.target.value);
                  }
                }}
                className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
              >
                {tournaments.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {isCustomTournament && (
                <input 
                  type="text"
                  placeholder="Enter tournament name..."
                  value={customTournament}
                  onChange={(e) => setCustomTournament(e.target.value)}
                  className="w-full bg-neutral-50 border-2 border-emerald-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Select Winning Golfer</label>
            <select 
              value={selectedGolfer} 
              onChange={(e) => setSelectedGolfer(e.target.value)}
              className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
            >
              <option value="">-- Choose a Golfer --</option>
              {allGolfers.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={generateRecap}
          disabled={generating || !selectedGolfer}
          className="w-full bg-emerald-600 text-white px-8 py-5 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
          {previewOptions.length > 0 ? 'Regenerate Options' : 'Generate 3 Options'}
        </button>
      </div>

      {previewOptions.length > 0 && (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] mb-2">Select an Option to Publish</h3>
            <div className="w-20 h-1 bg-emerald-600 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {previewOptions.map((opt, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  selectedIndex === idx ? "scale-[1.02]" : "hover:scale-[1.01] opacity-70 hover:opacity-100"
                )}
              >
                <div className={cn(
                  "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 p-8 rounded-[2.5rem] shadow-2xl border-4 transition-all",
                  selectedIndex === idx ? "border-yellow-400" : "border-white/20"
                )}>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl rotate-3 shrink-0">
                      <Trophy className="w-12 h-12 text-yellow-300" />
                    </div>
                    <div className="space-y-2 flex-1 text-center md:text-left text-white">
                      <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                        {opt.headline}
                      </h4>
                      <p className="text-lg font-bold text-emerald-50 italic opacity-90">
                        {opt.subHeadline}
                      </p>
                      <p className="text-sm italic text-emerald-100/80">{opt.roast}</p>
                    </div>
                    {selectedIndex === idx && (
                      <div className="bg-yellow-400 text-emerald-900 p-3 rounded-full shadow-lg">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={publishRecap}
            disabled={selectedIndex === null}
            className="w-full bg-neutral-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl disabled:opacity-30"
          >
            Publish Selected Option
          </button>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Past Recaps</h3>
        {results.length === 0 ? (
          <p className="text-neutral-400 italic text-sm">No recaps published yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {results.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-700">{r.headline}</p>
                  <p className="text-xs text-neutral-500">{r.tournamentName} • {new Date(r.weekEnding).toLocaleDateString()}</p>
                </div>
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

