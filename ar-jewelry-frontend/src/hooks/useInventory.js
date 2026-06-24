import { useState, useEffect } from 'react'

export function useInventory () {
  const [inventory, setInventory] = useState([])

  useEffect(() => {
    setInventory([
      {
        id: 'neck_1',
        type: 'necklace',
        name: 'Gold Choker',
        url: '/assets/necklace-1.png'
      },
      {
        id: 'neck_2',
        type: 'necklace',
        name: 'Diamond Layer',
        url: '/assets/necklace-2.png'
      },
      {
        id: 'neck_3',
        type: 'necklace',
        name: 'Diamond Neck',
        url: '/assets/necklace-3.png'
      },
      {
        id: 'ring_1',
        type: 'ring',
        name: 'Square Diamond Ring',
        urlTop: '/assets/ring-top.png',
        urlBottom: '/assets/ring-bottom.png'
      }
    ])
  }, [])

  return { inventory, error: null }
}
