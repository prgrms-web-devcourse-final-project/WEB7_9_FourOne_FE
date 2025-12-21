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
import { Product } from '@/types'
import { Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProductEditClientProps {
  product: Product
}

export function ProductEditClient({ product }: ProductEditClientProps) {
  const router = useRouter()

  // 경매 등록 여부 확인 (경매 시작 전이 아니면 수정/삭제 불가)
  const isAuctionRegistered =
    product.status !== '경매 시작 전' && (product as any).auctionStartTime

  // 등록 폼과 동일한 형식
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    imageUrls: (product.images || []).map((img) =>
      typeof img === 'string' ? img : img.imageUrl,
    ) as string[],
  })
  const [newImageUrl, setNewImageUrl] = useState('')
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

  const handleAddImageUrl = () => {
    const trimmedUrl = newImageUrl.trim()
    if (!trimmedUrl) {
      showErrorToast('이미지 URL을 입력해주세요.', '입력 오류')
      return
    }
    if (
      !trimmedUrl.startsWith('http://') &&
      !trimmedUrl.startsWith('https://')
    ) {
      showErrorToast(
        '올바른 URL 형식이 아닙니다. http:// 또는 https://로 시작해야 합니다.',
        '입력 오류',
      )
      return
    }
    if (formData.imageUrls.includes(trimmedUrl)) {
      showErrorToast('이미 추가된 이미지입니다.', '중복 오류')
      return
    }
    setFormData((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, trimmedUrl],
    }))
    setNewImageUrl('')
  }

  const handleImageUrlDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }))
  }

  const handleImageUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddImageUrl()
    }
  }

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

    if (formData.imageUrls.length === 0) {
      showErrorToast(
        '최소 1개 이상의 이미지 URL을 추가해주세요.',
        '이미지 필요',
      )
      newErrors.imageUrls = '이미지를 추가해주세요'
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

    console.log('📝 상품 수정 요청 데이터:', {
      name: formData.name,
      description: formData.description,
      category: category,
      subCategory: subCategory,
      imagesFiles: formData.imageUrls,
    })

    try {
      const productId = product.productId || (product as any).id
      if (!productId) {
        setApiError('상품 ID를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      const response = await productApi.updateProduct(
        productId,
        {
          name: formData.name,
          description: formData.description,
          category: category,
          subCategory: subCategory,
          imagesFiles: formData.imageUrls,
        } as any,
        [], // 파일 배열은 사용하지 않음
        [], // 삭제할 이미지 ID는 사용하지 않음
      )

      console.log('📝 상품 수정 응답:', response)

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
    }

    setIsLoading(false)
  }

  const currentCategoryData = CATEGORIES.find((cat) => cat.value === category)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
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
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              상품 정보
            </h2>

            <div className="space-y-4">
              {/* 상품명 */}
              <Input
                label="상품명 *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="상품명을 입력하세요"
                error={errors.name}
                disabled={isAuctionRegistered}
              />

              {/* 상품 설명 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  상품 설명 *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="상품에 대한 자세한 설명을 입력하세요"
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 p-3 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                  rows={4}
                  disabled={isAuctionRegistered}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* 카테고리 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  카테고리 *
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
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 p-2 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
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
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  세부 카테고리 *
                </label>
                <select
                  value={subCategory}
                  onChange={(e) =>
                    setSubCategory(e.target.value as SubCategoryValue)
                  }
                  disabled={isAuctionRegistered}
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 p-2 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
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

        {/* 이미지 URL 입력 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              이미지 URL *
            </h2>

            <div className="space-y-4">
              {/* URL 입력 */}
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyPress={handleImageUrlKeyPress}
                  placeholder="이미지 URL을 입력하세요 (예: https://...)"
                  disabled={isAuctionRegistered}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddImageUrl}
                  disabled={isAuctionRegistered}
                >
                  추가
                </Button>
              </div>

              {/* URL 목록 */}
              {formData.imageUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">
                    등록된 이미지 URL ({formData.imageUrls.length}개)
                  </p>
                  {formData.imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 p-3"
                    >
                      <span className="truncate text-sm text-neutral-600">
                        {url}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImageUrlDelete(index)}
                        disabled={isAuctionRegistered}
                        className="ml-2 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {errors.imageUrls && (
                <p className="text-sm text-red-600">{errors.imageUrls}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading || isDeleting}
          >
            취소
          </Button>
          {!isAuctionRegistered && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteProduct}
              disabled={isLoading || isDeleting}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? '삭제 중...' : '상품 삭제'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading || isDeleting || isAuctionRegistered}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? '저장 중...' : '수정 완료'}
          </Button>
        </div>
      </form>
    </div>
  )
}
