import { AuctionDetailClient } from '@/components/features/auctions/AuctionDetailClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { serverApi } from '@/lib/api/server-api-client'
import { notFound } from 'next/navigation'

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const auctionId = parseInt(id)

  if (isNaN(auctionId)) {
    notFound()
  }

  // 서버에서 경매 상세정보 조회
  let data: any = null

  try {
    const response = await serverApi.getAuctionDetail(auctionId)

    if (response.success && response.data) {
      data = response.data
    } else {
      console.warn('경매 조회 실패:', response.msg)
      notFound()
    }
  } catch (error) {
    console.error('경매 조회 중 예외 발생:', error)
    notFound()
  }

  if (!data) {
    notFound()
  }

  return (
    <HomeLayout>
      <PageHeader title="경매 상세정보" />
      <AuctionDetailClient auctionData={data} />
    </HomeLayout>
  )
}
