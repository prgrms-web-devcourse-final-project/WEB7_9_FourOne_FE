'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignupClient() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    verificationCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }

    // API 에러 초기화
    if (apiError) {
      setApiError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setApiError('')

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    if (!formData.nickname) {
      newErrors.nickname = '닉네임을 입력해주세요'
    } else if (formData.nickname.length < 2) {
      newErrors.nickname = '닉네임은 2자 이상이어야 합니다'
    }

    if (!isEmailVerified) {
      newErrors.verificationCode = '이메일 인증을 완료해주세요'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        // 회원가입 API 호출 (Swagger 스펙: email, password, nickname만)
        const response = await authApi.signup({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
        })

        console.log('🔍 회원가입 API 응답 전체:', response)
        console.log('🔍 response.success:', response.success)
        console.log('🔍 response.data:', response.data)
        console.log('🔍 response.resultCode:', response.resultCode)

        // 성공 조건 확인 (다양한 형식 지원)
        const isSuccess =
          response.success ||
          response.resultCode === '200' ||
          response.resultCode === 'SUCCESS' ||
          (response.data && response.data !== null)

        if (isSuccess) {
          // 회원가입 성공
          console.log('✅ 회원가입 성공:', response.data)
          setApiError('')
          alert('회원가입이 완료되었습니다. 로그인해주세요.')
          router.push('/login')
        } else {
          console.log('❌ 회원가입 실패:', response)
          setApiError('회원가입에 실패했습니다. 다시 시도해주세요.')
        }
      } catch (error: any) {
        console.error('API 에러:', error)
        if (error.response?.status === 400) {
          const errorMessage =
            error.response.data?.errorMessage || '입력 정보를 확인해주세요.'
          setApiError(`요청 실패: ${errorMessage}`)
        } else if (error.response?.status === 409) {
          setApiError('이미 가입된 이메일입니다.')
        } else {
          setApiError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }
      }
    }

    setIsLoading(false)
  }

  // 이메일 인증 코드 전송
  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setApiError('이메일을 먼저 입력해주세요.')
      return
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setApiError('올바른 이메일 형식을 입력해주세요')
      return
    }

    try {
      setIsSendingCode(true)
      setApiError('')
      const response = await authApi.sendVerificationCode(formData.email)
      if (response.success) {
        alert('인증 코드가 전송되었습니다. 이메일을 확인해주세요.')
      } else {
        const errorMessage =
          response.message || response.msg || '인증 코드 전송에 실패했습니다.'
        setApiError(errorMessage)
      }
    } catch (error: any) {
      console.error('인증 코드 전송 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    } finally {
      setIsSendingCode(false)
    }
  }

  // 이메일 인증 코드 확인
  const handleVerifyCode = async () => {
    if (!formData.verificationCode) {
      setApiError('인증 코드를 입력해주세요.')
      return
    }

    try {
      setIsVerifyingCode(true)
      setApiError('')
      const response = await authApi.verifyCode(
        formData.email,
        formData.verificationCode,
      )
      if (response.success) {
        setIsEmailVerified(true)
        alert('이메일 인증이 완료되었습니다.')
      } else {
        const errorMessage =
          response.message || response.msg || '인증 코드가 올바르지 않습니다.'
        setApiError(errorMessage)
      }
    } catch (error: any) {
      console.error('인증 코드 확인 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    } finally {
      setIsVerifyingCode(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6 lg:px-8">
      <Card variant="outlined">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API 에러 메시지 */}
            {apiError && (
              <ErrorAlert
                title="요청 실패"
                message={apiError}
                onClose={() => setApiError('')}
              />
            )}

            {/* 이메일 */}
            <div>
              <Input
                label="이메일"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="이메일을 입력하세요"
                error={errors.email}
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <Input
                label="비밀번호"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="비밀번호를 입력하세요"
                error={errors.password}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                }
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <Input
                label="비밀번호 확인"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="비밀번호를 다시 입력하세요"
                error={errors.confirmPassword}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                }
              />
            </div>

            {/* 이메일 인증 */}
            <div>
              <div className="mb-2 flex items-center space-x-2">
                <Input
                  label="이메일 인증"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                  placeholder="인증 코드를 입력하세요"
                  error={errors.verificationCode}
                  disabled={isEmailVerified}
                  className="flex-1"
                />
                <div className="flex flex-col space-y-2 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode || !formData.email || isEmailVerified}
                    className="whitespace-nowrap"
                  >
                    {isSendingCode ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    ) : (
                      '코드 전송'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyCode}
                    disabled={
                      isVerifyingCode ||
                      !formData.verificationCode ||
                      isEmailVerified
                    }
                    className="whitespace-nowrap"
                  >
                    {isVerifyingCode ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    ) : (
                      '인증 확인'
                    )}
                  </Button>
                </div>
              </div>
              {isEmailVerified && (
                <p className="text-sm text-green-600">✓ 이메일 인증이 완료되었습니다.</p>
              )}
            </div>

            {/* 닉네임 */}
            <div>
              <Input
                label="닉네임"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="닉네임을 입력하세요"
                error={errors.nickname}
              />
            </div>

            {/* 약관 동의 */}
            {/* <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="text-primary-600 focus:ring-primary-500 mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <label
                  htmlFor="agreeTerms"
                  className="text-sm text-neutral-700"
                >
                  <span className="text-primary-600">[필수]</span> 이용약관에
                  동의합니다
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="text-error-500 text-sm">{errors.agreeTerms}</p>
              )}

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="agreePrivacy"
                  name="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={handleInputChange}
                  className="text-primary-600 focus:ring-primary-500 mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <label
                  htmlFor="agreePrivacy"
                  className="text-sm text-neutral-700"
                >
                  <span className="text-primary-600">[필수]</span> 개인정보
                  처리방침에 동의합니다
                </label>
              </div>
              {errors.agreePrivacy && (
                <p className="text-error-500 text-sm">{errors.agreePrivacy}</p>
              )}

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="agreeMarketing"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                  className="text-primary-600 focus:ring-primary-500 mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <label
                  htmlFor="agreeMarketing"
                  className="text-sm text-neutral-700"
                >
                  <span className="text-neutral-500">[선택]</span> 마케팅 정보
                  수신에 동의합니다
                </label>
              </div>
            </div> */}

            {/* 회원가입 버튼 */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  회원가입 중...
                </div>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>

          {/* 소셜 로그인 */}
          {/* <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-neutral-500">또는</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => console.log('구글 로그인')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                구글로 계속하기
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => console.log('카카오 로그인')}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#FEE500"
                    d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L5.526 21.79c-.608.5-1.22.21-1.22-.5v-2.19C2.153 17.5 1.5 15.14 1.5 11.185 1.5 6.664 6.201 3 12 3z"
                  />
                </svg>
                카카오로 계속하기
              </Button>
            </div>
          </div> */}

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-500"
              >
                로그인하기
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
