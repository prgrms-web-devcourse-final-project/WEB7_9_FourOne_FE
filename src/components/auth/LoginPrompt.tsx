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
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardContent className="py-16 text-center">
          <div className="bg-primary-50 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full">
            <Lock className="text-primary-600 h-7 w-7" />
          </div>

          <h2 className="mb-3 text-xl font-bold text-neutral-900">{title}</h2>

          <p className="mb-8 text-sm text-neutral-600">{description}</p>

          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button
                className="bg-primary-600 hover:bg-primary-700 w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                로그인
              </Button>
            </Link>

            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full" size="lg">
                회원가입
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
