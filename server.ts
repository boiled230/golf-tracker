import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Scraping service for ESPN Leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { data } = await axios.get('https://www.espn.com/golf/leaderboard', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });
      const $ = cheerio.load(data);
      
      const tournamentName = $('.Leaderboard__Event__Title').text().trim() || $('.eventAndLocation__name').text().trim() || 'PGA Tournament';
      const players: any[] = [];

      // ESPN often uses different table structures. Let's try multiple selectors.
      const rows = $('tr.Table__TR, tr.leaderboard_player_row, .Table__TR--sm');
      
      rows.each((i, el) => {
        const $row = $(el);
        const tds = $row.find('td');
        
        if (tds.length >= 4) {
          // Explicit mapping based on common ESPN structure
          // POS | PLAYER | SCORE | THRU | TODAY | R1 | R2 | R3 | R4 | TOT
          const rank = $(tds[0]).text().trim();
          
          // Player name is usually in the second column, often inside an <a> or a specific class
          let name = $row.find('.Leaderboard__PlayerName, .playerName, a').first().text().trim();
          if (!name) {
            name = $(tds[1]).text().trim().split('\n')[0].trim();
          }
          
          // Find score and thru: 
          // POS (0) | PLAYER (1) | SCORE (2) | THRU (3) | TODAY (4) | ...
          let totalScore = $(tds[2]).text().trim();
          let thru = $(tds[3]).text().trim() || '-';
          
          // Robust check for score and thru: 
          // Sometimes columns are shifted or missing.
          // We look for a score pattern first, then look for thru indicators nearby.
          let scoreIdx = -1;
          for (let j = 1; j < tds.length; j++) {
            const val = $(tds[j]).text().trim();
            if (val === name) continue;
            if (val === 'E' || val.startsWith('-') || val.startsWith('+') || /^[+-]?\d+$/.test(val)) {
              scoreIdx = j;
              totalScore = val;
              break;
            }
          }

          if (scoreIdx !== -1) {
            // Thru is usually the next cell, but let's check a few around it
            const possibleThruIdxs = [scoreIdx + 1, scoreIdx + 2, scoreIdx - 1];
            for (const idx of possibleThruIdxs) {
              if (idx >= 0 && idx < tds.length) {
                const val = $(tds[idx]).text().trim();
                // Thru indicators: 'F', 'Final', 'THRU', numbers 1-18, or time like '10:30 AM'
                if (val === 'F' || val === 'Final' || val === 'THRU' || /^(1[0-8]|[1-9])$/.test(val) || val.includes(':') || val.toLowerCase().includes('am') || val.toLowerCase().includes('pm')) {
                  thru = val;
                  break;
                }
              }
            }
          }
          
          // Ensure thru is not just a copy of score
          if (thru === totalScore) {
            thru = '-';
          }
          
          // Fallback if not found
          if (!totalScore || totalScore === name) {
            totalScore = '--';
          }
          
          // The 'Score Only' Rule: prevent name from ever being saved as a score
          if (totalScore === name) {
            totalScore = '--';
          }
          
          const round = $(tds[4]).text().trim() || '-';
          
          let photoUrl = '';
          const img = $row.find('img').first();
          if (img.length) {
            photoUrl = img.attr('src') || img.attr('data-src') || '';
          }

          if (name && rank && rank !== 'POS' && !name.toLowerCase().includes('player')) {
            players.push({
              rank,
              name,
              totalScore,
              thru,
              round,
              photoUrl,
              movement: 'stable'
            });
          }
        }
      });

      // If no players found, try a more aggressive search
      if (players.length === 0) {
        $('tr').each((i, el) => {
           const text = $(el).text();
           if (text.includes('Leaderboard') || text.includes('POS')) return;
           const tds = $(el).find('td');
           if (tds.length >= 3) {
             const name = $(el).find('a').first().text().trim();
             if (name) {
               players.push({
                 rank: $(tds[0]).text().trim(),
                 name,
                 totalScore: $(tds[2]).text().trim(),
                 thru: $(tds[3]).text().trim(),
                 round: $(tds[4]).text().trim(),
                 movement: 'stable'
               });
             }
           }
        });
      }

      res.json({
        tournamentName,
        lastUpdated: new Date().toISOString(),
        players: players.slice(0, 100)
      });
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
