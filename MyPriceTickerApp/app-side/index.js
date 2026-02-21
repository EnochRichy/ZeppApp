import { MessageBuilder } from '../shared/message-side'
import { DEFAULT_TODO_LIST } from './../utils/constants'

const messageBuilder = new MessageBuilder()

const YAHOO_CHART_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart'

let stockInterval = null

function normalizeSymbol(symbol) {
  const clean = symbol.trim().toUpperCase()
  return clean.endsWith('.NS') ? clean : `${clean}.NS`
}

function getStockList() {
  const raw = settings.settingsStorage.getItem('todoList')

  if (!raw) return [...DEFAULT_TODO_LIST]

  try {
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      return parsed
    }

    if (typeof parsed === 'string') {
      return JSON.parse(parsed)
    }

    return [...DEFAULT_TODO_LIST]
  } catch (e) {
    console.log('Parse error:', e)
    return [...DEFAULT_TODO_LIST]
  }
}

function fetchSingleStock(symbol) {
  const finalSymbol = normalizeSymbol(symbol)
  const url = `${YAHOO_CHART_URL}/${finalSymbol}?interval=1d&range=1d`

  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const result = data.chart?.result?.[0]
      const meta = result?.meta

      if (!meta || meta.regularMarketPrice == null) {
        return null
      }

      const price = meta.regularMarketPrice.toFixed(2)
      const change = meta.regularMarketChangePercent?.toFixed(2) || '0.00'

      return `${symbol.toUpperCase()}  ₹${price}  ${change}%`
    })
    .catch(() => null)
}

function fetchAllStocks() {
  const symbols = getStockList()

  if (!symbols || symbols.length === 0) {
    messageBuilder.call([])
    return
  }

  Promise.all(symbols.map(s => fetchSingleStock(s)))
    .then(results => {
      const displayData = results.filter(r => r !== null)
      messageBuilder.call(displayData)
    })
}

AppSideService({
  onInit() {
  messageBuilder.listen(() => {})

  // Handle manual refresh request
  messageBuilder.on('request', (ctx) => {
    const payload = messageBuilder.buf2Json(ctx.request.payload)

    if (payload.method === 'REFRESH_STOCKS') {
      console.log('Manual refresh triggered')

      fetchAllStocks()

      ctx.response({
        data: { result: 'OK' }
      })
    }
  })

  // Handle settings change
  settings.settingsStorage.addListener(({ key }) => {
    if (key === 'todoList') {
      fetchAllStocks()
    }
  })
},

  onRun() {
    fetchAllStocks()

    stockInterval = setInterval(() => {
      fetchAllStocks()
    }, 30000)
  },

  onDestroy() {
    if (stockInterval) {
      clearInterval(stockInterval)
      stockInterval = null
    }
  }
})