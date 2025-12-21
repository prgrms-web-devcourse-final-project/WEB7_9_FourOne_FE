'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  CATEGORIES,
  type CategoryValue,
  type SubCategoryValue,
} from '@/lib/constants/categories'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function ProductRegistrationClient() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrls: [] as string[], // 이미지 URL 배열
  })
  const [newImageUrl, setNewImageUrl] = useState('') // 새 이미지 URL 입력
  // 새로운 카테고리 시스템
  const [category, setCategory] = useState<CategoryValue>('STARGOODS')
  const [subCategory, setSubCategory] = useState<SubCategoryValue>('ACC')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError, '요청 실패')
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

  // 개발 모드 감지
  const isDev = process.env.NODE_ENV === 'development'

  // 개발 모드: 기본값 자동 입력
  const fillDevDefaults = () => {
    setFormData({
      name: '테스트 상품',
      description:
        '테스트용 상품 설명입니다. 개발 모드에서 자동으로 입력된 기본값입니다.',
      imageUrls: [
        'https://images.unsplash.com/photo-1766086892325-74a61d0465f6?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      ],
    })
    setCategory('STARGOODS')
    setSubCategory('ACC')
    setNewImageUrl('')
    setErrors({})
    setApiError('')
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  // 이미지 URL 추가 함수
  const handleAddImageUrl = () => {
    if (newImageUrl.trim() === '') {
      return
    }

    // URL 유효성 검사 (간단한 검사)
    try {
      new URL(newImageUrl.trim())
    } catch {
      setErrors((prev) => ({
        ...prev,
        imageUrl: '올바른 URL 형식이 아닙니다',
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, newImageUrl.trim()],
    }))
    setNewImageUrl('')
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.imageUrl
      return newErrors
    })
  }

  // 이미지 URL 삭제 함수
  const handleImageUrlDelete = (indexToDelete: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== indexToDelete),
    }))
  }

  // Enter 키로 이미지 URL 추가
  const handleImageUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddImageUrl()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔵 handleSubmit 호출됨')
    setIsLoading(true)
    setApiError('')

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '상품명을 입력해주세요'
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = '상품 설명을 입력해주세요'
    }

    if (formData.imageUrls.length === 0) {
      newErrors.images = '상품 이미지 URL을 1개 이상 입력해주세요'
    }

    console.log('🔵 유효성 검사 결과:', newErrors)
    setErrors(newErrors)

    // 에러가 있으면 사용자에게 알림
    if (Object.keys(newErrors).length > 0) {
      console.log('🔴 유효성 검사 실패:', newErrors)
      // 첫 번째 에러 메시지를 토스트로 표시
      const firstError = Object.values(newErrors)[0]
      if (firstError) {
        showErrorToast(firstError, '입력 오류')
      }
      setIsLoading(false)
      return
    }

    if (Object.keys(newErrors).length === 0) {
      try {
        console.log('🚀 API 전송 데이터:', {
          name: formData.name,
          description: formData.description,
          category: category,
          subCategory: subCategory,
          imagesFiles: formData.imageUrls,
        })

        // 요청 형식: { name, description, category, subCategory, imagesFiles: string[] }
        const response = await productApi.createProduct(
          {
            name: formData.name,
            description: formData.description,
            category: category,
            subCategory: subCategory,
            imagesFiles: formData.imageUrls, // 이미지 URL 배열
          },
          [], // File 객체 배열은 더 이상 사용하지 않음
        )

        if (response.success) {
          showSuccessToast('상품이 성공적으로 등록되었습니다.')

          // 응답에서 productId를 가져와서 상품 상세 페이지로 이동
          const productId = (response.data as any)?.productId
          if (productId) {
            router.push(`/products/${productId}`)
          } else {
            // productId가 없으면 내 상품 목록으로 이동
            router.push('/my-products')
          }
        } else {
          // 백엔드 메시지 우선 사용
          setApiError(
            response.message ||
              response.msg ||
              '상품 등록에 실패했습니다. 다시 시도해주세요.',
          )
        }
      } catch (error: any) {
        console.error('API 에러:', error)

        // 백엔드 에러 메시지 그대로 표시
        const apiError = handleApiError(error)
        setApiError(apiError.message)
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 개발 모드: 기본값 자동 입력 버튼 */}
      {isDev && (
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={fillDevDefaults}
            className="w-full border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
          >
            🚀 개발 모드: 기본값 자동 입력
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 상품 이미지 URL */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              상품 이미지 URL *
            </h2>

            <div className="space-y-4">
              {/* 이미지 URL 입력 */}
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyPress={handleImageUrlKeyPress}
                  placeholder="https://example.com/image.jpg"
                  error={errors.imageUrl}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrl.trim()}
                >
                  추가
                </Button>
              </div>
              <p className="text-sm text-neutral-500">
                이미지 URL을 입력하고 추가 버튼을 클릭하세요 (최소 1개 이상)
              </p>

              {/* 추가된 이미지 URL 목록 */}
              {formData.imageUrls.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-neutral-600">
                    추가된 이미지 ({formData.imageUrls.length}개)
                  </p>
                  <div className="space-y-2">
                    {formData.imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3"
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm text-neutral-600">
                            {url}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImageUrlDelete(index)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                          title="이미지 삭제"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.images && (
                <p className="text-error-500 mt-2 text-sm">{errors.images}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상품 정보 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              상품 정보
            </h2>

            <div className="space-y-4">
              <Input
                label="상품명 *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="상품명을 입력하세요"
                error={errors.name}
              />

              {/* 카테고리 선택 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  카테고리 *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCategory = e.target.value as CategoryValue
                    setCategory(newCategory)
                    // 카테고리 변경 시 첫 번째 서브카테고리로 초기화
                    const selectedCategory = CATEGORIES.find(
                      (cat) => cat.value === newCategory,
                    )
                    if (
                      selectedCategory &&
                      selectedCategory.subCategories.length > 0
                    ) {
                      setSubCategory(selectedCategory.subCategories[0].value)
                    }
                  }}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 서브카테고리 선택 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  서브카테고리 *
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => {
                    setSubCategory(e.target.value as SubCategoryValue)
                  }}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                >
                  {CATEGORIES.find(
                    (cat) => cat.value === category,
                  )?.subCategories.map((subCat) => (
                    <option key={subCat.value} value={subCat.value}>
                      {subCat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  상품 설명 *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="상품에 대해 자세히 설명해주세요"
                  rows={6}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                />
                <div className="mt-2 text-sm text-neutral-500">
                  <ul className="list-inside list-disc space-y-1">
                    <li>구매 시기, 사용 기간</li>
                    <li>상품 상태</li>
                    <li>하자나 수리 이력 등</li>
                  </ul>
                </div>
                {errors.description && (
                  <p className="text-error-500 mt-1 text-sm">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={(e) => {
              console.log('🔵 버튼 클릭됨', { isLoading, formData })
            }}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                등록 중...
              </div>
            ) : (
              '상품 등록'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
