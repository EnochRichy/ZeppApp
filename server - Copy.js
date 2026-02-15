const http = require('http');

const STOCKS = ['RELIANCE', 'TCS', 'INFY'];
let stockData = [];

function generateMockData() {
  stockData = STOCKS.map(symbol => {
    const basePrice = Math.random() * 2000 + 1000;
    const change = (Math.random() - 0.5) * 50;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol: symbol,
      price: basePrice.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      displayText: `${symbol}: ₹${basePrice.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
    };
  });
  
  console.log('Mock data updated:', stockData);
}

// Update mock data every 10 seconds
generateMockData();
setInterval(generateMockData, 10000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/data' && req.method === 'GET') {
    const todoList = stockData.map(stock => stock.displayText);
    
    res.writeHead(200);
    res.end(JSON.stringify({
      todoList: todoList,
      timestamp: Date.now()
    }));
    
    console.log('Sent:', todoList);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(8080, '0.0.0.0', () => {
  console.log('Mock Stock Server running on port 8080');
});