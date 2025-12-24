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
import { Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function ProductRegistrationClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedImages, setSelectedImages] = useState<File[]>([]) // 선택한 이미지 파일 배열
  const [imagePreviews, setImagePreviews] = useState<string[]>([]) // 미리보기 URL 배열
  const [isUploadingImages, setIsUploadingImages] = useState(false)
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
    })
    setCategory('STARGOODS')
    setSubCategory('ACC')
    setSelectedImages([])
    setImagePreviews([])
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

  // 이미지 파일 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const totalFiles = selectedImages.length + newFiles.length

    // 최대 10개 제한
    if (totalFiles > 10) {
      showErrorToast('이미지는 최대 10개까지 등록 가능합니다.')
      return
    }

    // 이미지 파일 검증
    const validFiles = newFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        showErrorToast(`${file.name}은(는) 이미지 파일이 아닙니다.`)
        return false
      }
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showErrorToast(`${file.name}의 크기는 10MB 이하여야 합니다.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // 파일 추가
    const updatedFiles = [...selectedImages, ...validFiles]
    setSelectedImages(updatedFiles)

    // 미리보기 생성
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])

    // 에러 초기화
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.images
      return newErrors
    })

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 이미지 삭제
  const handleImageDelete = (indexToDelete: number) => {
    // 미리보기 URL 해제
    const previewUrl = imagePreviews[indexToDelete]
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedImages((prev) =>
      prev.filter((_, index) => index !== indexToDelete),
    )
    setImagePreviews((prev) =>
      prev.filter((_, index) => index !== indexToDelete),
    )
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

    if (selectedImages.length === 0) {
      newErrors.images = '상품 이미지를 1개 이상 선택해주세요'
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
        setIsUploadingImages(true)

        // 1. PreSigned URL 요청 및 S3 업로드
        const uploadResponse =
          await productApi.uploadProductImages(selectedImages)

        if (!uploadResponse.success || !uploadResponse.data) {
          throw new Error(
            uploadResponse.msg ||
              uploadResponse.message ||
              '이미지 업로드에 실패했습니다.',
          )
        }

        // 업로드된 파일명 배열
        const imageFileNames = uploadResponse.data

        console.log('🚀 API 전송 데이터:', {
          name: formData.name,
          description: formData.description,
          category: category,
          subCategory: subCategory,
          imagesFiles: imageFileNames,
        })

        // 2. 상품 등록 API 호출
        // 요청 형식: { name, description, category, subCategory, imagesFiles: string[] }
        // imagesFiles는 파일명만 전달 (S3에 존재하는 파일명)
        const response = await productApi.createProduct(
          {
            name: formData.name,
            description: formData.description,
            category: category,
            subCategory: subCategory,
            imagesFiles: imageFileNames, // 파일명만 전달
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
      } finally {
        setIsUploadingImages(false)
      }
    }

    setIsLoading(false)
  }

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

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
        {/* 상품 이미지 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              상품 이미지 *
            </h2>

            <div className="space-y-4">
              {/* 이미지 선택 버튼 */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImages || selectedImages.length >= 10}
                >
                  {isUploadingImages ? (
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
                <p className="mt-2 text-sm text-neutral-500">
                  이미지를 선택하세요 (최대 10개, 각 10MB 이하)
                </p>
              </div>

              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-neutral-600">
                    선택된 이미지 ({selectedImages.length}/10)
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {selectedImages.map((file, index) => (
                      <div
                        key={index}
                        className="group relative aspect-square overflow-hidden rounded-lg border-2 border-neutral-200"
                      >
                        <img
                          src={imagePreviews[index]}
                          alt={`미리보기 ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageDelete(index)}
                          className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                          title="이미지 삭제"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-1 text-xs text-white">
                          {file.name}
                        </div>
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
            disabled={isLoading || isUploadingImages}
            onClick={(e) => {
              console.log('🔵 버튼 클릭됨', { isLoading, formData })
            }}
          >
            {isLoading || isUploadingImages ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {isUploadingImages ? '이미지 업로드 중...' : '등록 중...'}
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
