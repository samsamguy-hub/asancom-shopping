# 아산컴마트 컴퓨터 전문 쇼핑몰 스타터

Next.js 16 + React 19 + Supabase 기반 **교육/개발용 MVP**입니다.

## ✅ 현재 구현 기능
- PC/모바일 반응형 메인, 검색, 상품목록, 카테고리, 상세페이지
- 컴퓨터 부품 견적: CPU/메인보드/메모리/GPU/SSD/파워/케이스 선택, 자동 합계
- 규격 검사: CPU 소켓, DDR 규격, 기초 전력과 케이스 그래픽카드 길이
- 견적 내용 복사, 인쇄 및 브라우저 PDF 저장
- Supabase DB 연결 이전에도 **가상 예시상품**으로 시연 가능
- 이메일/비밀번호 관리자 로그인, 역할 검사, 상품 등록·수정, 재고·가격 변경, 판매 공개/비공개
- Supabase Row Level Security(RLS) 적용 SQL
- 상품사진 업로드·교체·삭제·공개 설정 (관리자 전용, Supabase Storage 비공개 버킷, 고객에게는 공개 사진만 표시)
- 상품 CSV 일괄등록·수정 (관리자 전용, UTF-8/한국어 엑셀 CSV, 반영 전 미리보기)

## ❌ 아직 구현되지 않은 기능
- 실제 결제(PG), 장바구니, 주문, 배송, 취소·환불, 자동재고차감
- 고객 회원가입 및 본인 주문조회
- 견적 서버 저장, 세금계산서, 거래처 재고 연동
- 정확한 BIOS/발열/쿨러/케이스/파워 커넥터/호환성 전체 검증

**실제 판매 시작 전에는 보안·결제·개인정보·재고 동시성 점검과 법적 고지가 필요합니다.**

## 1. 준비
Windows 11 PowerShell에서 Git, VS Code, Node.js LTS, Claude Code를 설치합니다.

```powershell
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VisualStudioCode
winget install Git.Git
winget install Anthropic.ClaudeCode
```

새 PowerShell에서 `node -v`, `npm -v`, `claude --version`을 확인합니다.

## 2. 실행
다운로드한 zip을 압축 해제한 폴더(`asancommart-shop-starter`)에서 PowerShell을 엽니다.

```powershell
cd "$HOME\Downloads\asancommart-shop-starter"
npm install
npm run dev
```

`http://localhost:3000` 열기. 폴더가 다른 위치면 `cd` 경로를 바꾸세요.

- `/` : 메인
- `/products` : 전체 상품, 검색
- `/builder` : 조립PC 견적
- `/login` : 관리자 로그인
- `/admin` : 관리자 페이지 (DB 연동 후 사용 가능)

## 3. Supabase 데이터베이스 연결
1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. SQL Editor를 열고 **`supabase/schema.sql` 전체 내용을 실행**합니다. 타 서비스 DB에 재실행하지 마세요.
3. Supabase 프로젝트의 Connect 또는 API Keys 메뉴에서 Project URL과 **Publishable key**를 확인합니다.
4. 프로젝트 최상단에 `.env.local` 파일을 만들고 아래처럼 설정합니다. `SERVICE_ROLE` 또는 비밀 키를 절대 브라우저/저장소에 넣지 마세요.

```
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트-ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_발급받은키
```

5. 개발서버를 `Ctrl+C`로 멈춘 뒤 `npm run dev` 재실행합니다.
6. 이제 SQL에 들어 있는 가상 상품이 DB에서 조회됩니다.

