# cida.jakeson.net — Hostinger + GitHub 배포 (Vercel 없음)

QR Link(`qr.stylestationery.com`)와 같은 방식입니다.

| 구분 | 이 프로젝트 |
|------|-------------|
| 앱 호스팅 | **Hostinger Cloud** — Deploy Web App / Node.js |
| 소스 | **GitHub** → Hostinger 자동 빌드 |
| DB | **Neon PostgreSQL** (권장). Hostinger MySQL은 사용하지 않음 |
| 도메인 | **cida.jakeson.net** (`jakeson.net` 서브도메인) |

> CIDA는 Prisma **`postgresql`** 전용입니다. QR Link처럼 Hostinger MySQL에 넣으려면 스키마 전면 이전이 필요하므로, DB는 Neon을 유지하고 **앱만 Hostinger**에 올리는 구성을 권장합니다.

---

## 전체 흐름

```text
1) GitHub에 push (이미 origin: icarus8275/CIDA 라면 push만)
2) Hostinger → Add website → Deploy Web App / Node.js
3) GitHub 연결 후 빌드 설정
4) 환경변수: DATABASE_URL(Neon) + AUTH_SECRET + AUTH_URL
5) Deploy
6) 도메인 cida.jakeson.net 연결 + DNS
7) (필요 시) 시드 / course codes 시드
8) 로그인 테스트
```

---

## 1단계 — GitHub

저장소가 이미 있으면:

```powershell
cd "D:\5. App Dev\CIDA"
git add -A
git commit -m "Hostinger deploy for cida.jakeson.net"
git push origin main
```

중요: **`.env` / Neon URL 텍스트 파일은 올리지 마세요.**

---

## 2단계 — Hostinger에 Web App 만들기

1. hPanel → **Websites**
2. **+ Add website**
3. **Deploy Web App** (또는 **Node.js** / **Node.js Apps**)
4. **Import Git repository** → GitHub 권한 → `CIDA` 저장소, 브랜치 `main`

### 빌드 설정

| 항목 | 값 |
|------|-----|
| Framework | Next.js |
| Node.js | **20** 이상 (engines: `>=20.9.0`) |
| Install | `npm ci` 또는 `npm install` |
| Build | `npm run build` |
| Start | `npm run start` (필요 시 `npm run start -- -p $PORT`) |
| Root directory | `.` |

`package.json`의 `start`는 `next start -H 0.0.0.0` 입니다.  
Hostinger가 넣는 `PORT` 환경 변수를 Next가 사용합니다. 안 되면 Start를  
`npm run start -- -p $PORT` 로 바꾸세요.

---

## 3단계 — 환경 변수 (배포 전)

Hostinger 앱 → **Environment Variables**:

```env
DATABASE_URL=postgresql://...neon.tech/.../neondb?sslmode=require
AUTH_SECRET=여기에_긴_랜덤문자열
AUTH_URL=https://cida.jakeson.net
```

선택:

```env
BOOTSTRAP_ADMIN_EMAILS=your@email.edu
NEXT_PUBLIC_I18N_ENGLISH_ONLY=true
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=professor@jakeson.net
SMTP_PASS=메일함비밀번호
SMTP_FROM=professor@jakeson.net
```

| Name | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | **필수** | Neon 연결 문자열 (`sslmode=require` 포함) |
| `AUTH_SECRET` | **필수** | `openssl rand -base64 32` |
| `AUTH_URL` | **필수** | `https://cida.jakeson.net` (끝 `/` 없음) |
| `SMTP_PASS` | 메일 기능용 **필수** | `professor@jakeson.net` 메일함 비밀번호 (Git에 올리지 말 것) |
| `SMTP_USER` / `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | 선택 | 기본값은 Hostinger SMTP + professor@jakeson.net |

### 이메일 비밀번호를 안전하게 전달하는 방법

채팅·Git·커밋에 **비밀번호를 쓰지 마세요.** 아래 중 하나를 쓰세요.

1. **권장:** Hostinger 앱 → **Environment Variables**에 `SMTP_PASS=...` 직접 입력 후 재배포  
2. 로컬 개발: `.env`에만 `SMTP_PASS=...` (이미 `.gitignore`에 `.env*` 있음)  
3. Admin → **Email test** 페이지에서 테스트 발송으로 확인  

IMAP(`imap.hostinger.com:993`)은 이 앱에서 쓰지 않습니다. **발신만 SMTP**를 사용합니다.

**금지:** `AUTH_URL`에 `http://0.0.0.0:3000` 같은 바인드 주소를 넣지 마세요.

