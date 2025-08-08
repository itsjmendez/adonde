import { Profile } from './profile'

interface DashboardSearchState {
  location: string
  latitude: number
  longitude: number
  radius: number
  roommates: (Profile & { distance: number })[]
  connectionStatuses: Record<string, { status: 'none' | 'pending_sent' | 'pending_received' | 'connected', requestId?: string }>
  timestamp: number
}

const CACHE_KEY = 'dashboard_search_state'
const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

export function saveDashboardSearchState(state: Omit<DashboardSearchState, 'timestamp'>) {
  try {
    const cacheData: DashboardSearchState = {
      ...state,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Failed to save dashboard search state:', error)
  }
}

export function getDashboardSearchState(): DashboardSearchState | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const cacheData: DashboardSearchState = JSON.parse(cached)
    
    // Check if cache has expired
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return cacheData
  } catch (error) {
    console.error('Failed to get dashboard search state:', error)
    return null
  }
}

export function clearDashboardSearchState() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (error) {
    console.error('Failed to clear dashboard search state:', error)
  }
}

export function updateCachedConnectionStatus(profileId: string, status: { status: 'none' | 'pending_sent' | 'pending_received' | 'connected', requestId?: string }) {
  try {
    const cached = getDashboardSearchState()
    if (!cached) return

    cached.connectionStatuses[profileId] = status
    cached.timestamp = Date.now()
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch (error) {
    console.error('Failed to update cached connection status:', error)
  }
}