## 4. 관리자 계정 및 권한 생성
1. Supabase 대시보드 → Authentication → Users에서 **Add user**로 관리자 이메일과 강력한 비밀번호를 만들어 인증합니다. (프로젝트 설정에 따라 이메일 확인/초대 단계 필요)
2. SQL Editor에서 **자신의 실제 관리자 이메일로 수정**하여 다음 SQL을 따로 실행합니다.

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;
```

3. `/login` 접속 → 관리자 이메일/비밀번호 입력 → `/admin`에서 상품 등록/수정.
4. 회원가입은 현재 사이트에 제공되지 않습니다. 실제로 운영할 때는 관리자 생성 정책과 계정 2단계 인증 정책을 별도로 설계하세요.

**보안 요점:** 관리자 페이지에 접근하기 전 서버가 실제 사용자 + `admins` 테이블 권한을 검사합니다. DB는 RLS를 적용해 일반 고객이 가격/재고를 바꿀 수 없습니다. `admins` 추가는 관리자 SQL Editor에서만 수행합니다.

## 4-1. 상품사진 설정
1. Supabase SQL Editor에서 **`supabase/product_images.sql` 전체를 실행**합니다. (기존 상품·관리자 데이터는 변경되지 않음)
2. Storage 메뉴에 `product-images` 버킷이 **비공개(Private)**로 생긴 것을 확인합니다. Public으로 바꾸지 마세요.
3. 관리자 로그인 → 상품 `수정` → 아래 **상품 사진** 영역에서 업로드·교체·삭제·공개 설정. 새 상품 등록 화면에서도 대표 사진 1장을 함께 올릴 수 있습니다.
- 허용: JPG·PNG·WEBP, 파일당 5MB, 상품당 10장. 확장자·형식·실제 파일 내용이 모두 맞아야 합니다.
- 고객에게는 `공개` 사진이면서 `판매 공개` 상품의 사진만 보입니다. 첫 번째 사진이 대표 사진입니다.
- 사진 주소는 1시간 동안만 유효한 서명 URL입니다.
- 사진이 남아 있는 상품은 Supabase 대시보드에서 바로 삭제되지 않습니다. 먼저 사진을 삭제하세요.

## 4-2. 상품 CSV 일괄등록
1. 관리자 → `CSV 일괄등록` → `CSV 양식 내려받기`
2. 엑셀에서 작성 후 `CSV UTF-8(쉼표로 분리)` 또는 `CSV(쉼표로 분리)`로 저장 (xlsx 파일은 불가)
3. 파일 선택 → 반영 방식 선택 → `미리보기` (이 단계에서는 저장되지 않음)
4. 신규·수정·오류 내용을 확인한 뒤 `반영` → 확인
- 상품코드 = 상품 URL 이름(영문 소문자·숫자·하이픈). 파일 안 중복 코드는 오류입니다.
- `신규 상품만 등록`: 이미 있는 상품코드는 오류 / `신규 등록 + 기존 상품 수정`: 같은 코드의 상품을 수정
- 빈 칸은 기존 값 유지(신규 상품은 기본값). CSV로 새로 만든 상품은 판매공개 열이 비어 있으면 **비공개**로 등록됩니다.
- 오류가 한 행이라도 있으면 반영할 수 없고, 반영은 전부 성공 또는 전부 실패입니다. 미리보기 이후 DB가 바뀌면 다시 미리보기를 요구합니다.
- 최대 1MB, 1,000개 상품. 사진은 CSV로 올리지 않고 상품 수정 화면에서 올립니다.

## 4-3. 조립PC 호환성 규격
- Supabase SQL Editor에서 `supabase/builder_specs.sql`을 실행하면 `CPU쿨러` 카테고리를 등록할 수 있습니다. (기존 상품·RLS 변경 없음)
- 상품 수정 화면의 규격 묶음(CPU, 메인보드, 그래픽카드, 파워, 케이스, CPU쿨러)에 제조사 사양표 값을 입력합니다. 정의: `src/lib/specs.ts`
- 검사 항목: CPU 소켓, DDR 규격, BIOS 지원(현재/업데이트 후), 그래픽카드 길이·두께, 케이스 메인보드·파워 규격, 파워 용량(추정+30% 여유), 파워 커넥터(EPS/PCIe/16핀), CPU 쿨러(소켓·냉각성능·높이/라디에이터)
- **규격이 비어 있으면 호환으로 판단하지 않고 `확인 필요`로 표시**합니다. 모든 항목이 `호환`일 때만 "입력된 규격 기준 호환"이 표시됩니다.
- 커넥터 입력 형식: `EPS8x1, EPS4x1`, `PCIE8x2`, `16PINx1`, 필요 없으면 `NONE`. "8핀"처럼 종류가 모호한 표기는 받지 않습니다.

## 4-4. 장바구니 (결제 없음)
- 상세페이지에서 수량을 골라 담고, 상단 `🛒 장바구니` → `/cart`에서 수량 변경·삭제
- 브라우저(localStorage)에는 **상품 id와 수량만** 저장. 가격·재고·상품명은 매번 서버가 DB에서 다시 읽어 계산 (`src/lib/cart-server.ts`의 `priceCart`)
- 재고보다 많이 담으면 재고 수량으로 줄이고 안내 문구 표시. 1회 최대 99개, 최대 30종류
- 품절·판매중지 상품은 장바구니에 남겨 표시하되 합계에서 제외, 한 번에 삭제 버튼 제공
- 담아도 재고가 예약되지 않습니다. `주문하기`는 결제·주문 기능 구현 전까지 비활성화

## 4-5. 품절 표시·상품 배지
- **먼저** Supabase SQL Editor에서 `supabase/product_badges.sql` 실행 (products에 `sold_out`, `badges` 열 추가. 실행 전에는 관리자 상품 저장이 실패합니다)
- 관리자 목록의 `품절 처리 / 품절 해제` 또는 상품 수정 화면의 `품절 표시` → 재고 수량과 관계없이 고객 화면에 품절 표시, 장바구니 담기·견적 선택 불가
- 재고 0인 상품도 자동으로 품절 표시
- 배지: 인기, 임박, NEW, 특가, 한정수량(남은 수량 함께 표시), 중고. (중고 배지는 product_badges.sql 을 다시 실행해야 저장됩니다) 상품 수정 화면 체크박스 또는 CSV `배지` 열(쉼표 구분, 지우려면 `없음`)

## 4-6. 정상가·할인율 표시
- **먼저** Supabase SQL Editor에서 `supabase/product_list_price.sql` 실행 (products에 `list_price` 열 추가. 실행 전에는 관리자 상품 저장이 실패합니다)
- 상품 수정 화면 `정상가` 또는 CSV `정상가` 열(지우려면 `없음`)에 할인 전 가격 입력 → 목록·상세에 정상가(취소선)와 할인율(소수점 버림) 표시
- 정상가는 판매가보다 커야 합니다. 판매가를 올려 정상가 이하가 되면 저장 시 오류로 알려줍니다
- 실제로 그 가격에 판매한 적이 있을 때만 입력하세요 (근거 없는 할인 표시는 표시·광고법 위반 소지)

## 4-7. VAT 별도 가격·배송/설치비
- 모든 상품 가격·조립비·배송/설치비는 **VAT 별도(공급가)**로 표시. 결제 예정 금액 = (상품 + 배송/설치비) + 부가세 10%(원 미만 버림). 규칙: `src/lib/pricing.ts`
- 상세페이지·장바구니에는 부가세 포함 금액도 함께 표시 (최종 소비자 대상 가격표시 기준은 세무사 확인 권장)
- **먼저** Supabase SQL Editor에서 `supabase/shipping_options.sql` 실행 → 기본 배송·설치 방법 4가지(택배 5,000원, 출장설치 아산 무료, 천안 50,000원, 매장 방문 수령) 생성
- 관리자 → `배송·설치비 관리`에서 방법 추가·수정·숨김·삭제. 장바구니에서 고객이 선택하면 서버가 DB 금액으로 다시 계산
- 온라인 결제(PG)는 아직 연결되지 않아 `결제하기` 버튼은 비활성화 상태입니다

## 4-8. 배송 기간·리뷰·교환/반품/취소
- `supabase/shipping_lead_time.sql` 실행 → 배송·설치 방법에 소요 기간(택배 평균 2~3일, 출장설치 1~2일) 추가. 관리자 `배송·설치비 관리`에서 수정
- `supabase/product_reviews.sql` 실행 → 상품 상세페이지 리뷰 작성(닉네임·별점·내용). **관리자 `리뷰 관리`에서 승인해야 게시**. 관리자는 승인·숨김·삭제·구매확인·답글만 가능(본문 수정 불가)
- 교환·반품·취소: 상세페이지 요약 + `/policy/returns` 전체 안내 + 하단 링크. 문구는 `src/lib/policy.ts`에서 수정하며 `[확인 필요]` 부분을 매장 기준으로 고친 뒤 운영하세요

## 4-9. 조립PC 견적 상담·견적게시판
- Supabase SQL Editor에서 `supabase/estimates.sql` 실행 (새 테이블 3개 + 접수 함수. 기존 데이터 변경 없음)
- 관리자 → **견적 부품 관리**: 분류(CPU, 메인보드, 메모리, 그래픽카드, SSD, 파워, 케이스, CPU쿨러, O/S, 조립선택)별 제품명만 등록. 한 줄에 하나씩 여러 개를 붙여넣어 한 번에 추가. 판매 상품과 별개
- 고객 `/estimate`: 부품 선택 + 이름·전화번호·상담 가능 시간·요청사항 + 개인정보 동의 → 접수
- 고객 `/estimate/board`: 견적게시판. 이름 첫 글자(홍**)·선택 부품·상태만 공개. 전화번호·요청사항은 관리자만 조회(DB RLS)
- 관리자 → **견적 문의**: 연락처 확인, 상태(접수·상담중·상담완료·숨김), 관리자 메모, 삭제
- 보안: 고객은 테이블에 직접 쓸 수 없고 DB 함수 `submit_estimate_request`로만 접수. 관리자가 등록한 제품명만 저장 가능

## 4-10. A/S 신청
- Supabase SQL Editor에서 `supabase/as_requests.sql` 실행 (새 테이블 1개 + 접수 함수. 기존 데이터 변경 없음)
- 고객 `/as`: 접수 절차·보증 기준·유상 수리·비용·유의사항 안내 + 신청서(이름·전화번호·상담 시간·제품·증상·접수 방법)
- 관리자 → **A/S 접수**: 연락처 확인, 상태(접수·점검중·수리중·수리완료·출고완료·취소), 메모, 삭제. 신청 내용은 관리자만 조회(공개 게시판 없음)
- 안내 문구는 `src/lib/as-rules.ts`에서 수정. `[확인 필요]`(보증 기간·비용 등)를 매장 기준으로 바꾸세요

## 4-10-1. 홈페이지 제작·앱 개발·창업 문의
- Supabase SQL Editor에서 `supabase/business_inquiries.sql` 실행 (새 테이블 1개 + 접수 함수. 기존 데이터 변경 없음)
- 모든 화면 맨 아래 "비즈니스 문의" 버튼 3개 → `/inquiry/web`, `/inquiry/app`, `/inquiry/startup`
- 신청서: 이름·회사(선택)·전화번호·이메일(선택)·상담 시간·구분·예산·희망 일정·자세한 내용, 개인정보 동의
- 관리자 → **홈페이지·앱·창업 문의**: 종류·상태(접수·상담중·상담완료·취소)별 보기, 메모, 삭제. 관리자만 조회
- 선택지·안내 문구는 `src/lib/inquiry-rules.ts`에서 수정 (바꾸면 SQL 제약도 같이 바꿔야 함)

## 4-10-2. 속도·검색 최적화
- 메인·상품 상세는 60초 캐시(ISR). 관리자 상품 저장·사진·리뷰·주문·배송 변경 시 즉시 갱신
- 상품사진은 Next.js 이미지 최적화로 화면 크기에 맞춰 줄이고 AVIF·WebP 로 변환. 서명 URL 은 3시간짜리를 재사용해 브라우저 캐시가 동작
- 검색엔진: `/sitemap.xml`, `/robots.txt`(관리자·주문·회원 화면 제외), 상품별 제목·설명·공유 미리보기
- 배포 후 `.env.local` 에 `NEXT_PUBLIC_SITE_URL=https://실제주소` 추가 (사이트맵·공유 미리보기 주소)

