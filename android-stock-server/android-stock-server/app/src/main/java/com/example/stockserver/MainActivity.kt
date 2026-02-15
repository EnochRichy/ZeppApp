package com.example.stockserver

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    
    private lateinit var server: StockServer
    private lateinit var statusText: TextView
    private lateinit var stockListText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    
    // Stocks to track - customize this list
    private val stocks = listOf("RELIANCE.NS", "TCS.NS", "INFY.NS")
    private var stockData = mutableListOf<StockData>()
    private var job: Job? = null
    
    data class StockData(
        val symbol: String,
        val price: String,
        val change: String,
        val changePercent: String,
        val displayText: String
    )
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        statusText = findViewById(R.id.statusText)
        stockListText = findViewById(R.id.stockListText)
        startButton = findViewById(R.id.startButton)
        stopButton = findViewById(R.id.stopButton)
        
        startButton.setOnClickListener {
            startServer()
        }
        
        stopButton.setOnClickListener {
            stopServer()
        }
        
        updateStatus("Ready to start server")
    }
    
    private fun startServer() {
        try {
            server = StockServer(this)
            server.start()
            
            updateStatus("✓ Server running on port 8080\n\nWaiting for stock data...")
            startButton.isEnabled = false
            stopButton.isEnabled = true
            
            // Start fetching stock data repeatedly
            job = CoroutineScope(Dispatchers.IO).launch {
                while (isActive) {
                    fetchAllStocks()
                    delay(120000) // Update every 2 minutes
                }
            }
            
        } catch (e: Exception) {
            updateStatus("Error starting server: ${e.message}")
        }
    }
    
    private fun stopServer() {
        job?.cancel()
        server.stop()
        updateStatus("Server stopped")
        startButton.isEnabled = true
        stopButton.isEnabled = false
        stockListText.text = ""
    }
    
    private suspend fun fetchAllStocks() {
        val results = mutableListOf<StockData>()
        
        withContext(Dispatchers.Main) {
            updateStatus("Fetching stock data...")
        }
        
        for ((index, symbol) in stocks.withIndex()) {
            val data = fetchSingleStock(symbol)
            if (data != null) {
                results.add(data)
            }
            
            // Show progress
            withContext(Dispatchers.Main) {
                updateStatus("Fetching... ${index + 1}/${stocks.size}")
            }
            
            // Delay between requests to avoid rate limits
            if (index < stocks.size - 1) {
                delay(5000) // 5 seconds
            }
        }
        
        stockData = results
        updateStockDisplay()
    }
    
    private suspend fun fetchSingleStock(symbol: String): StockData? {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=1d")
                val connection = url.openConnection() as HttpURLConnection
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val response = connection.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                
                val result = json.getJSONObject("chart")
                    .getJSONArray("result")
                    .getJSONObject(0)
                val meta = result.getJSONObject("meta")
                
                val price = meta.getDouble("regularMarketPrice")
                val prevClose = meta.getDouble("chartPreviousClose")
                val change = price - prevClose
                val changePercent = (change / prevClose) * 100
                
                val displayName = symbol.replace(".NS", "")
                
                StockData(
                    symbol = displayName,
                    price = "%.2f".format(price),
                    change = "%.2f".format(change),
                    changePercent = "%.2f".format(changePercent),
                    displayText = "$displayName: ₹%.2f (%s%.2f%%)".format(
                        price,
                        if (change >= 0) "+" else "",
                        changePercent
                    )
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    updateStatus("Error fetching ${symbol.replace(".NS", "")}: ${e.message}")
                }
                null
            }
        }
    }
    
    private fun updateStockDisplay() {
        runOnUiThread {
            updateStatus("✓ Server running on port 8080")
            
            val stockText = buildString {
                append("📊 Live Stock Data\n")
                append("═".repeat(30))
                append("\n\n")
                
                stockData.forEach {
                    append("${it.symbol}\n")
                    append("₹${it.price}  ")
                    
                    val changeColor = if (it.change.toDoubleOrNull()?.let { c -> c >= 0 } == true) {
                        "🟢"
                    } else {
                        "🔴"
                    }
                    
                    append("$changeColor ${it.change} (${it.changePercent}%)\n\n")
                }
                
                append("═".repeat(30))
                append("\n")
                val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                append("Updated: ${timeFormat.format(Date())}\n")
                append("Next update in 2 minutes")
            }
            
            stockListText.text = stockText
        }
    }
    
    private fun updateStatus(status: String) {
        runOnUiThread {
            statusText.text = status
        }
    }
    
    fun getStockData(): List<StockData> = stockData
    
    override fun onDestroy() {
        super.onDestroy()
        job?.cancel()
        if (::server.isInitialized) {
            server.stop()
        }
    }
}

// HTTP Server using NanoHTTPD
class StockServer(private val activity: MainActivity) : NanoHTTPD(8080) {
    
    override fun serve(session: IHTTPSession): Response {
        
        // Log request
        android.util.Log.d("StockServer", "Request: ${session.method} ${session.uri}")
        
        return when (session.uri) {
            "/data" -> {
                val stockData = activity.getStockData()
                val todoList = JSONArray()
                
                stockData.forEach {
                    todoList.put(it.displayText)
                }
                
                val json = JSONObject().apply {
                    put("todoList", todoList)
                    put("timestamp", System.currentTimeMillis())
                    put("lastUpdate", SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date()))
                }
                
                newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    json.toString()
                ).apply {
                    addHeader("Access-Control-Allow-Origin", "*")
                    addHeader("Content-Type", "application/json")
                }
            }
            
            "/status" -> {
                val stockData = activity.getStockData()
                
                val json = JSONObject().apply {
                    put("status", "running")
                    put("stockCount", stockData.size)
                    put("stocks", JSONArray().apply {
                        stockData.forEach { put(it.symbol) }
                    })
                }
                
                newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    json.toString()
                ).apply {
                    addHeader("Access-Control-Allow-Origin", "*")
                }
            }
            
            else -> {
                newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "application/json",
                    """{"error": "Not found"}"""
                ).apply {
                    addHeader("Access-Control-Allow-Origin", "*")
                }
            }
        }
    }
}
