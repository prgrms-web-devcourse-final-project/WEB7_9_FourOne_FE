'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Input } from '@/components/ui/input'
import { productApi } from '@/lib/api'
import { Product } from '@/types'
import { Camera, MapPin, Package, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductEditClientProps {
  product: Product
}

export function ProductEditClient({ product }: ProductEditClientProps) {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    initialPrice: product.initialPrice,
    location: product.location,
    auctionDuration: '24시간', // 기본값 24시간
    deliveryMethod:
      product.deliveryMethod === 'BOTH'
        ? ['TRADE', 'DELIVERY']
        : product.deliveryMethod === 'DELIVERY'
          ? ['DELIVERY']
          : product.deliveryMethod === 'TRADE'
            ? ['TRADE']
            : [],
  })
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(
    (product.images || []).map((img) =>
      typeof img === 'string' ? img : img.imageUrl,
    ),
  )
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      const method = name as 'TRADE' | 'DELIVERY'

      // 개별 옵션 선택 시 해당 옵션 추가/제거 (중복 방지)
      setFormData((prev) => ({
        ...prev,
        deliveryMethod: checked
          ? prev.deliveryMethod.includes(method)
            ? prev.deliveryMethod // 이미 포함되어 있으면 그대로 유지
            : [...prev.deliveryMethod, method] // 없으면 추가
          : prev.deliveryMethod.filter((m) => m !== method), // 체크 해제 시 제거
      }))
    } else {
      setFormData((prev) => {
        if (name === 'initialPrice') {
          // 숫자만 추출하고 안전하게 변환
          const cleanValue = value.replace(/[^0-9]/g, '') // 숫자가 아닌 문자 제거
          const numericValue = cleanValue ? Number(cleanValue) : 0

          return {
            ...prev,
            [name]: numericValue,
          }
        }

        return {
          ...prev,
          [name]: value,
        }
      })
    }

    // 에러 메시지 제거
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(files)

    // 새 이미지 미리보기 생성
    const previews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews(previews)

    console.log('📸 새 이미지 선택:', {
      fileCount: files.length,
      fileNames: files.map((f) => f.name),
      fileSizes: files.map((f) => f.size),
      previews: previews.length,
    })
  }

  const handleDeleteExistingImage = (imageUrl: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== imageUrl))
    setImagesToDelete((prev) => [...prev, imageUrl])
  }

  const handleDeleteNewImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)

    setImages(newImages)
    setImagePreviews(newPreviews)

    // URL 해제
    URL.revokeObjectURL(imagePreviews[index])
  }

  // 상품 삭제 함수
  const handleDeleteProduct = async () => {
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
        alert('상품이 성공적으로 삭제되었습니다.')
        router.push('/my-products')
      } else {
        setApiError(response.msg || '상품 삭제에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('상품 삭제 실패:', error)

      if (error.response?.status === 401) {
        console.log('🔍 401 에러 - 로그인 필요')
        setApiError('')
      } else {
        setApiError(
          error.response?.data?.msg || '상품 삭제 중 오류가 발생했습니다.',
        )
      }
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

    if (formData.initialPrice <= 0) {
      newErrors.initialPrice = '시작가를 입력해주세요'
    }

    if (!formData.location.trim()) {
      newErrors.location = '위치를 입력해주세요'
    }

    if (
      !formData.auctionDuration ||
      (formData.auctionDuration !== '24시간' &&
        formData.auctionDuration !== '48시간')
    ) {
      newErrors.auctionDuration =
        '경매 기간을 선택해주세요 (24시간 또는 48시간)'
    }

    if (formData.deliveryMethod.length === 0) {
      newErrors.deliveryMethod = '거래 방법을 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      // 배송 방법 매핑
      let deliveryMethod: 'DELIVERY' | 'BOTH' | 'TRADE' = 'DELIVERY'
      if (
        formData.deliveryMethod.includes('TRADE') &&
        formData.deliveryMethod.includes('DELIVERY')
      ) {
        deliveryMethod = 'BOTH'
      } else if (formData.deliveryMethod.includes('TRADE')) {
        deliveryMethod = 'TRADE'
      } else if (formData.deliveryMethod.includes('DELIVERY')) {
        deliveryMethod = 'DELIVERY'
      }

      // 상품 수정 API 호출 (api-test와 동일한 방식)
      const requestData = {
        name: formData.name,
        description: formData.description,
        initialPrice: formData.initialPrice,
        location: formData.location,
        deliveryMethod: deliveryMethod,
      }

      // 삭제할 이미지 ID 계산 (이미지 객체에서 ID 추출)
      const deleteImageIds = imagesToDelete
        .map((deletedUrl) => {
          // 이미지가 객체인 경우 ID 추출, 문자열인 경우 인덱스 사용
          const originalImage = (product.images || []).find((img) => {
            if (typeof img === 'string') {
              return img === deletedUrl
            } else {
              return img.imageUrl === deletedUrl
            }
          })

          if (
            originalImage &&
            typeof originalImage === 'object' &&
            originalImage.id !== undefined &&
            originalImage.id !== null
          ) {
            return originalImage.id
          } else {
            // 문자열인 경우 인덱스 반환
            const index = (product.images || []).indexOf(deletedUrl)
            return index >= 0 ? index : -1
          }
        })
        .filter((id) => id !== undefined && id !== null && id >= 0)

      console.log('🗑️ 삭제할 이미지 ID들:', deleteImageIds)
      console.log(
        '🗑️ 삭제할 이미지 ID 타입들:',
        deleteImageIds.map((id) => typeof id),
      )

      // productId를 안전하게 가져오기
      const productId = product.productId || (product as any).id
      console.log('🔧 사용할 productId:', productId)

      if (!productId) {
        setApiError('상품 ID를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      const response = await productApi.updateProduct(
        productId,
        requestData,
        images,
        deleteImageIds, // 삭제할 이미지 인덱스
      )

      console.log('🔧 상품 수정 응답:', {
        success: response.success,
        data: response.data,
        resultCode: response.resultCode,
        msg: response.msg,
        fullResponse: response,
      })

      console.log('🔧 성공 조건 확인:', {
        'response.success': response.success,
        'response.resultCode': response.resultCode,
        'resultCode?.startsWith("200")': response.resultCode?.startsWith('200'),
        '최종 성공 조건':
          response.success || response.resultCode?.startsWith('200'),
      })

      if (response.success || response.resultCode?.startsWith('200')) {
        console.log('✅ 상품 수정 성공:', response.data)
        alert('상품이 성공적으로 수정되었습니다.')
        const redirectProductId = product.productId || (product as any).id
        router.push(`/products/${redirectProductId}`)
      } else {
        console.log('❌ 상품 수정 실패:', response.msg)
        setApiError(response.msg || '상품 수정에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('상품 수정 실패:', error)

      // 401 에러는 로그인 관련 메시지 표시하지 않음
      if (error.message?.includes('401') || error.response?.status === 401) {
        setApiError('상품 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setApiError(
          error.response?.data?.msg || '상품 수정 중 오류가 발생했습니다.',
        )
      }
    }

    setIsLoading(false)
  }

  const handleCancel = () => {
    const productId = product.productId || (product as any).id
    router.push(`/products/${productId}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* API 에러 메시지 */}
        {apiError && (
          <ErrorAlert
            title="요청 실패"
            message={apiError}
            onClose={() => setApiError('')}
          />
        )}

        {/* 상품 사진 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              상품 사진
            </h2>

            {/* 기존 이미지들 */}
            {existingImages.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-neutral-700">
                  기존 이미지 ({existingImages.length}장)
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={imageUrl}
                        alt={`기존 이미지 ${index + 1}`}
                        className="h-24 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(imageUrl)}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새로 선택한 이미지들 */}
            {imagePreviews.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-neutral-700">
                  새로 추가할 이미지 ({imagePreviews.length}장)
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={preview}
                        alt={`새 이미지 ${index + 1}`}
                        className="h-24 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteNewImage(index)}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새 이미지 추가 */}
            <div className="rounded-lg border-2 border-dashed border-neutral-300 p-8 text-center">
              <Camera className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
              <p className="mb-2 text-neutral-600">
                새로운 사진을 선택해주세요
              </p>
              <p className="mb-4 text-sm text-neutral-500">
                새로 선택한 이미지가 추가됩니다 (최대 10장)
              </p>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="bg-primary-600 hover:bg-primary-700 inline-flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-medium text-white"
              >
                이미지 추가
              </label>
              {images.length > 0 && (
                <p className="mt-2 text-sm text-neutral-600">
                  {images.length}개의 새 이미지가 선택되었습니다
                </p>
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
              {/* 상품명 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  상품명 *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="상품명을 입력하세요"
                  error={errors.name}
                />
              </div>

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
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 p-3 focus:ring-1 focus:outline-none"
                  rows={4}
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
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-neutral-300 p-2 focus:ring-1 focus:outline-none"
                >
                  <option value="디지털/가전">디지털/가전</option>
                  <option value="패션/의류">패션/의류</option>
                  <option value="뷰티/미용">뷰티/미용</option>
                  <option value="홈/리빙">홈/리빙</option>
                  <option value="스포츠/레저">스포츠/레저</option>
                  <option value="도서/음반/DVD">도서/음반/DVD</option>
                  <option value="반려동물용품">반려동물용품</option>
                  <option value="유아동/출산용품">유아동/출산용품</option>
                  <option value="식품/건강식품">식품/건강식품</option>
                  <option value="자동차/오토바이">자동차/오토바이</option>
                  <option value="취미/수집품">취미/수집품</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 시작가 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  시작가 *
                </label>
                <Input
                  name="initialPrice"
                  type="number"
                  value={formData.initialPrice}
                  onChange={handleInputChange}
                  placeholder="시작가를 입력하세요"
                  min="1000"
                  step="100"
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  error={errors.initialPrice}
                />
              </div>

              {/* 경매 기간 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  경매 기간 *
                </label>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="auctionDuration"
                      value="24시간"
                      checked={formData.auctionDuration === '24시간'}
                      onChange={handleInputChange}
                      className="text-primary-600 focus:ring-primary-500 mr-3"
                    />
                    <span>24시간</span>
                  </label>
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="auctionDuration"
                      value="48시간"
                      checked={formData.auctionDuration === '48시간'}
                      onChange={handleInputChange}
                      className="text-primary-600 focus:ring-primary-500 mr-3"
                    />
                    <span>48시간</span>
                  </label>
                </div>
                <div className="mt-2 text-sm text-neutral-500">
                  경매 진행 기간을 선택해주세요
                </div>
                {errors.auctionDuration && (
                  <p className="text-error-500 mt-1 text-sm">
                    {errors.auctionDuration}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 거래 정보 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              거래 정보
            </h2>

            <div className="space-y-4">
              {/* 위치 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  거래 위치 *
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="거래 위치를 입력하세요"
                  error={errors.location}
                />
              </div>

              {/* 거래 방식 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  거래 방법 * (중복 선택 가능)
                </label>
                {errors.deliveryMethod && (
                  <p className="text-error-500 mb-2 text-sm">
                    {errors.deliveryMethod}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center rounded-lg border border-neutral-300 p-4 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      name="DELIVERY"
                      checked={formData.deliveryMethod.includes('DELIVERY')}
                      onChange={handleInputChange}
                      className="text-primary-600 focus:ring-primary-500 rounded border-neutral-300"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-neutral-600" />
                        <span className="font-medium">배송</span>
                      </div>
                      <p className="text-sm text-neutral-500">택배, 우편 등</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center rounded-lg border border-neutral-300 p-4 hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      name="TRADE"
                      checked={formData.deliveryMethod.includes('TRADE')}
                      onChange={handleInputChange}
                      className="text-primary-600 focus:ring-primary-500 rounded border-neutral-300"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-neutral-600" />
                        <span className="font-medium">직거래</span>
                      </div>
                      <p className="text-sm text-neutral-500">
                        직접 만나서 거래
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            취소
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDeleteProduct}
            disabled={isDeleting || isLoading}
            className="flex-1 border-red-500 bg-red-500 text-white hover:bg-red-600"
          >
            <X className="mr-2 h-4 w-4" />
            {isDeleting ? '삭제 중...' : '삭제하기'}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isDeleting}
            className="bg-primary-600 hover:bg-primary-700 flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? '수정 중...' : '수정하기'}
          </Button>
        </div>
      </form>
    </div>
  )
}
