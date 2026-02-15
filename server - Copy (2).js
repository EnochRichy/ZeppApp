const http = require('http');
const https = require('https');

const STOCKS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS'];

let stockData = [];
let lastUpdate = null;

function fetchSingleStock(symbol) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    console.log(`Fetching ${symbol}...`);
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.chart && json.chart.result && json.chart.result[0]) {
            const result = json.chart.result[0];
            const meta = result.meta;
            
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;
            const displayName = symbol.replace('.NS', '');
            
            console.log(`✓ ${displayName}: ₹${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
            
            resolve({
              symbol: displayName,
              price: price.toFixed(2),
              change: change.toFixed(2),
              changePercent: changePercent.toFixed(2),
              displayText: `${displayName}: ₹${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
            });
          } else {
            console.log(`No data for ${symbol}`);
            resolve({
              symbol: symbol.replace('.NS', ''),
              displayText: `${symbol.replace('.NS', '')}: No data`
            });
          }
        } catch (e) {
          console.log(`Error parsing ${symbol}:`, e.message);
          resolve({
            symbol: symbol.replace('.NS', ''),
            displayText: `${symbol.replace('.NS', '')}: Error`
          });
        }
      });
    }).on('error', (e) => {
      console.log(`Connection error:`, e.message);
      resolve({
        symbol: symbol.replace('.NS', ''),
        displayText: `${symbol.replace('.NS', '')}: Error`
      });
    });
  });
}

async function fetchStockData() {
  console.log('\n========== Fetching NSE Stock Data ==========');
  const results = [];
  
  for (const symbol of STOCKS) {
    const result = await fetchSingleStock(symbol);
    results.push(result);
    
    // Wait 5 seconds between each stock to avoid rate limits
    if (symbol !== STOCKS[STOCKS.length - 1]) {
      console.log('Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  stockData = results;
  lastUpdate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n✓ All stocks updated at ${lastUpdate}`);
  console.log('===========================================\n');
}

// Fetch immediately
fetchStockData();

// Then fetch every 2 minutes (slower to avoid rate limits)
setInterval(fetchStockData, 120000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/data' && req.method === 'GET') {
    const todoList = stockData.map(stock => stock.displayText);
    res.writeHead(200);
    res.end(JSON.stringify({ todoList, lastUpdate, timestamp: Date.now() }));
    console.log(`[${new Date().toLocaleTimeString()}] Sent:`, todoList);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(8080, '0.0.0.0', () => {
  console.log(`\n📊 NSE Stock Server - Port 8080`);
  console.log(`Tracking: RELIANCE, TCS, INFY`);
  console.log(`Update: Every 2 minutes (to avoid rate limits)`);
  console.log(`Watch updates: Every 10 seconds from cache\n`);
});