## 4-11. 상품 휴지통
- Supabase SQL Editor에서 `supabase/product_trash.sql` 실행 (products 에 열 2개 추가. 기존 데이터·RLS 변경 없음)
- 관리자 목록의 "삭제"·"선택 삭제"는 휴지통으로 이동: 판매중지되어 고객 화면에서 바로 사라짐
- 관리자 → 🗑 휴지통: 개별·선택 복구(삭제 전 공개 상태로), 개별·선택 영구 삭제, 휴지통 비우기. 영구 삭제는 사진·리뷰까지 삭제되며 되돌릴 수 없음

## 4-12. 회원가입·주문 (무통장입금)
- Supabase SQL Editor에서 `supabase/members_orders.sql` 실행 (product_badges.sql·shipping_options.sql 이후. 새 테이블 3개 + 주문 함수. 기존 데이터·RLS 변경 없음)
- Supabase 대시보드 → Authentication → URL Configuration 에 사이트 주소와 `/auth/callback` 추가 (가입 인증 메일 링크용)
- 회원가입 `/signup` (아이디=이메일), 로그인 `/login`, 마이페이지 `/mypage`, 비회원 주문조회 `/order/lookup`
- 상품 상세 "구매하기"·"비회원 구매", 장바구니 "주문하기"·"비회원 주문하기" → `/checkout`
- 주문서: 주문자·배송 정보, 배송 방법(배송·설치비 관리의 방법. 이름에 "수령"이 있으면 주소 입력 없음), 무통장입금(국민은행 458-21-0791-727 김기정), 현금영수증, 필수 동의
- 보안: 가격·배송비·부가세는 DB 함수가 다시 계산, 화면 금액과 다르면 주문 안 됨. 재고는 주문 시 원자적으로 차감, 관리자 취소 시 복구
- 관리자 → 주문 관리: 입금확인·배송준비·배송중·배송완료, 주문 취소(재고 복구), 메모. 주문 기록은 5년 보관 대상이라 삭제 기능 없음
- 계좌 정보는 `src/lib/order-rules.ts`의 BANK 에서 수정
- 추가 기능: Supabase SQL Editor에서 `supabase/account_order_extras.sql` 실행 (members_orders.sql 이후)
  - 비밀번호 찾기 `/forgot-password` → 메일 링크 → `/account/password` (마이페이지에서 비밀번호 변경도 같은 화면)
  - 회원 탈퇴: 마이페이지 → 현재 비밀번호 확인 후 탈퇴. 회원 정보 삭제, 주문 기록은 보관(회원 연결만 끊김). 관리자 계정은 탈퇴 불가
  - 우편번호 찾기: 카카오(다음) 우편번호 서비스 (무료, 키 불필요)
  - 입금 기한(3일) 지난 주문 자동 취소: pg_cron 으로 매시 정각 실행, 재고 복구. 관리자 주문 관리에서 즉시 실행 버튼도 있음

