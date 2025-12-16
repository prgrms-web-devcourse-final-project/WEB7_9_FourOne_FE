import { LoginClient } from '@/components/features/auth/LoginClient'
import { HomeLayout } from '@/components/layout/HomeLayout'

export default function LoginPage() {
  return (
    <HomeLayout>
      <LoginClient />
    </HomeLayout>
  )
}
