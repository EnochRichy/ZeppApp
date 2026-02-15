// app-side/index.js
const messaging = typeof setup !== 'undefined' ? undefined : (typeof messaging !== 'undefined' ? messaging : null) 
// Note: In 'Vanilla' side service, 'messaging' is usually a global, or part of the zos API.
// Let's use the simplest global access usually available in Zepp OS 2.0

AppSideService({
  onInit() {
    console.log("PHONE: Side Service Started")
    
    // In raw mode, we access the global 'messaging' module if available
    // or sometimes it is passed via context. 
    // For T-Rex 2, let's try the standard peerSocket listener
    
    if (messaging && messaging.peerSocket) {
      messaging.peerSocket.addListener('message', (message) => {
        console.log("PHONE: Got message")
        const text = "Hello from Phone " + Math.floor(Math.random() * 100)
        
        // Convert string to buffer
        const buf = new ArrayBuffer(text.length)
        const bufView = new Uint8Array(buf)
        for (let i = 0; i < text.length; i++) bufView[i] = text.charCodeAt(i)
          
        messaging.peerSocket.send(buf)
      })
    }
  },
  onRun() {},
  onDestroy() {}
})