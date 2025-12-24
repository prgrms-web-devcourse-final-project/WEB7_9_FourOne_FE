/**
 * 파일명만 있는 경우 전체 S3 URL로 변환
 * @param imageUrl 파일명 또는 전체 URL
 * @returns 전체 S3 URL
 */
export function getFullImageUrl(
  imageUrl: string | undefined | null,
): string | null {
  if (!imageUrl) return null

  // 이미 전체 URL인 경우 (http:// 또는 https://로 시작)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // 파일명만 있는 경우 S3 URL 구성
  // PreSigned URL 형식: https://{bucket}.s3.{region}.amazonaws.com/{파일명}
  // 실제 S3 버킷 URL은 환경변수나 상수로 관리
  // 임시로 PreSigned URL에서 추출한 정보를 사용하거나, 환경변수 사용
  const s3BucketUrl =
    process.env.NEXT_PUBLIC_S3_BUCKET_URL ||
    'https://teamb4-drop-dev-s3-bucket.s3.ap-northeast-2.amazonaws.com'

  return `${s3BucketUrl}/${imageUrl}`
}
