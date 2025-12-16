import { SignupClient } from '@/components/features/auth/SignupClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { PageHeader } from '@/components/layout/PageHeader'

export default function SignupPage() {
  return (
    <HomeLayout>
      <PageHeader
        title="회원가입"
        description="Bid에 오신 것을 환영합니다"
        showBackButton
      />
      <SignupClient />
    </HomeLayout>
  )
}
