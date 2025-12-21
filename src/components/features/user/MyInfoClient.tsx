'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { AlertTriangle, Mail, Trash2, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyInfoClientProps {
  user?: {
    id?: number
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

  // 로컬스토리지에서 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = () => {
      try {
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          setUserInfo(userData)
        } else if (authUser) {
          setUserInfo(authUser)
        } else if (propUser && Object.keys(propUser).length > 0) {
          setUserInfo(propUser)
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
        router.push('/')
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
      <div className="from-primary-100 via-primary-50 border-primary-200 relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-8 shadow-lg">
        <div className="relative">
          <div className="flex flex-col items-center space-y-6 lg:flex-row lg:items-start lg:space-y-0 lg:space-x-8">
            {/* 프로필 아바타 */}
            <div className="shrink-0">
              <div className="relative">
                <div className="bg-primary-500 ring-primary-100 h-28 w-28 overflow-hidden rounded-full shadow-lg ring-4">
                  <div className="flex h-28 w-28 items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {getInitials(userInfo.nickname || 'U')}
                    </span>
                  </div>
                </div>
                <div className="absolute -right-2 -bottom-2 rounded-full bg-green-500 p-2.5 shadow-lg ring-2 ring-white">
                  <span className="text-sm text-white">✓</span>
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
            <div className="shrink-0">
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
              <div className="bg-primary-100 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <Mail className="text-primary-600 h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-neutral-500">
                  이메일
                </div>
                <div className="mt-1 font-semibold text-neutral-900">
                  {userInfo.email || '이메일 없음'}
                </div>
              </div>
            </div>

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
