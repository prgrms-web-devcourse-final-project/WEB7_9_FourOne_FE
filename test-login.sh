#!/bin/bash

# 배포 서버 로그인 테스트 스크립트

echo "=== 배포 서버 로그인 테스트 ==="
echo ""

# 로그인 요청
RESPONSE=$(curl -X POST https://api.p-14626.khee.store/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notforbug@gmail.com","password":"Password123!"}' \
  -c cookies.txt \
  -s -w "\nHTTP_STATUS:%{http_code}")

# HTTP 상태 코드 추출
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# 쿠키 확인
if [ -f cookies.txt ]; then
  echo "=== 쿠키 확인 ==="
  cat cookies.txt | grep -E "(accessToken|refreshToken)" || echo "쿠키에 토큰이 없습니다."
  echo ""
fi

# 토큰 추출 및 검증
if [ "$HTTP_STATUS" = "200" ]; then
  ACCESS_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken' 2>/dev/null)
  
  if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo "=== 토큰 유효성 검사 ==="
    
    # JWT 디코딩 (payload 부분만)
    PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d. -f2)
    
    # Base64 디코딩 시도
    if [ -n "$PAYLOAD" ]; then
      # Base64 padding 추가 (필요한 경우)
      case $((${#PAYLOAD} % 4)) in
        2) PAYLOAD="${PAYLOAD}==" ;;
        3) PAYLOAD="${PAYLOAD}=" ;;
      esac
      
      DECODED=$(echo "$PAYLOAD" | base64 -d 2>/dev/null)
      
      if [ $? -eq 0 ]; then
        echo "토큰 디코딩 성공:"
        echo "$DECODED" | jq . 2>/dev/null || echo "$DECODED"
        echo ""
        
        # 만료 시간 확인
        EXP=$(echo "$DECODED" | jq -r '.exp' 2>/dev/null)
        if [ -n "$EXP" ] && [ "$EXP" != "null" ]; then
          EXP_DATE=$(date -r "$EXP" 2>/dev/null || date -d "@$EXP" 2>/dev/null)
          NOW=$(date +%s)
          
          echo "토큰 만료 시간: $EXP_DATE (Unix: $EXP)"
          echo "현재 시간: $(date)"
          
          if [ "$EXP" -gt "$NOW" ]; then
            REMAINING=$((EXP - NOW))
            echo "✅ 토큰 유효 (남은 시간: ${REMAINING}초 = 약 $((REMAINING / 60))분)"
          else
            echo "❌ 토큰 만료됨"
          fi
        fi
      else
        echo "❌ 토큰 디코딩 실패"
      fi
    fi
  else
    echo "❌ 응답에 accessToken이 없습니다."
  fi
fi

# 정리
rm -f cookies.txt

echo ""
echo "=== 테스트 완료 ==="