`AUTH_SECRET` 생성 (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### Neon `DATABASE_URL`

1. [Neon](https://neon.tech) 프로젝트 → Connection string 복사  
2. Hostinger 환경 변수에 그대로 넣기  
3. 빌드 시 `prisma migrate deploy`가 Neon에 마이그레이션을 적용합니다 (앱이 Neon으로 아웃바운드 가능해야 함 — 일반 Cloud에서 가능)

로컬 `.env`의 Neon URL을 그대로 써도 됩니다. **Git에는 넣지 마세요.**

---

## 4단계 — Deploy

1. **Deploy**  
2. 빌드 로그에서 `prisma migrate deploy` / `next build` 성공 확인  
3. Hostinger 임시 도메인(`*.hostingersite.com` 등)으로 일단 접속 확인

임시 도메인으로만 테스트할 때는 잠깐 `AUTH_URL`을 그 URL로 맞춘 뒤, 커스텀 도메인 연결 후 다시 `https://cida.jakeson.net`으로 바꾸고 **재배포**하세요.

---

## 5단계 — 도메인 `cida.jakeson.net`

1. Hostinger Web App → **Domains** → `cida.jakeson.net` 추가  
2. DNS (`jakeson.net`이 Hostinger에 있으면 보통 자동; 외부면):

| 타입 | 이름 | 값 |
|------|------|-----|
| **A** 또는 **CNAME** | `cida` | Hostinger가 안내하는 IP / 타깃 |

3. SSL(HTTPS) 발급 대기  
4. `AUTH_URL=https://cida.jakeson.net` 확인 후 재배포/재시작

---

## 6단계 — 시드 (선택)

마이그레이션은 빌드에 포함됩니다. **관리자·샘플 데이터·과목 표준 코드**는 별도입니다.

로컬에서 Neon(프로덕션) URL로:

```powershell
cd "D:\5. App Dev\CIDA"
# .env 의 DATABASE_URL 이 프로덕션 Neon인지 확인
npx prisma migrate deploy
npm run db:seed
npm run db:seed-course-codes
```

Hostinger SSH/터미널이 있으면 앱 디렉터리에서 동일 명령을 실행해도 됩니다.

이미 Vercel+Neon으로 쓰던 DB를 그대로 쓰면 **시드를 다시 돌릴 필요 없이** 앱만 Hostinger로 옮기면 됩니다.

---

## GitHub 푸시 후 자동되는 것 / 안 되는 것

| 무엇이 | 자동? |
|--------|--------|
| Next.js 코드 | ✅ push → Hostinger 재배포 |
| Prisma 마이그레이션 | ✅ `npm run build` 안의 `migrate deploy` (env에 `DATABASE_URL` 있을 때) |
| 관리자 시드 / course codes 시드 | ❌ `db:seed` / `db:seed-course-codes` 직접 실행 |
| Admin에서 입력한 데이터 | DB(Neon)에 있음 — 푸시와 무관 |

---

## 오픈 전 체크

- [ ] https://cida.jakeson.net 접속·자물쇠  
- [ ] `/auth/signin` 로그인  
- [ ] Admin / Teach / Explore  
- [ ] `AUTH_URL`이 `https://cida.jakeson.net`과 일치  
- [ ] (선택) 예전 `cida-three.vercel.app` 사용 중지 또는 새 URL로 리다이렉트

---

## 자주 막히는 곳

| 증상 | 확인 |
|------|------|
| 빌드 실패 (Prisma) | `DATABASE_URL` Neon 유효·Hostinger에서 Neon 접속 가능 여부 |
| 로그인/세션 이상 | `AUTH_SECRET`, `AUTH_URL=https://cida.jakeson.net` |
| 포트/502 | Start가 `0.0.0.0` + `$PORT` 인지 |
| GitHub repo 안 보임 | Hostinger GitHub App 권한에 `CIDA` 포함 |

---

## (참고) Vercel은?

더 이상 필수가 아닙니다. 이 문서는 **Hostinger + Neon + cida.jakeson.net** 경로입니다.  
기존 Vercel 프로젝트는 Hostinger 전환 후 삭제하거나 꺼 두면 됩니다.
