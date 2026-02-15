import { MessageBuilder } from '../shared/message-side'
import { DEFAULT_TODO_LIST } from './../utils/constants'
const messageBuilder = new MessageBuilder()

// Your PC's local IP address (find with ipconfig on Windows)
const SERVER_URL = 'http://192.168.1.5:8080' // CHANGE THIS TO YOUR PC'S IP

function getTodoList() {
  return settings.settingsStorage.getItem('todoList')
    ? JSON.parse(settings.settingsStorage.getItem('todoList'))
    : [...DEFAULT_TODO_LIST]
}

// NEW: Fetch data from your local server
function fetchFromServer() {
  console.log('Fetching from local server...')
  
  fetch(`${SERVER_URL}/data`)
    .then(response => response.json())
    .then(data => {
      console.log('Data from server:', data)
      
      // Update the todo list with server data
      if (data.todoList) {
        settings.settingsStorage.setItem('todoList', JSON.stringify(data.todoList))
        
        // Push update to watch
        messageBuilder.call(data.todoList)
      }
      
      // Or if server sends a single message
      if (data.message) {
        const currentList = getTodoList()
        const newList = [...currentList, data.message]
        settings.settingsStorage.setItem('todoList', JSON.stringify(newList))
        messageBuilder.call(newList)
      }
    })
    .catch(error => {
      console.log('Server fetch error:', error)
    })
}

AppSideService({
  onInit() {
    console.log('App-side initialized')
    
    messageBuilder.listen(() => {})
    
    settings.settingsStorage.addListener('change', ({ key, newValue, oldValue }) => {
      console.log('Settings changed')
      messageBuilder.call(getTodoList())
    })
    
    messageBuilder.on('request', (ctx) => {
      const payload = messageBuilder.buf2Json(ctx.request.payload)
      
      if (payload.method === 'GET_TODO_LIST') {
        ctx.response({
          data: { result: getTodoList() }
        })
      } else if (payload.method === 'ADD') {
        const todoList = getTodoList()
        const newTodoList = [...todoList, String(Math.floor(Math.random() * 100))]
        settings.settingsStorage.setItem('todoList', JSON.stringify(newTodoList))
        ctx.response({
          data: { result: newTodoList }
        })
      } else if (payload.method === 'DELETE') {
        const { params: { index } = {} } = payload
        const todoList = getTodoList()
        const newTodoList = todoList.filter((_, i) => i !== index)
        settings.settingsStorage.setItem('todoList', JSON.stringify(newTodoList))
        ctx.response({
          data: { result: newTodoList }
        })
      } 
      // NEW: Method to manually fetch from server
      else if (payload.method === 'FETCH_FROM_SERVER') {
        fetchFromServer()
        ctx.response({
          data: { result: 'Fetching...' }
        })
      }
    })
  },
  
  onRun() {
    console.log('App-side running')
    
    // NEW: Fetch from server every 10 seconds
    setInterval(() => {
      fetchFromServer()
    }, 10000) // 10 seconds
    
    // Fetch immediately on start
    fetchFromServer()
  },
  
  onDestroy() {
    console.log('App-side destroyed')
  }
})