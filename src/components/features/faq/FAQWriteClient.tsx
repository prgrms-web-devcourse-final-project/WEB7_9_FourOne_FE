'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

const categories = [
  { id: 'general', label: '일반' },
  { id: 'technical', label: '기술' },
  { id: 'payment', label: '결제' },
  { id: 'shipping', label: '배송' },
  { id: 'other', label: '기타' },
]

interface FAQItem {
  id: string
  question: string
  answer: string
}

export function FAQWriteClient() {
  const [formData, setFormData] = useState({
    category: 'general',
    title: '',
    description: '',
  })
  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    { id: '1', question: '', answer: '' },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleFAQItemChange = (
    id: string,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setFaqItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const addFAQItem = () => {
    const newId = (faqItems.length + 1).toString()
    setFaqItems((prev) => [...prev, { id: newId, question: '', answer: '' }])
  }

  const removeFAQItem = (id: string) => {
    if (faqItems.length > 1) {
      setFaqItems((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    if (!formData.title) {
      newErrors.title = 'FAQ 제목을 입력해주세요'
    }

    if (faqItems.some((item) => !item.question.trim())) {
      newErrors.faqItems = '모든 질문을 입력해주세요'
    }

    if (faqItems.some((item) => !item.answer.trim())) {
      newErrors.faqItems = '모든 답변을 입력해주세요'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      // TODO: API 호출
      console.log('FAQ 작성:', { formData, faqItems })
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* FAQ 기본 정보 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              FAQ 기본 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  카테고리 *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="FAQ 제목 *"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="예: 경매 이용 방법"
                error={errors.title}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="이 FAQ에 대한 간단한 설명을 입력하세요 (선택사항)"
                  rows={3}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ 목록 */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                FAQ 목록 ({faqItems.length}개)
              </h2>
              <Button type="button" onClick={addFAQItem} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                항목 추가
              </Button>
            </div>

            <div className="space-y-6">
              {faqItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-neutral-900">
                      FAQ {index + 1}
                    </h3>
                    {faqItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFAQItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        질문
                      </label>
                      <Input
                        value={item.question}
                        onChange={(e) =>
                          handleFAQItemChange(
                            item.id,
                            'question',
                            e.target.value,
                          )
                        }
                        placeholder="자주 묻는 질문을 입력하세요"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        답변
                      </label>
                      <textarea
                        value={item.answer}
                        onChange={(e) =>
                          handleFAQItemChange(item.id, 'answer', e.target.value)
                        }
                        placeholder="질문에 대한 상세한 답변을 입력하세요"
                        rows={4}
                        className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errors.faqItems && (
              <p className="text-error-500 mt-2 text-sm">{errors.faqItems}</p>
            )}
          </CardContent>
        </Card>

        {/* FAQ 작성 가이드 */}
        <Card variant="outlined" className="bg-neutral-50">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              FAQ 작성 가이드:
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                사용자가 자주 묻는 질문을 우선적으로 작성하세요
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                질문은 구체적이고 명확하게 작성하세요
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                답변은 단계별로 자세히 설명하세요
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                관련 링크나 추가 정보가 있다면 포함해주세요
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            취소
          </Button>
          <Button type="submit">FAQ 등록</Button>
        </div>
      </form>
    </div>
  )
}
