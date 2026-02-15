import { getLogger } from '@zos/utils'
import { TEXT_STYLE, createWidget, widget, prop } from '@zos/ui'
import * as ble from '@zos/ble' // Attempt standard import

// fallback to global hmBle if the import is empty (common in some firmware)
const bluetooth = (typeof ble !== 'undefined' && ble.createConnect) ? ble : (typeof hmBle !== 'undefined' ? hmBle : null)

const logger = getLogger('DeviceApp')
let globalWidget = null // Store widget globally to avoid 'this' issues

// Helper: ArrayBuffer to String (Standalone)
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf))
}

// Helper: String to ArrayBuffer (Standalone)
function str2ab(str) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

Page({
  build() {
    // 1. Create Debug UI
    globalWidget = createWidget(widget.TEXT, {
      x: 0, y: 0, w: 454, h: 454, // Full screen
      color: 0xffffff,
      text_size: 20,
      align_h: widget.ALIGN_CENTER_H,
      align_v: widget.ALIGN_CENTER_V,
      text_style: TEXT_STYLE.WRAP,
      text: 'Initializing...'
    })

    // 2. Check if Bluetooth API exists
    if (!bluetooth) {
      globalWidget.setProperty(prop.TEXT, "CRITICAL ERROR:\nBluetooth Module not found!")
      return
    }

    if (typeof bluetooth.createConnect !== 'function') {
      globalWidget.setProperty(prop.TEXT, "CRITICAL ERROR:\ncreateConnect is not a function!")
      return
    }

    // 3. Try to Connect
    try {
      globalWidget.setProperty(prop.TEXT, "Attempting BLE...")
      
      bluetooth.createConnect((index, data, size) => {
        // RECEIVE HANDLER
        try {
          const msg = ab2str(data)
          console.log("Received:", msg)
          globalWidget.setProperty(prop.TEXT, "RX: " + msg)
        } catch (err) {
          globalWidget.setProperty(prop.TEXT, "RX Error: " + err.message)
        }
      })

      // 4. Send Wake Up Call
      const wakeUpMsg = JSON.stringify({ action: "wake_up" })
      bluetooth.send(str2ab(wakeUpMsg), wakeUpMsg.length)
      globalWidget.setProperty(prop.TEXT, "Waiting for phone...")

    } catch (e) {
      console.log(e)
      globalWidget.setProperty(prop.TEXT, "Runtime Error:\n" + e.message)
    }
  }
})