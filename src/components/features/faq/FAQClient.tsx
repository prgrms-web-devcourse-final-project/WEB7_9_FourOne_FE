'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Post } from '@/types'
import { useState } from 'react'

interface FAQClientProps {
  initialPosts: Post[]
}

export function FAQClient({ initialPosts }: FAQClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('faq')
  const [searchQuery, setSearchQuery] = useState('')
  const [posts] = useState(initialPosts || [])

  // 실제 데이터에서 카운트 계산
  const categories = [
    {
      id: 'notice',
      label: '공지사항',
      count: posts.filter((p) => p.category === 'notice').length,
    },
    {
      id: 'qna',
      label: 'Q&A',
      count: posts.filter((p) => p.category === 'qna').length,
    },
    {
      id: 'faq',
      label: 'FAQ',
      count: posts.filter((p) => p.category === 'faq').length,
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = post.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 검색바 */}
      <div className="mb-6">
        <Input
          placeholder="검색어를 입력하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
      </div>

      {/* 카테고리 탭 */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-neutral-100 p-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'text-primary-600 bg-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* FAQ 목록 */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-2xl">❓</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  FAQ가 없습니다
                </h3>
                <p className="text-neutral-600">
                  {searchQuery
                    ? '검색 결과가 없습니다. 다른 키워드로 시도해보세요.'
                    : '아직 등록된 FAQ가 없습니다.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} variant="outlined">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="text-primary-500 text-sm font-medium">
                        Q.
                      </span>
                    </div>

                    <h3 className="mb-3 text-lg font-semibold text-neutral-900">
                      {post.title}
                    </h3>

                    <div className="mb-3">
                      <span className="text-success-500 text-sm font-medium">
                        A.
                      </span>
                      <p className="mt-1 text-sm text-neutral-600">
                        {post.content}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-neutral-500">
                      <span>{formatDate(post.createdAt)}</span>
                      <span>조회 {post.viewCount}</span>
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `/faq/${post.id}`)}
                    >
                      상세보기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 글쓰기 버튼 */}
      <div className="mt-8 text-center">
        <Button onClick={() => (window.location.href = '/faq/write')}>
          FAQ 작성
        </Button>
      </div>
    </div>
  )
}
