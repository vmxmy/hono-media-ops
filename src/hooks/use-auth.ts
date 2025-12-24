"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
}

export function useAuth() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("token")
    const userStr = localStorage.getItem("user")
    if (!token) {
      router.push("/")
    } else {
      setIsAuthenticated(true)
      if (userStr) {
        try {
          setUser(JSON.parse(userStr))
        } catch {
          // Invalid user data
        }
      }
    }
  }, [router])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  return { mounted, isAuthenticated, user, logout }
}
