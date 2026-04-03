import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';

const app = express();

app.use(express.json());

// Scraping service for ESPN Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    console.log('Fetching leaderboard from ESPN...');
    const { data } = await axios.get('https://www.espn.com/golf/leaderboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    });
    console.log('Data received, parsing...');
    const $ = cheerio.load(data);
    
    const tournamentName = $('.Leaderboard__Event__Title').text().trim() || $('.eventAndLocation__name').text().trim() || 'PGA Tournament';
    const players: any[] = [];

    const rows = $('tr.Table__TR, tr.leaderboard_player_row, .Table__TR--sm');
    
    rows.each((i, el) => {
      const $row = $(el);
      const tds = $row.find('td');
      
      if (tds.length >= 4) {
        const rank = $(tds[0]).text().trim();
        let name = $row.find('.Leaderboard__PlayerName, .playerName, a').first().text().trim();
        if (!name) {
          name = $(tds[1]).text().trim().split('\n')[0].trim();
        }
        
        let totalScore = $(tds[2]).text().trim();
        let thru = $(tds[3]).text().trim() || '-';
        
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
          const possibleThruIdxs = [scoreIdx + 1, scoreIdx + 2, scoreIdx - 1];
          for (const idx of possibleThruIdxs) {
            if (idx >= 0 && idx < tds.length) {
              const val = $(tds[idx]).text().trim();
              if (val === 'F' || val === 'Final' || val === 'THRU' || /^(1[0-8]|[1-9])$/.test(val) || val.includes(':') || val.toLowerCase().includes('am') || val.toLowerCase().includes('pm')) {
                thru = val;
                break;
              }
            }
          }
        }
        
        if (thru === totalScore) {
          thru = '-';
        }
        
        if (!totalScore || totalScore === name) {
          totalScore = '--';
        }
        
        if (totalScore === name) {
          totalScore = '--';
        }
        
        const today = $(tds[4]).text().trim() || '-';
        const r1 = $(tds[5]).text().trim() || '-';
        const r2 = $(tds[6]).text().trim() || '-';
        const r3 = $(tds[7]).text().trim() || '-';
        const r4 = $(tds[8]).text().trim() || '-';
        const total = $(tds[9]).text().trim() || '-';
        
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
            today,
            r1,
            r2,
            r3,
            r4,
            total,
            photoUrl,
            movement: 'stable'
          });
        }
      }
    });

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
               today: $(tds[4]).text().trim(),
               r1: $(tds[5]).text().trim(),
               r2: $(tds[6]).text().trim(),
               r3: $(tds[7]).text().trim(),
               r4: $(tds[8]).text().trim(),
               total: $(tds[9]).text().trim(),
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
    // Return a graceful fallback instead of 500 to keep the UI alive
    res.json({
      tournamentName: 'Live Leaderboard (Syncing...)',
      lastUpdated: new Date().toISOString(),
      players: [],
      error: 'Scraping failed'
    });
  }
});

export default app;