## 5. 컴퓨터 상품 등록과 견적
- 관리자 → `새 상품 등록`
- 예: 카테고리 CPU / 소켓 AM5 / 메모리규격 DDR5 / 전력 65
- 예: 메인보드 B650 / 소켓 AM5 / DDR5
- 예: GPU / 소비전력 180W / 카드길이 245mm
- 예: 케이스 / 허용 GPU길이 320mm
- 예: 파워 / 전력 750W
- `/builder`에서 자동 합계와 일부 기본 규격 검사를 확인합니다.
- 가상 가격/사양은 절대 실제 판매가격으로 믿지 마세요. 제조사 데이터·재고 등 검증 필수.

## 6. Claude Code로 변경하기
프로젝트 폴더에서 `claude`를 입력하여 실행하고 아래 명령을 붙여넣으세요.

> 아산컴마트 Next.js 쇼핑몰의 디자인을 좀 더 컴퓨터 전문몰답게 수정해줘. 기존 Supabase 인증·RLS 보호·관리자 페이지·견적 호환성 로직은 유지해줘. 먼저 수정 계획을 보여주고, 소규모로 변경한 다음 `npm run typecheck`와 `npm run build`를 검증해줘. 실결제 기능은 별도로 지시하기 전까지 추가하지 마.

다음 명령으로 타입검사를 실행합니다.

