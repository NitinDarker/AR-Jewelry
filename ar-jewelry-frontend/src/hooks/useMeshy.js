import { useState } from 'react'

export function useMeshy () {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const generate3D = async file => {
    setIsGenerating(true)
    setProgress(0)

    try {
      // Mocking the generation delay for MVP UI testing
      for (let i = 10; i <= 100; i += 15) {
        await new Promise(r => setTimeout(r, 400))
        setProgress(i)
      }

      setIsGenerating(false)
      // We don't have a real GLB since we aren't paying the API.
      // Returning a dummy flag to trigger a placeholder 3D object.
      return 'mocked-mvp-glb-url'
    } catch (err) {
      setIsGenerating(false)
      throw err
    }
  }

  return { generate3D, isGenerating, progress }
}
