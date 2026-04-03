import React, { useState, useRef } from 'react';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { cn, getTeamColor } from '../lib/utils';
import { VIBRANT_COLORS } from '../constants';

interface DraftParserProps {
  onTeamsParsed: (teams: any[]) => void;
}

export function DraftParser({ onTeamsParsed }: DraftParserProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    // Preview image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      
      // Parse with Gemini
      await parseWithGemini(file);
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => parseCSV(e.target?.result as string);
      reader.readAsText(file);
    } else {
      setError('Unsupported file format. Please upload an image or CSV.');
      setLoading(false);
    }
  };

  const parseWithGemini = async (file: File) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: 'Extract fantasy golf teams from this image. Each column is a team. The first row is the team owner name. Subsequent rows are drafted players. Also extract any personality traits mentioned at the bottom. Return a JSON array of objects with ownerName, players[], and traits[].' }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ownerName: { type: Type.STRING },
                players: { type: Type.ARRAY, items: { type: Type.STRING } },
                traits: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['ownerName', 'players']
            }
          }
        }
      });

      const teams = JSON.parse(response.text || '[]');
      
      // Filter out duplicate owners (case-insensitive)
      const uniqueTeams = teams.reduce((acc: any[], current: any) => {
        const x = acc.find(item => item.ownerName.toLowerCase() === current.ownerName.toLowerCase());
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      const teamsWithColors = uniqueTeams.map((t: any) => {
        const color = getTeamColor(t.ownerName);
        return {
          ...t,
          color: color,
          imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(t.ownerName)}&backgroundColor=${color.replace('#', '')}`,
          totalEarnings: 0
        };
      });
      
      onTeamsParsed(teamsWithColors);
    } catch (err) {
      console.error('Gemini parsing error:', err);
      setError('AI parsing failed. Please try a clearer image or CSV.');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (content: string) => {
    try {
      const lines = content.split('\n').map(l => l.split(',').map(c => c.trim()));
      const owners = Array.from(new Set(lines[0].filter(Boolean))); // Unique owners
      const teams = owners.map((owner, colIdx) => {
        const players: string[] = [];
        const traits: string[] = [];
        for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
          const val = lines[rowIdx][colIdx];
          if (val) {
            if (rowIdx < 13) players.push(val);
            else traits.push(val);
          }
        }
        return {
          ownerName: owner,
          players,
          traits,
          color: getTeamColor(owner),
          totalEarnings: 0
        };
      });
      onTeamsParsed(teams);
    } catch (err) {
      setError('CSV parsing failed. Ensure the format is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-emerald-900">Draft Sheet Parser</h2>
        <p className="text-neutral-500">Upload a screenshot of your draft board or a CSV file. Our AI will automatically extract teams, players, and personality traits.</p>
      </div>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
          loading ? "border-emerald-300 bg-emerald-50 cursor-wait" : "border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/30"
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,.csv"
        />
        
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <p className="text-emerald-700 font-bold animate-pulse">AI is analyzing your draft sheet...</p>
          </>
        ) : (
          <>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neutral-700">Click to upload or drag & drop</p>
              <p className="text-sm text-neutral-400">Supports Screenshot (PNG/JPG) or CSV</p>
            </div>
          </>
        )}
      </div>

      {preview && (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Preview</h4>
          <img src={preview} alt="Draft Preview" className="w-full h-48 object-cover rounded-lg border border-neutral-100" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          How it works
        </h4>
        <ul className="text-xs text-emerald-700 space-y-2 list-disc list-inside">
          <li>Each column represents one fantasy team.</li>
          <li>The top row should be the Team Owner's name.</li>
          <li>Rows 2-13 are the drafted golfers.</li>
          <li>Bottom rows can include personality traits (e.g., "talks a lot", "always late").</li>
          <li>AI handles minor spelling differences and formatting.</li>
        </ul>
      </div>
    </div>
  );
}
