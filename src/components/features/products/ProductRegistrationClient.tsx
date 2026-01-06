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

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
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

        const imagePaths = uploadResponse.data

        // 2. 상품 등록 API 호출
        // 요청 형식: { name, description, category, subCategory, imagesFiles: string[] }
        // imagesFiles는 S3 경로 전달 (예: image/product/43615ab13-e15e-4b24-8b8c-ecb0045c05d1.png)
        const response = await productApi.createProduct(
          {
            name: formData.name,
            description: formData.description,
            category: category,
            subCategory: subCategory,
            imagesFiles: imagePaths, // S3 경로 전달
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 개발 모드: 기본값 자동 입력 버튼 */}
      {isDev && (
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={fillDevDefaults}
            className="w-full border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 text-amber-700 hover:border-amber-300 hover:bg-linear-to-r hover:from-amber-100 hover:to-orange-100"
          >
            🚀 개발 모드: 기본값 자동 입력
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 상품 이미지 */}
        <Card variant="outlined" className="border-neutral-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              상품 이미지
              <span className="ml-1 text-red-500">*</span>
            </h2>

            <div className="space-y-5">
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
                  className="group hover:border-primary-400 hover:bg-primary-50 relative h-12 w-full border-2 border-dashed border-neutral-300 bg-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploadingImages ? (
                    <>
                      <div className="border-primary-600 mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                      <span className="text-sm font-medium">업로드 중...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="group-hover:text-primary-600 mr-2 h-5 w-5 text-neutral-600 transition-colors" />
                      <span className="group-hover:text-primary-700 text-sm font-medium text-neutral-700">
                        이미지 선택
                      </span>
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-neutral-500">
                  최대 10개, 각 10MB 이하의 이미지를 선택할 수 있습니다
                </p>
              </div>

              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700">
                      선택된 이미지
                      <span className="bg-primary-100 text-primary-700 ml-2 inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {selectedImages.length}/10
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {selectedImages.map((file, index) => (
                      <div
                        key={index}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <img
                          src={imagePreviews[index]}
                          alt={`미리보기 ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 transition-opacity group-hover:opacity-10" />
                        <button
                          type="button"
                          onClick={() => handleImageDelete(index)}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-md transition-all group-hover:opacity-100 hover:scale-110 hover:bg-red-600"
                          title="이미지 삭제"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 bottom-0 left-0 truncate bg-linear-to-t from-black/70 to-transparent p-2 text-xs text-white">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.images && (
                <p className="mt-3 text-sm font-medium text-red-500">
                  ⚠️ {errors.images}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상품 정보 */}
        <Card variant="outlined" className="border-neutral-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              상품 정보
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                  상품명
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="상품의 이름을 입력하세요"
                  className={`transition-colors ${
                    errors.name
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-neutral-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-2 text-sm font-medium text-red-500">
                    ⚠️ {errors.name}
                  </p>
                )}
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                  카테고리
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCategory = e.target.value as CategoryValue
                    setCategory(newCategory)
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
                  className="focus:border-primary-500 focus:ring-primary-200 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 focus:ring-2 focus:outline-none"
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
                <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                  서브카테고리
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => {
                    setSubCategory(e.target.value as SubCategoryValue)
                  }}
                  className="focus:border-primary-500 focus:ring-primary-200 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 focus:ring-2 focus:outline-none"
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
                <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                  상품 설명
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="상품에 대해 자세히 설명해주세요"
                  rows={6}
                  className={`block w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors placeholder:text-neutral-400 focus:ring-2 focus:outline-none ${
                    errors.description
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                      : 'focus:border-primary-500 focus:ring-primary-200 border-neutral-300'
                  }`}
                />
                <div className="mt-3 rounded-lg bg-neutral-50 p-4">
                  <p className="text-xs font-semibold text-neutral-600">
                    다음 내용을 포함하면 좋습니다:
                  </p>
                  <ul className="mt-2 list-inside space-y-1 text-xs text-neutral-600">
                    <li>• 구매 시기, 사용 기간</li>
                    <li>• 상품의 현재 상태</li>
                    <li>• 하자나 수리 이력</li>
                  </ul>
                </div>
                {errors.description && (
                  <p className="mt-2 text-sm font-medium text-red-500">
                    ⚠️ {errors.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-12 flex-1 border-neutral-300 font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isUploadingImages}
            className="bg-primary-600 hover:bg-primary-700 h-12 flex-1 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isLoading || isUploadingImages ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>
                  {isUploadingImages ? '이미지 업로드 중...' : '등록 중...'}
                </span>
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
