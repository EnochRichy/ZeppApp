import { MessageBuilder } from '../shared/message-side'
import { DEFAULT_TODO_LIST } from './../utils/constants'
const messageBuilder = new MessageBuilder()

// NSE API configuration
const NSE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const DEFAULT_SYMBOL = 'RELIANCE.NS' // You can change this to any NSE symbol

function getTodoList() {
  return settings.settingsStorage.getItem('todoList')
    ? JSON.parse(settings.settingsStorage.getItem('todoList'))
    : [...DEFAULT_TODO_LIST]
}

// Fetch stock data directly from NSE
function fetchStockData(symbol = DEFAULT_SYMBOL) {
  console.log(`Fetching Yahoo Finance data for ${symbol}...`)
  
  const url = `${NSE_BASE_URL}/${symbol}?interval=1d&range=1d`
  
  fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      console.log('Raw Yahoo Finance data received')
      
      const result = data.chart?.result?.[0]
      const meta = result?.meta
      const quote = result?.indicators?.quote?.[0]
      
      if (!meta || !quote) {
        throw new Error('Invalid response structure')
      }
      
      const lastPrice = meta.regularMarketPrice || quote.close[0] || 0
      const formattedPrice = parseFloat(lastPrice.toFixed(2))
      
      console.log('Current stock price:', formattedPrice)
      
      // Store in settings
      settings.settingsStorage.setItem('stockData', JSON.stringify({ lastPrice: formattedPrice }))
      
      // Send only the price as a single-item array
      const displayData = [`₹${formattedPrice}`]
      
      console.log('Sending price to watch:', displayData)
      
      // Send to watch
      messageBuilder.call(displayData)
      
      // Update todoList in settings
      settings.settingsStorage.setItem('todoList', JSON.stringify(displayData))
      
      console.log('Stock price sent to watch')
    })
    .catch(error => {
      console.log('Yahoo Finance fetch error:', error.message)
      messageBuilder.call([`Error: ${error.message}`])
    })
}
// Alternative: Fetch multiple stocks
function fetchMultipleStocks(symbols = ['RELIANCE', 'TCS', 'INFY']) {
  console.log('Fetching multiple stocks:', symbols)
  
  Promise.all(
    symbols.map(symbol => 
      fetch(`${NSE_BASE_URL}/quote-equity?symbol=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => ({
        symbol: data.info?.symbol,
        price: data.priceInfo?.lastPrice,
        change: data.priceInfo?.pChange
      }))
      .catch(err => ({ symbol, error: err.message }))
    )
  )
  .then(stocksData => {
    console.log('Multiple stocks data:', stocksData)
    
    settings.settingsStorage.setItem('stocksData', JSON.stringify(stocksData))
    messageBuilder.call({ 
      type: 'STOCKS_UPDATE',
      data: stocksData 
    })
  })
}

// Get stock symbol from settings (allows user configuration)
function getConfiguredSymbol() {
  return settings.settingsStorage.getItem('stockSymbol') || DEFAULT_SYMBOL
}

AppSideService({
  onInit() {
    console.log('App-side initialized')
    
    messageBuilder.listen(() => {})
    
    settings.settingsStorage.addListener('change', ({ key, newValue, oldValue }) => {
      console.log('Settings changed:', key)
      
      // If stock symbol changed, fetch new data immediately
      if (key === 'stockSymbol') {
        fetchStockData(newValue)
      }
      
      // Keep existing todo list functionality
      if (key === 'todoList') {
        messageBuilder.call(getTodoList())
      }
    })
    
    messageBuilder.on('request', (ctx) => {
      const payload = messageBuilder.buf2Json(ctx.request.payload)
      
      // Existing todo list methods
      if (payload.method === 'GET_TODO_LIST') {
        ctx.response({
          data: { result: getTodoList() }
        })
      } 
      else if (payload.method === 'ADD') {
        const todoList = getTodoList()
        const newTodoList = [...todoList, String(Math.floor(Math.random() * 100))]
        settings.settingsStorage.setItem('todoList', JSON.stringify(newTodoList))
        ctx.response({
          data: { result: newTodoList }
        })
      } 
      else if (payload.method === 'DELETE') {
        const { params: { index } = {} } = payload
        const todoList = getTodoList()
        const newTodoList = todoList.filter((_, i) => i !== index)
        settings.settingsStorage.setItem('todoList', JSON.stringify(newTodoList))
        ctx.response({
          data: { result: newTodoList }
        })
      }
      // NEW: Stock data methods
      else if (payload.method === 'GET_STOCK_DATA') {
        const stockData = settings.settingsStorage.getItem('stockData')
        ctx.response({
          data: { result: stockData ? JSON.parse(stockData) : null }
        })
      }
      else if (payload.method === 'FETCH_STOCK_NOW') {
        const { params: { symbol } = {} } = payload
        fetchStockData(symbol || getConfiguredSymbol())
        ctx.response({
          data: { result: 'Fetching stock data...' }
        })
      }
      else if (payload.method === 'SET_STOCK_SYMBOL') {
        const { params: { symbol } = {} } = payload
        if (symbol) {
          settings.settingsStorage.setItem('stockSymbol', symbol)
          fetchStockData(symbol)
          ctx.response({
            data: { result: `Symbol set to ${symbol}` }
          })
        } else {
          ctx.response({
            data: { result: 'Invalid symbol' }
          })
        }
      }
      else if (payload.method === 'FETCH_MULTIPLE_STOCKS') {
        const { params: { symbols } = {} } = payload
        fetchMultipleStocks(symbols)
        ctx.response({
          data: { result: 'Fetching multiple stocks...' }
        })
      }
    })
  },
  
  onRun() {
    console.log('App-side running')
    
    // Fetch stock data every 30 seconds (NSE updates are not real-time anyway)
    setInterval(() => {
      const symbol = getConfiguredSymbol()
      fetchStockData(symbol)
    }, 30000) // 30 seconds - adjust as needed
    
    // Fetch immediately on start
    fetchStockData(getConfiguredSymbol())
  },
  
  onDestroy() {
    console.log('App-side destroyed')
  }
})