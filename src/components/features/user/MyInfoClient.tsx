'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { getFullImageUrl } from '@/lib/utils/image-url'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import {
  AlertTriangle,
  Calendar,
  Edit,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyInfoClientProps {
  user?: {
    id?: number
    userId?: number
    email?: string
    nickname?: string
    phone?: string
    phoneNumber?: string
    address?: string
    profileImage?: string
    profileImageUrl?: string
    creditScore?: number
    createDate?: string
    modifyDate?: string
    createdAt?: string
    updatedAt?: string
  }
}

export function MyInfoClient({ user: propUser }: MyInfoClientProps) {
  const router = useRouter()
  const { user: authUser, logout } = useAuth()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  // 사용자 정보 로드 (API 응답 우선, 서버에서 받은 정보, 없으면 localStorage 또는 AuthContext)
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // 1. API로 최신 사용자 정보 조회 (항상 최신 데이터 사용)
        try {
          const response = await authApi.getMyInfoV2()
          if (response.success && response.data) {
            // API 응답 데이터를 그대로 사용 (필드명: userId, email, nickname, profileImageUrl, createdAt)
            setUserInfo(response.data)
            setIsLoading(false)
            return
          }
        } catch (error) {
          console.error('사용자 정보 API 조회 실패:', error)
        }

        // 2. API 실패 시 서버에서 받은 propUser 사용 (실제 데이터가 있는 경우만)
        if (
          propUser &&
          Object.keys(propUser).length > 0 &&
          (propUser.email || propUser.userId)
        ) {
          setUserInfo(propUser)
          setIsLoading(false)
          return
        }

        // 3. AuthContext의 사용자 정보 사용 (임시)
        if (authUser) {
          setUserInfo(authUser)
          setIsLoading(false)
          return
        }

        // 4. localStorage에서 사용자 정보 로드 (임시)
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          setUserInfo(userData)
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserInfo()
  }, [authUser, propUser])

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showErrorToast('비밀번호를 입력해주세요.')
      return
    }

    setIsDeleting(true)
    try {
      const response = await authApi.deleteProfile(deletePassword)
      if (response.success) {
        showSuccessToast('회원탈퇴가 완료되었습니다.')
        await logout()
        // logout() 함수에서 자동으로 홈으로 리다이렉트됨
      } else {
        const errorMessage =
          response.message ||
          response.msg ||
          '회원탈퇴에 실패했습니다. 다시 시도해주세요.'
        showErrorToast(errorMessage)
      }
    } catch (error: any) {
      console.error('회원탈퇴 실패:', error)
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsDeleting(false)
      setDeletePassword('')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-600">
              사용자 정보를 불러올 수 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 프로필 헤더 */}
      <div className="from-primary-100 via-primary-50 border-primary-200 relative mb-8 overflow-hidden rounded-2xl border bg-linear-to-br to-white p-8 shadow-lg">
        <div className="relative">
          <div className="flex flex-col items-center space-y-6 lg:flex-row lg:items-start lg:space-y-0 lg:space-x-8">
            {/* 프로필 아바타 */}
            <div className="shrink-0">
              <div className="relative">
                <div className="bg-primary-500 ring-primary-100 h-28 w-28 overflow-hidden rounded-full shadow-lg ring-4">
                  {(() => {
                    const imageUrl = getFullImageUrl(
                      userInfo.profileImageUrl || userInfo.profileImage,
                    )
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={userInfo.nickname || '프로필'}
                        className="h-28 w-28 object-cover"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {getInitials(userInfo.nickname || 'U')}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 사용자 정보 */}
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <div className="mb-4">
                <h1 className="mb-3 text-4xl font-bold text-neutral-900">
                  {userInfo.nickname || '사용자'}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-700">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-neutral-500" />
                  <span>{userInfo.email || '이메일 없음'}</span>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto">
              <Button
                variant="outline"
                className="w-full lg:w-auto"
                onClick={() => router.push('/my-info/edit')}
              >
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-300 bg-red-50 text-red-600 hover:bg-red-100 lg:w-auto"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                회원탈퇴
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 계정 정보 */}
      <Card className="mb-8 overflow-hidden border-0 bg-white shadow-lg">
        <CardContent className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">
              계정 정보
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-neutral-500">
                  닉네임
                </div>
                <div className="mt-1 font-semibold text-neutral-900">
                  {userInfo.nickname || '닉네임 없음'}
                </div>
              </div>
            </div>

            {(userInfo.phone || userInfo.phoneNumber) && (
              <div className="flex items-center space-x-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-neutral-500">
                    전화번호
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {userInfo.phone || userInfo.phoneNumber || '전화번호 없음'}
                  </div>
                </div>
              </div>
            )}

            {userInfo.address && (
              <div className="flex items-center space-x-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-neutral-500">
                    주소
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {userInfo.address}
                  </div>
                </div>
              </div>
            )}

            {(userInfo.createDate || userInfo.createdAt) && (
              <div className="flex items-center space-x-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Calendar className="h-6 w-6 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-neutral-500">
                    가입일
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {new Date(
                      userInfo.createdAt || userInfo.createDate,
                    ).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            )}

            {(userInfo.modifyDate || userInfo.updatedAt) && (
              <div className="flex items-center space-x-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Calendar className="h-6 w-6 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-neutral-500">
                    수정일
                  </div>
                  <div className="mt-1 font-semibold text-neutral-900">
                    {new Date(
                      userInfo.updatedAt || userInfo.modifyDate,
                    ).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 회원탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-neutral-900">
                회원탈퇴 확인
              </h3>
              <p className="text-sm text-neutral-600">
                정말로 회원탈퇴를 진행하시겠습니까?
                <br />
                <span className="font-medium text-red-600">
                  이 작업은 되돌릴 수 없습니다.
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h4 className="mb-2 text-sm font-semibold text-red-800">
                  회원탈퇴 시 주의사항
                </h4>
                <ul className="space-y-1 text-xs text-red-700">
                  <li>• 모든 입찰 내역이 삭제됩니다</li>
                  <li>• 등록한 상품이 모두 삭제됩니다</li>
                  <li>• 작성한 리뷰와 QnA가 모두 삭제됩니다</li>
                  <li>• 계정 복구가 불가능합니다</li>
                </ul>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  비밀번호 확인 *
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletePassword('')
                  }}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePassword}
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      처리중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      탈퇴하기
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
