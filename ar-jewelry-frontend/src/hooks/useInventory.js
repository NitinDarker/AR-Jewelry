import { useState, useEffect } from 'react'

export function useInventory () {
  const [inventory, setInventory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchInventory () {
      try {
        const res = await fetch('http://localhost:5001/api/jewelry')
        if (!res.ok) throw new Error('Backend rejected request')
        const data = await res.json()
        setInventory(data)
      } catch (err) {
        console.error('Express Server Error:', err)
        setError('Failed to load inventory. Check backend.')
      }
    }
    fetchInventory()
  }, [])

  return { inventory, error }
}
