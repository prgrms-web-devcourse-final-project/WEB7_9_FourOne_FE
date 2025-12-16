// 새로운 백엔드 카테고리 시스템 (enum 기반)
export type CategoryValue = 'STARGOODS' | 'FIGURE' | 'CDLP' | 'GAME'
export type SubCategoryValue =
  | 'ACC'
  | 'STATIONARY'
  | 'DAILY'
  | 'ETC'
  | 'ELECTRONICS'
  | 'GAME'

export interface Category {
  value: CategoryValue
  label: string
  subCategories: SubCategory[]
}

export interface SubCategory {
  value: SubCategoryValue
  label: string
}

// 메인 카테고리 정의
export const CATEGORIES: Category[] = [
  {
    value: 'STARGOODS',
    label: '스타굿즈',
    subCategories: [
      { value: 'ACC', label: '악세서리' },
      { value: 'STATIONARY', label: '문구류' },
      { value: 'DAILY', label: '일상용품' },
      { value: 'ETC', label: '기타' },
    ],
  },
  {
    value: 'FIGURE',
    label: '피규어',
    subCategories: [
      { value: 'ETC', label: '기타' },
    ],
  },
  {
    value: 'CDLP',
    label: 'CD/LP',
    subCategories: [
      { value: 'ETC', label: '기타' },
    ],
  },
  {
    value: 'GAME',
    label: '게임',
    subCategories: [
      { value: 'ELECTRONICS', label: '전자제품' },
      { value: 'GAME', label: '게임' },
      { value: 'ETC', label: '기타' },
    ],
  },
]

// 카테고리 값으로 라벨 찾기
export const getCategoryLabel = (value: CategoryValue): string => {
  const category = CATEGORIES.find((cat) => cat.value === value)
  return category?.label || value
}

// 서브카테고리 값으로 라벨 찾기
export const getSubCategoryLabel = (
  categoryValue: CategoryValue,
  subCategoryValue: SubCategoryValue,
): string => {
  const category = CATEGORIES.find((cat) => cat.value === categoryValue)
  const subCategory = category?.subCategories.find(
    (sub) => sub.value === subCategoryValue,
  )
  return subCategory?.label || subCategoryValue
}

// 카테고리와 서브카테고리 조합으로 전체 라벨 반환
export const getFullCategoryLabel = (
  category: CategoryValue,
  subCategory: SubCategoryValue,
): string => {
  return `${getCategoryLabel(category)} > ${getSubCategoryLabel(category, subCategory)}`
}

// 필터용 카테고리 옵션 (전체 포함)
export const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: '전체', apiValue: null },
  ...CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
    apiValue: cat.value,
  })),
]

