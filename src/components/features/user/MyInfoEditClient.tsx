'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Upload, User, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface MyInfoEditClientProps {
  initialProfile?: {
    nickname?: string
    profileImageUrl?: string
  }
}

export function MyInfoEditClient({ initialProfile }: MyInfoEditClientProps) {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [apiError, setApiError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError, '수정 실패')
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

  const [formData, setFormData] = useState({
    nickname: user?.nickname || initialProfile?.nickname || '',
    profileImageUrl:
      (user as any)?.profileImageUrl || initialProfile?.profileImageUrl || '',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(
    formData.profileImageUrl || null,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 프로필 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      showErrorToast('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 이미지 업로드
    handleImageUpload(file)
  }

  // 프로필 이미지 업로드
  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true)
    try {
      const response = await authApi.uploadProfileImage(file)
      if (response.success && response.data) {
        // 응답에서 파일명 추출 (파일명만 반환됨)
        const rawKey =
          response.data?.profileImageUrl ||
          response.data?.url ||
          response.data?.imageUrl ||
          response.data?.fileName ||
          response.data

        if (rawKey) {
          // 백엔드 요구 prefix: image/user/profile/{filename}
          const normalizedKey = rawKey.includes('image/user/profile/')
            ? rawKey.replace(/^\//, '')
            : `image/user/profile/${rawKey}`.replace(
                /^image\/user\/profile\/\//,
                'image/user/profile/',
              )

          setFormData((prev) => ({ ...prev, profileImageUrl: normalizedKey }))

          // 미리보기를 위해 선택한 파일의 로컬 URL 사용
          const localImageUrl = URL.createObjectURL(file)
          setPreviewImage(localImageUrl)

          showSuccessToast('프로필 이미지가 업로드되었습니다.')
        } else {
          showErrorToast('이미지 파일명을 받아오지 못했습니다.')
        }
      } else {
        showErrorToast(
          response.msg || response.message || '이미지 업로드에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      showErrorToast('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  // 프로필 이미지 제거
  const handleRemoveImage = () => {
    setPreviewImage(null)
    setFormData((prev) => ({ ...prev, profileImageUrl: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        // API 호출 - nickname과 profileImageKey만 전송
        const updateData: any = {
          nickname: formData.nickname,
        }

        // profileImageUrl이 있으면 profileImageKey로 전달 (Swagger 스펙)
        if (formData.profileImageUrl) {
          updateData.profileImageKey = formData.profileImageUrl
        }

        const response = await authApi.updateProfile(updateData)

        // 성공 응답 처리
        if (response.success || response.resultCode?.startsWith('200')) {
          // 응답에서 전체 이미지 URL 가져오기 (프로필 업데이트 후 반환된 전체 URL)
          const fullImageUrl =
            (response.data as any)?.profileImageUrl ||
            (response.data as any)?.profileImage ||
            formData.profileImageUrl

          // 성공 시 AuthContext 업데이트
          const updatedUser = {
            ...user,
            nickname: formData.nickname,
            profileImageUrl: fullImageUrl,
          } as any
          updateUser(updatedUser)

          // 미리보기 이미지 업데이트 (전체 URL이 있으면)
          if (fullImageUrl && fullImageUrl.startsWith('http')) {
            setPreviewImage(fullImageUrl)
          }

          showSuccessToast('프로필이 성공적으로 수정되었습니다.')
          // 수정 완료 후 내 정보 페이지로 이동
          router.push('/my-info')
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
    router.push('/my-info')
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
              <Button variant="outline" size="sm" onClick={handleCancel}>
                취소
              </Button>
            </div>

            <div className="space-y-4">
              {/* 프로필 이미지 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  프로필 이미지
                </label>
                <div className="flex items-center space-x-4">
                  {/* 이미지 미리보기 */}
                  <div className="relative">
                    {previewImage ? (
                      <div className="relative">
                        <img
                          src={previewImage}
                          alt="프로필 미리보기"
                          className="h-24 w-24 rounded-full border-2 border-neutral-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 bg-neutral-50">
                        <User className="h-8 w-8 text-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* 이미지 업로드 버튼 */}
                  <div className="flex flex-col space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-transparent"></div>
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          이미지 선택
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-neutral-500">
                      JPG, PNG (최대 5MB)
                    </p>
                  </div>
                </div>
              </div>

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
                  error={errors.nickname}
                  placeholder="닉네임을 입력하세요"
                />
              </div>
            </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
