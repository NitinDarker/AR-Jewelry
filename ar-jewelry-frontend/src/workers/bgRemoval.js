// src/workers/bgRemoval.js
import { removeBackground } from '@imgly/background-removal'

self.onmessage = async event => {
  try {
    const file = event.data
    const cleanBlob = await removeBackground(file)
    self.postMessage({ success: true, blob: cleanBlob })
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
}
