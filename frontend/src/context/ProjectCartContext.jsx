import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { addMachineToCart, clearProjectCart, getActiveProjectCart, removeCartItem } from '../services/projectCartService'

const ProjectCartContext = createContext(null)

export function ProjectCartProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshCart = async () => {
    if (!isAuthenticated || !user?.id) {
      setCart(null)
      return null
    }
    setLoading(true)
    try {
      const nextCart = await getActiveProjectCart()
      setCart(nextCart)
      return nextCart
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCart().catch(() => setCart(null))
  }, [isAuthenticated, user?.id])

  const addMachine = async (machine) => {
    const nextCart = await addMachineToCart(machine)
    setCart(nextCart)
    return nextCart
  }

  const removeItem = async (itemId) => {
    const nextCart = await removeCartItem(itemId)
    setCart(nextCart)
    return nextCart
  }

  const clearCart = async () => {
    const nextCart = await clearProjectCart()
    setCart(nextCart)
    return nextCart
  }

  const itemCount = cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0
  return <ProjectCartContext.Provider value={{ cart, loading, itemCount, refreshCart, addMachine, removeItem, clearCart }}>{children}</ProjectCartContext.Provider>
}

export function useProjectCart() {
  return useContext(ProjectCartContext)
}
