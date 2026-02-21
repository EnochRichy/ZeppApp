import { MessageBuilder } from '../shared/message-side'
import { DEFAULT_TODO_LIST } from './../utils/constants'

const messageBuilder = new MessageBuilder()

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const YAHOO_CHART_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart'

const YAHOO_QUOTE_URL =
  'https://query1.finance.yahoo.com/v7/finance/quote'

const DEFAULT_SYMBOL = 'RELIANCE.NS'

let stockInterval = null

/* -------------------------------------------------------
   UTILITIES
------------------------------------------------------- */

function normalizeSymbol(symbol) {
  if (!symbol) return DEFAULT_SYMBOL
  const clean = symbol.trim().toUpperCase()
  return clean.endsWith('.NS') ? clean : `${clean}.NS`
}

function getConfiguredSymbol() {
  return normalizeSymbol(
    settings.settingsStorage.getItem('stockSymbol') ||
      DEFAULT_SYMBOL
  )
}

function getTodoList() {
  return settings.settingsStorage.getItem('todoList')
    ? JSON.parse(settings.settingsStorage.getItem('todoList'))
    : [...DEFAULT_TODO_LIST]
}

/* -------------------------------------------------------
   FETCH SINGLE STOCK
------------------------------------------------------- */

function fetchStockData(symbolInput) {
  const symbol = normalizeSymbol(symbolInput)

  console.log(`Fetching stock for ${symbol}`)

  const url = `${YAHOO_CHART_URL}/${symbol}?interval=1d&range=1d`

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const result = data.chart?.result?.[0]
      const meta = result?.meta

      if (!meta || meta.regularMarketPrice == null) {
        throw new Error('Invalid API response')
      }

      const price = parseFloat(
        meta.regularMarketPrice.toFixed(2)
      )

      console.log(`Price for ${symbol}: ₹${price}`)

      // Store clean stock data (no todo mixing)
      settings.settingsStorage.setItem(
        'stockData',
        JSON.stringify({
          symbol,
          lastPrice: price,
          updatedAt: Date.now()
        })
      )

      // Send to watch
      messageBuilder.call([`₹${price}`])
    })
    .catch((err) => {
      console.log('Fetch error:', err.message)

      messageBuilder.call({
        type: 'STOCK_ERROR',
        error: err.message
      })
    })
}

/* -------------------------------------------------------
   FETCH MULTIPLE STOCKS (CORRECT ENDPOINT)
------------------------------------------------------- */

function fetchMultipleStocks(symbols = []) {
  if (!Array.isArray(symbols) || symbols.length === 0)
    return

  const formattedSymbols = symbols
    .map((s) => normalizeSymbol(s))
    .join(',')

  const url = `${YAHOO_QUOTE_URL}?symbols=${formattedSymbols}`

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const results = data.quoteResponse?.result || []

      const stocksData = results.map((item) => ({
        symbol: item.symbol,
        price: item.regularMarketPrice,
        change: item.regularMarketChangePercent
      }))

      settings.settingsStorage.setItem(
        'stocksData',
        JSON.stringify(stocksData)
      )

      messageBuilder.call({
        type: 'STOCKS_UPDATE',
        data: stocksData
      })
    })
    .catch((err) => {
      console.log('Multi-stock fetch error:', err.message)
    })
}

/* -------------------------------------------------------
   APP SIDE SERVICE
------------------------------------------------------- */

AppSideService({
  onInit() {
    console.log('App-side initialized')

    messageBuilder.listen(() => {})

    // Listen for settings changes
    settings.settingsStorage.addListener(
      'change',
      ({ key, newValue }) => {
        if (key === 'stockSymbol') {
          fetchStockData(newValue)
        }

        if (key === 'todoList') {
          messageBuilder.call({
            type: 'TODO_UPDATE',
            data: getTodoList()
          })
        }
      }
    )

    /* ---------------- MESSAGE HANDLER ---------------- */

    messageBuilder.on('request', (ctx) => {
      const payload = messageBuilder.buf2Json(
        ctx.request.payload
      )

      switch (payload.method) {
        case 'GET_TODO_LIST':
          ctx.response({
            data: { result: getTodoList() }
          })
          break

        case 'ADD': {
          const list = getTodoList()
          const newList = [
            ...list,
            String(Math.floor(Math.random() * 100))
          ]
          settings.settingsStorage.setItem(
            'todoList',
            JSON.stringify(newList)
          )
          ctx.response({
            data: { result: newList }
          })
          break
        }

        case 'DELETE': {
          const { index } = payload.params || {}
          const list = getTodoList()
          const newList = list.filter((_, i) => i !== index)
          settings.settingsStorage.setItem(
            'todoList',
            JSON.stringify(newList)
          )
          ctx.response({
            data: { result: newList }
          })
          break
        }

        case 'GET_STOCK_DATA': {
          const stockData =
            settings.settingsStorage.getItem('stockData')
          ctx.response({
            data: {
              result: stockData
                ? JSON.parse(stockData)
                : null
            }
          })
          break
        }

        case 'FETCH_STOCK_NOW': {
          fetchStockData(
            payload.params?.symbol ||
              getConfiguredSymbol()
          )
          ctx.response({
            data: { result: 'Fetching...' }
          })
          break
        }

        case 'SET_STOCK_SYMBOL': {
          const symbol = payload.params?.symbol
          if (symbol) {
            settings.settingsStorage.setItem(
              'stockSymbol',
              symbol
            )
            fetchStockData(symbol)
            ctx.response({
              data: { result: 'Symbol updated' }
            })
          }
          break
        }

        case 'FETCH_MULTIPLE_STOCKS': {
          fetchMultipleStocks(payload.params?.symbols)
          ctx.response({
            data: { result: 'Fetching multiple...' }
          })
          break
        }

        default:
          ctx.response({
            data: { result: 'Unknown method' }
          })
      }
    })
  },

  onRun() {
    console.log('App-side running')

    // Immediate fetch
    fetchStockData(getConfiguredSymbol())

    // Periodic refresh
    stockInterval = setInterval(() => {
      fetchStockData(getConfiguredSymbol())
    }, 30000)
  },

  onDestroy() {
    console.log('App-side destroyed')

    if (stockInterval) {
      clearInterval(stockInterval)
      stockInterval = null
    }
  }
})