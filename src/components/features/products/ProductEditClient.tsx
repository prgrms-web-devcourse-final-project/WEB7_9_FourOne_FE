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
import { getFullImageUrl } from '@/lib/utils/image-url'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Product } from '@/types'
import { Save, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ProductEditClientProps {
  product: Product
}

export function ProductEditClient({ product }: ProductEditClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 경매 등록 여부 확인 (경매 시작 전이 아니면 수정/삭제 불가)
  const isAuctionRegistered =
    product.status !== '경매 시작 전' && (product as any).auctionStartTime

  // 등록 폼과 동일한 형식
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
  })
  // 기존 이미지 URL (조회는 안되지만 표시용)
  const [existingImageUrls] = useState<string[]>(
    (product.images || [])
      .map((img) => {
        const url = typeof img === 'string' ? img : img.imageUrl
        return getFullImageUrl(url)
      })
      .filter((url): url is string => url !== null && url !== undefined),
  )
  // 새로 선택한 이미지 파일 배열
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  // 새로 선택한 이미지의 미리보기 URL 배열
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [category, setCategory] = useState<CategoryValue>(
    (product as any).category || 'STARGOODS',
  )
  const [subCategory, setSubCategory] = useState<SubCategoryValue>(
    (product as any).subCategory || 'ACC',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError, '요청 실패')
      setApiError('')
    }
  }, [apiError])

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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
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

  // 이미지 삭제 (새로 선택한 이미지만)
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

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const handleDeleteProduct = async () => {
    if (isAuctionRegistered) {
      showErrorToast('경매가 등록된 상품은 삭제할 수 없습니다.', '삭제 불가')
      return
    }

    if (
      !confirm(
        '정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      )
    ) {
      return
    }

    setIsDeleting(true)
    setApiError('')

    try {
      const productId = product.productId || (product as any).id
      if (!productId) {
        setApiError('상품 ID를 찾을 수 없습니다.')
        setIsDeleting(false)
        return
      }

      const response = await productApi.deleteProduct(productId)

      if (response.success || response.resultCode?.startsWith('200')) {
        showSuccessToast('상품이 성공적으로 삭제되었습니다.')
        router.push('/my-products')
      } else {
        setApiError(response.msg || '상품 삭제에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('상품 삭제 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }

    setIsDeleting(false)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '상품명을 입력해주세요'
    }

    if (!formData.description.trim()) {
      newErrors.description = '상품 설명을 입력해주세요'
    }

    // 기존 이미지가 없고 새로 선택한 이미지도 없으면 에러
    if (existingImageUrls.length === 0 && selectedImages.length === 0) {
      showErrorToast('최소 1개 이상의 이미지를 선택해주세요.', '이미지 필요')
      newErrors.images = '이미지를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isAuctionRegistered) {
      showErrorToast('경매가 등록된 상품은 수정할 수 없습니다.', '수정 불가')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      const productId = product.productId || (product as any).id
      if (!productId) {
        setApiError('상품 ID를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      const normalizeProductKey = (value: string): string => {
        // URL이면 pathname, 아니면 그대로 사용 후 prefix 정규화
        let key = value
        if (value.startsWith('http')) {
          try {
            key = new URL(value).pathname
          } catch (err) {
            // URL 파싱 실패 시 원본 값 사용
            key = value
          }
        }

        key = key.replace(/^\/+/, '')
        key = key.split('?')[0]

        const filename = key.split('/').pop() || ''
        if (!filename) return ''

        if (key.includes('image/product/')) {
          return key.replace(/^\/+/, '')
        }

        return `image/product/${filename}`
      }

      let imageFileNames: string[] = []

      // 새로 선택한 이미지가 있으면 업로드
      if (selectedImages.length > 0) {
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

        // 업로드된 파일명 배열 (이미 image/product/{filename.ext}로 반환되지만 안전하게 normalize)
        imageFileNames = uploadResponse.data.map((key) =>
          normalizeProductKey(key),
        )
        setIsUploadingImages(false)
      }

      // 기존 이미지 URL에서 파일명만 추출 (전체 URL이 아닌 파일명만 있는 경우)
      const existingFileNames = existingImageUrls
        .map((url) => normalizeProductKey(url))
        .filter((name) => name) // 빈 문자열 제거

      // 기존 이미지 파일명과 새로 업로드한 파일명 합치기
      const allImageFileNames = [
        ...existingFileNames,
        ...imageFileNames,
      ].filter((name, index, self) => self.indexOf(name) === index) // 중복 제거

      // 2. 상품 수정 API 호출
      const response = await productApi.updateProduct(
        productId,
        {
          name: formData.name,
          description: formData.description,
          category: category,
          subCategory: subCategory,
          imagesFiles: allImageFileNames, // 파일명만 전달
        } as any,
        [], // 파일 배열은 사용하지 않음
        [], // 삭제할 이미지 ID는 사용하지 않음
      )

      if (response.success) {
        showSuccessToast('상품이 성공적으로 수정되었습니다.')
        router.push(`/products/${productId}`)
      } else {
        setApiError(
          response.message ||
            response.msg ||
            '상품 수정에 실패했습니다. 다시 시도해주세요.',
        )
      }
    } catch (error: any) {
      console.error('API 에러:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
      setIsUploadingImages(false)
    }

    setIsLoading(false)
  }

  const currentCategoryData = CATEGORIES.find((cat) => cat.value === category)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">상품 수정</h1>
        {isAuctionRegistered && (
          <div className="rounded-md bg-yellow-50 px-3 py-1 text-sm text-yellow-800">
            경매 등록됨 - 수정 불가
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 상품 정보 */}
        <Card variant="outlined" className="border-neutral-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              상품 정보
            </h2>

            <div className="space-y-5">
              {/* 상품명 */}
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
                  disabled={isAuctionRegistered}
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

              {/* 상품 설명 */}
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
                  disabled={isAuctionRegistered}
                  className={`block w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors placeholder:text-neutral-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 ${
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

              {/* 카테고리 */}
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
                    const newCategoryData = CATEGORIES.find(
                      (cat) => cat.value === newCategory,
                    )
                    if (
                      newCategoryData &&
                      newCategoryData.subCategories.length > 0
                    ) {
                      setSubCategory(newCategoryData.subCategories[0].value)
                    }
                  }}
                  disabled={isAuctionRegistered}
                  className="focus:border-primary-500 focus:ring-primary-200 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 서브카테고리 */}
              <div>
                <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                  서브카테고리
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  value={subCategory}
                  onChange={(e) =>
                    setSubCategory(e.target.value as SubCategoryValue)
                  }
                  disabled={isAuctionRegistered}
                  className="focus:border-primary-500 focus:ring-primary-200 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                >
                  {currentCategoryData?.subCategories.map((subCat) => (
                    <option key={subCat.value} value={subCat.value}>
                      {subCat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상품 이미지 */}
        <Card variant="outlined" className="border-neutral-200 shadow-sm">
          <CardContent className="p-8">
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              상품 이미지
              <span className="ml-1 text-red-500">*</span>
            </h2>

            <div className="space-y-5">
              {/* 기존 이미지 표시 (조회는 안되지만 표시용) */}
              {existingImageUrls.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700">
                      기존 이미지
                      <span className="bg-primary-100 text-primary-700 ml-2 inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {existingImageUrls.length}개
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {existingImageUrls.map((url, index) => (
                      <div
                        key={`existing-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <img
                          src={url}
                          alt={`기존 이미지 ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7slYzsiqTtirgg7Yq567OE7ZWYPC90ZXh0Pjwvc3ZnPg=='
                          }}
                        />
                        <div className="absolute inset-0 bg-black opacity-0 transition-opacity group-hover:opacity-10" />
                        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-2 text-xs text-white">
                          기존 이미지
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  disabled={
                    isUploadingImages ||
                    isAuctionRegistered ||
                    selectedImages.length >= 10
                  }
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
                      새로 선택한 이미지
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
                          disabled={isAuctionRegistered}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-md transition-all group-hover:opacity-100 hover:scale-110 hover:bg-red-600 disabled:opacity-50"
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

        {/* 버튼 */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading || isDeleting}
              className="h-12 border-neutral-300 font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50"
            >
              취소
            </Button>
            {!isAuctionRegistered && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteProduct}
                disabled={isLoading || isDeleting}
                className="h-12 border-red-200 font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? '삭제 중...' : '상품 삭제'}
              </Button>
            )}
          </div>
          <Button
            type="submit"
            disabled={
              isLoading ||
              isDeleting ||
              isAuctionRegistered ||
              isUploadingImages
            }
            className="bg-primary-600 hover:bg-primary-700 h-12 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isLoading || isUploadingImages ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>
                  {isUploadingImages ? '이미지 업로드 중...' : '저장 중...'}
                </span>
              </div>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                수정 완료
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
