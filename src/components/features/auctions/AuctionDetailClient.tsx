'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { auctionApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from '@/lib/utils/toast'
import { Heart, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface AuctionDetailClientProps {
  auctionId: number
  product?: any
}

// Deprecated: Auction detail view is no longer used.
// This stub exists to satisfy current imports without runtime UI.
export function AuctionDetailClient(_props: AuctionDetailClientProps) {
  return null
}
