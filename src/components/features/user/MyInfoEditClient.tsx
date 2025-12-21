'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyInfoEditClientProps {
  initialProfile?: {
    nickname?: string
    phoneNumber?: string
    address?: string
  }
}

export function MyInfoEditClient({ initialProfile }: MyInfoEditClientProps) {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError, '수정 실패')
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

  const [formData, setFormData] = useState({
    nickname: user?.nickname || initialProfile?.nickname || '',
    phoneNumber:
      (user as any)?.phoneNumber || initialProfile?.phoneNumber || '',
    address: (user as any)?.address || initialProfile?.address || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phoneNumber') {
      setFormData((prev) => ({ ...prev, [field]: value }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setApiError('')

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요'
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '전화번호를 입력해주세요'
    } else if (!/^010\d{8}$/.test(formData.phoneNumber.replace(/-/g, ''))) {
      newErrors.phoneNumber =
        '올바른 전화번호 형식을 입력해주세요 (010-1234-5678)'
    }

    if (!formData.address.trim()) {
      newErrors.address = '주소를 입력해주세요'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        // API 호출
        const response = await authApi.updateProfile({
          nickname: formData.nickname,
        })

        console.log('🔍 프로필 수정 API 응답:', response)

        // 200-4 등 성공 응답 코드 처리
        if (response.success || response.resultCode?.startsWith('200')) {
          // 성공 시 AuthContext 업데이트
          const updatedUser = {
            ...user,
            nickname: formData.nickname,
            phone: formData.phoneNumber,
            address: formData.address,
          } as any
          updateUser(updatedUser)

          showSuccessToast('프로필이 성공적으로 수정되었습니다.')
          setIsEditing(false)
        } else {
          setApiError(response.msg || '프로필 수정에 실패했습니다.')
        }
      } catch (error: any) {
        console.error('프로필 수정 에러:', error)
        setApiError(
          error.response?.data?.msg || '프로필 수정 중 오류가 발생했습니다.',
        )
      }
    }

    setIsLoading(false)
  }

  const handleCancel = () => {
    setFormData({
      nickname: user?.nickname || initialProfile?.nickname || '',
      phoneNumber:
        (user as any)?.phoneNumber || initialProfile?.phoneNumber || '',
      address: (user as any)?.address || initialProfile?.address || '',
    })
    setErrors({})
    setApiError('')
    setIsEditing(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                기본 정보
              </h2>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  취소
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  닉네임
                </label>
                <Input
                  name="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    handleInputChange('nickname', e.target.value)
                  }
                  disabled={!isEditing}
                  error={errors.nickname}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  이메일
                </label>
                <Input
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  disabled={true}
                  className="bg-neutral-100"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  전화번호
                </label>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange('phoneNumber', e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="010-1234-5678"
                  error={errors.phoneNumber}
                  maxLength={13}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  주소
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                  placeholder="주소를 입력하세요"
                  error={errors.address}
                />
              </div>
            </div>

            {isEditing && (
              <Button
                onClick={handleSave}
                className="mt-6 w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    저장 중...
                  </div>
                ) : (
                  '저장'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