```powershell
npm run typecheck
npm run build
```

## 7. Vercel 배포 (결제 전 시험 배포만)
1. GitHub에 **비공개 저장소**를 만들어 코드를 올립니다. `.env.local`은 `.gitignore`로 제외되어야 합니다.
2. https://vercel.com → Add New Project → GitHub 연결 → 저장소 선택.
3. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 추가합니다.
4. Deploy → 서비스 주소 접속해 상품조회/관리자 로그인을 확인합니다.
5. Supabase Auth의 URL Configuration에서 배포 도메인과 허용 리디렉션 설정을 검토합니다.
6. 테스트 배포를 완성한 뒤 도메인을 구입해 Vercel과 연결합니다.

## 실제 운영 전 필수 점검
- HTTPS, 관리자 2단계 인증, 로그인 제한, 백업/복구, 감사 로그
- 상품사진 업로드 시 파일 검사와 저장소 접근통제
- 보안 헤더, 데이터 검증, 권한 변경 권한, 에러 로깅
- 주문서의 서버 가격 재계산, 재고 경쟁상태 방지, 결제 승인 서명 검증 및 멱등성, 취소/부분취소
- 개인정보처리방침/수집 최소화/보유기간, 통신판매업 등 전자상거래 요건
  - 회사소개(`/about`), 이용약관(`/policy/terms`), 개인정보처리방침(`/policy/privacy`), 교환·반품(`/policy/returns`) 초안과 하단 사업자정보가 있습니다.
  - 사업자 정보는 `src/lib/company.ts`, 약관·처리방침 문구는 `src/lib/legal.ts`에서 수정합니다. `[확인 필요]` 표시를 모두 실제 정보로 바꾸고 법률 전문가 검토를 받으세요.
  - 주문·결제·회원가입을 추가하면 약관과 개인정보처리방침(수집 항목·위탁·보유기간)도 함께 고쳐야 합니다.
- 유료 플랜 가격 및 API 키의 부적절한 공개 방지

## 폴더 구조
```
src/
  app/
    page.tsx                메인
    products/page.tsx       상품 목록·검색
    products/[slug]/page.tsx 상품 상세
    builder/page.tsx        부품 견적
    login/page.tsx          관리자 로그인
    admin/page.tsx          관리자 상품관리
    admin/actions.ts        보안 검증 후 상품 저장·수정
    admin/products/new/     상품 등록
    admin/products/[id]/    상품 수정
    admin/products/import/  상품 CSV 일괄등록 (import-actions.ts: 미리보기·반영)
  components/               공통 UI, 견적 컴포넌트
  lib/                      상품 타입, 가상상품, Supabase 연결, 관리자 권한
  proxy.ts                  로그인 쿠키 갱신
supabase/schema.sql         DB 테이블, RLS 정책, 가상 데이터
supabase/product_images.sql 상품사진 테이블, Storage 버킷, 사진 RLS 정책
```
