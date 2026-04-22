# Vercel + Neon + GitHub로 CIDA 배포하기

이 앱은 **Next.js 16(App Router) + Prisma 7 + PostgreSQL**입니다. **이메일·비밀번호 로그인(Credentials)** 만 사용하며, Microsoft Entra / OneDrive Graph 연동은 사용하지 않습니다. **Git → Vercel 자동 빌드**가 맞고, WordPress처럼 FTP로 `public`만 올리는 방식은 맞지 않습니다.

---

## 1. 준비물

| 항목 | 용도 |
|------|------|
| **GitHub** (또는 GitLab 등) | 소스 저장·Vercel 연동 |
| **Vercel** | Next.js 빌드·호스팅 |
| **Neon** (또는 Supabase/Railway 등) | PostgreSQL (`DATABASE_URL`) |

`.env`는 **저장소에 넣지 않고**, Vercel **Environment Variables**에만 넣습니다.

---

## 2. Neon에서 `DATABASE_URL` 만들기

1. [Neon](https://neon.tech)에서 프로젝트 생성 → **PostgreSQL**.
2. **Connection string** 전체를 복사합니다. (`?sslmode=require` 등 포함)
3. 이 값을 Vercel의 **`DATABASE_URL`** 그대로 넣습니다.

---

## 3. GitHub에 푸시

```bash
git add -A
git commit -m "설명 메시지"
git push origin main
```

최초라면 원격 저장소를 만든 뒤 `git remote add origin ...` 로 연결합니다.

---

## 4. Vercel 프로젝트 연결

1. [Vercel](https://vercel.com) → **Add New** → **Project** → GitHub 저장소 **Import**.
2. **Framework**: Next.js (자동).
3. **Build Command**: 저장소의 `package.json`에 맞게 **`npm run build`** (이미 `prisma migrate deploy && next build` 로 되어 있음).
4. 아래 **환경 변수**를 **Production**(필요하면 Preview에도) 추가한 뒤 **Deploy**.

---

## 5. Vercel 환경 변수 (필수·선택)

배포 후 브라우저에 열리는 주소가 예를 들어 `https://cida.vercel.app` 이라면, **`AUTH_URL`** 은 그 주소와 **완전히 같아야** 합니다(끝에 `/` 없음).

| Name | 필수 | 설명 / 예시 |
|------|------|-------------|
| `DATABASE_URL` | **필수** | Neon이 준 PostgreSQL 연결 문자열 전체 |
| `AUTH_SECRET` | **필수** | `openssl rand -base64 32` 등으로 만든 긴 임의 문자열(세션 암호화) |
| `AUTH_URL` | **필수** | 프로덕션 사이트 URL, 예: `https://본인프로젝트.vercel.app` (슬래시 없음) |
| `BOOTSTRAP_ADMIN_EMAILS` | 선택 | 쉼표로 구분한 이메일. **이미 DB에 있는 사용자**가 로그인하면 `ADMIN` 역할로 올림(초기 관리자용) |
| `NEXT_PUBLIC_SHOW_LOCALE_SWITCHER` | 선택 | **`false`** 이면 화면 우측 상단 **EN/한** 전환을 숨김. 안 넣으면 기본으로 스위처 표시 |
| `AUTH_DEBUG` | 선택 | `true` 로 두면 Auth.js 디버그(문제 조사용, 운영에서는 보통 끔) |

**더 이상 필요 없음(이전 Entra/OAuth 버전용):**  
`AUTH_MICROSOFT_ENTRA_ID_*`, `OAUTH_ENCRYPTION_KEY`, Microsoft **Redirect URI** 등.

---

## 6. 첫 배포 직후: DB 마이그레이션과 시드

- Vercel 빌드 시 **`npm run build`** 안에서 `prisma migrate deploy`가 실행되므로, **스키마는 배포와 함께 DB에 반영**됩니다.
- **예시 데이터 + 시드 관리자 계정**을 넣으려면, **로컬 PC**에서 Neon의 `DATABASE_URL`을 사용해 한 번 실행합니다(운영 DB에 쓰이므로 주의).

```bash
# 로컬 .env 에 DATABASE_URL 만 Neon 프로덕션 URL로 맞춘 뒤
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

시드는 `prisma/seed.ts`와 `.env`의 `AUTH_DEV_EMAIL` / `AUTH_DEV_PASSWORD`(또는 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)를 참고합니다. 시드에 없는 비밀번호로는 로그인할 수 없으므로, **Admin → Users**에서 추가 계정을 만들거나 시드 이메일로 로그인합니다.

**시드 없이** 가려면 Vercel 배포 후 **SQL/Prisma Studio**로 직접 `users` 행을 넣거나, 나중에 구현한 **관리자 API**만으로는 첫 관리자를 만들 수 없으므로, **최소 한 번은 시드 또는 `BOOTSTRAP_ADMIN_EMAILS` + 수동으로 DB에 비밀번호 해시 넣기** 중 하나가 필요합니다. 가장 단순한 방법은 위 **시드**입니다.

---

## 7. 로그인·역할 흐름

- **공개 가입 없음.** 로그인은 **관리자가 만든 이메일·비밀번호**만 사용합니다.
- **`/admin/users`**에서 계정 생성·역할(`ADMIN` / `PROFESSOR` / `CIDA`) 지정.
- **CIDA**: 읽기 전용으로 `/explore` (코스·코드 탐색).
- **교수**: 배정된 섹션에서 `/teach` → 항목·코드·OneDrive **공유 링크 URL** 편집.

---

## 8. 자주 나는 문제

| 증상 | 확인 |
|------|------|
| 빌드에서 `prisma migrate deploy` 실패 | `DATABASE_URL`이 맞는지, Neon이 외부 접속·SSL 허용인지 |
| 로그인 후 이상 동작 / 세션 없음 | `AUTH_SECRET` 설정 여부, `AUTH_URL`이 **실제 오픈한 URL**과 동일한지 |
| 시드한 관리자로 로그인 불가 | 시드에 사용한 이메일·비밀번호와 일치하는지, 시드를 **프로덕션 DB**에 대고 돌렸는지 |

---

## 9. 요약 체크리스트

1. Neon에서 `DATABASE_URL` 복사 → Vercel에 등록  
2. `AUTH_SECRET`, `AUTH_URL`(Vercel 도메인, 끝 `/` 없음) 등록  
3. GitHub에 push → Vercel 연결 → Deploy  
4. (선택) 로컬에서 Neon URL로 `prisma/seed.ts` 실행해 관리자·샘플 데이터  
5. 브라우저에서 배포 URL 열기 → `/auth/signin` 으로 로그인 테스트  

이후 **스케줄·과목·사용자**는 앱 안 **Admin** 메뉴에서 설정하면 됩니다.
