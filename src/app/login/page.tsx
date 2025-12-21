import { LoginClient } from '@/components/features/auth/LoginClient'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <HomeLayout>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center"></div>
        }
      >
        <LoginClient />
      </Suspense>
    </HomeLayout>
  )
}
