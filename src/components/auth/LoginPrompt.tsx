import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, LogIn } from 'lucide-react'
import Link from 'next/link'

interface LoginPromptProps {
  title?: string
  description?: string
}

export function LoginPrompt({
  title = '로그인이 필요합니다',
  description = '이 기능을 사용하려면 로그인해주세요.',
}: LoginPromptProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Card variant="outlined">
        <CardContent className="py-12 text-center">
          <div className="bg-primary-100 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Lock className="text-primary-600 h-8 w-8" />
          </div>

          <h2 className="mb-4 text-2xl font-bold text-neutral-900">{title}</h2>

          <p className="mb-8 text-neutral-600">{description}</p>

          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full" size="lg">
                <LogIn className="mr-2 h-4 w-4" />
                로그인하기
              </Button>
            </Link>

            <Link href="/signup">
              <Button variant="outline" className="w-full" size="lg">
                회원가입하기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
