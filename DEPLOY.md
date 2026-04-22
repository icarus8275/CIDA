# Vercel + Neon(무료 티어)로 웹에 올리기

이 앱은 **Next.js 16 + Prisma 7 + PostgreSQL**이므로, **일반 워드프레스용 FTP 올리기** 방식이 아니라 **Git 저장소 + 호스팅(PaaS) 자동 배포** 방식이 맞습니다. 아래는 **가능한 한 무료에 가깝게** 테스트하기 위한 권장 절차입니다.

---

## 1. “어떤 파일을 서버에 올리나?” — 답: Git으로 전체, 비밀은 Vercel 대시보드

| 방식 | 설명 |
|------|------|
| **권장** | **GitHub(또는 GitLab)에 `CIDA` 프로젝트 전체를 push** → **Vercel**이 clone 후 빌드·배포. **파일을 골라서 FTP로 던지는 구조가 아닙니다.** |
| **또는** | **Vercel CLI**(`vercel`)로 로그인한 뒤, 프로젝트 폴더에서 `vercel` 실행(역시 “선택한 파일 몇 개”가 아니라, 업로드 정책에 따라 **프로젝트 루트** 기준). |
| **절대 올리면 안 되는 것** | **`.env`**, **`.env.local`**, **클라이언트 시크릿, DB 비밀번호** → 저장소에 넣지 말고, **Vercel Environment Variables**에만 입력합니다. |
| **저장소에 올릴 수 있는 것** | `prisma/`, `src/`, `public/`, `package.json`, `next.config.*`, `tsconfig.json` 등 **소스 전체** + 이미 `prisma/migrations` 안의 **마이그레이션 SQL** (비밀 없음). |

`package.json`의 `build`는 **`prisma migrate deploy`로 DB에 스키마를 적용한 뒤 `next build`**를 실행합니다. Vercel 배포마다(마이그레이션이 있을 때) DB와 맞춰집니다.

---

## 2. 사전 준비 (무료/저가)

1. **Git** 설치, **GitHub** 계정(또는 GitLab/Bitbucket).
2. **Vercel** 계정: [vercel.com](https://vercel.com) (GitHub 연동).
3. **Neon** 계정(권장, PostgreSQL 무료 티어): [neon.tech](https://neon.tech)  
   - Supabase, Railway, Render 등 **PostgreSQL + 외부 접속**만 되면 됩니다.
4. **Entra ID(구 Azure AD) 앱 등록** (이미 로컬에서 쓰는 것과 동일).  
   - 배포 후 **Redirect URI**에 **웹 URL**이 추가로 필요합니다(아래 5절).

---

## 3. Neon에서 DB URL 만들기

1. Neon에서 **프로젝트 생성** → **PostgreSQL** 선택.
2. **Connection string**을 복사합니다. (형식: `postgresql://...@.../...?sslmode=require` 등)  
3. Vercel에 넣을 때 **반드시 `DATABASE_URL` 하나**로 씁니다. (Neon은 SSL이 필요한 경우가 많음 — 복사한 그대로 쓰면 됩니다.)

**로컬 Docker Postgres는 배포에 쓰지 않습니다.** 운용 DB는 Neon(또는 다른 호스팅 PostgreSQL)을 사용합니다.

---

## 4. GitHub에 코드 올리기 (첫 1회)

로컬에서 프로젝트 루트(예: `CIDA` 폴더)에서:

```bash
git init
git add .
git commit -m "Initial commit: CIDA"
```

GitHub에 **새 저장소**를 만든 뒤:

```bash
git remote add origin https://github.com/본인아이디/본인저장소.git
git branch -M main
git push -u origin main
```

이때 **`.env`는 커밋되지 않아야** 합니다(`.gitignore`에 `/.env` 포함). 비밀 값은 Vercel에서만 넣습니다.

---

## 5. Vercel에서 프로젝트 연결·환경 변수

1. [Vercel](https://vercel.com) → **Add New** → **Project** → **Import** 방금 push한 **GitHub 저장소**.
2. **Framework Preset**은 `Next.js`로 자동 인식됩니다.  
3. **Build & Output**은 기본 그대로 두고, `Build Command`가 **`npm run build`**(즉, 저장소 `package.json`의 `build`)를 쓰면 됩니다. (이미 `prisma migrate deploy && next build`로 설정돼 있음)
4. **Environment Variables**에 아래를 **Production**(및 Preview 원하면)에 추가합니다. (`Settings` → `Environment Variables`)

| Name | 설명 / 예시 |
|------|-------------|
| `DATABASE_URL` | Neon이 준 **전체** 연결 문자열 (비밀) |
| `AUTH_SECRET` | `openssl rand -base64 32` 로 생성한 **임의 긴 문자열** |
| `AUTH_URL` | 배포 URL, 예: `https://xxx.vercel.app` (**슬래시 없이** 도메인 끝까지) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Entra 앱 **Application (client) ID** |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Entra **Client secret** |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/테넌트ID/v2.0/` (로컬과 동일한 **단일 테넌트** Issuer) |
| `BOOTSTRAP_ADMIN_EMAILS` | (선택) 쉼표로 구분, 첫 로그인 시 `ADMIN`으로 올릴 Microsoft 계정 **이메일** |
| `OAUTH_ENCRYPTION_KEY` | (선택) [`.env.example`](.env.example) 주석 참고 — 보조 토큰 암호화에 사용 |
| `NEXT_PUBLIC_SHOW_LOCALE_SWITCHER` | (선택) **`false`** 로 두면 **언어(EN/한) 전환 UI**를 숨깁니다. 로컬·스테이징에서는 생략 또는 `true`, **프로덕션**에서 끄려면 `false`로 설정합니다. |

**배포 전에** Entra **앱 등록** → **Authentication** → **Redirect URI**에 다음을 추가합니다(본인 Vercel 주소로 바꿈).

```text
https://본인-프로젝트名.vercel.app/api/auth/callback/microsoft-entra-id
```

(Microsoft 쪽에서 **Web** 리디렉트로 등록)

**API 권한(위임):** `User.Read`, `Files.Read`, `Files.ReadWrite`, `offline_access` 등 (이미 로컬에서 사용 중이면 동일하게 유지)

5. **Deploy** 실행.

---

## 6. 첫 배포 직후: 시드(예시 데이터) (선택)

`db:seed`는 **DB에 쓰는 스크립트**라, 보통 **로컬 PC에서** `DATABASE_URL`을 **Neon URL로 바꿔** 한 번 실행합니다(주의: **운영 DB**에 넣는 것이므로 팀 합의 후).

```bash
# .env에서 DATABASE_URL만 Neon(운영)으로 맞춘 뒤
npx tsx prisma/seed.ts
```

또는 로컬에만 Neon `DATABASE_URL`을 일시 export하고:

`Linux/macOS` 예: `export DATABASE_URL="postgresql://..."`  
`Windows PowerShell` 예: `$env:DATABASE_URL="postgresql://..."`

(시드는 **반복 실행 시** 중복/충돌이 생길 수 있으니, **첫 1회** 또는 스키마만 맞출 때 권장)

---

## 7. “FTP로 public 폴더만 올리면?” — 안 됨

- Next.js **App Router** + **Route Handler(API)** + **Prisma**는 **Node 런타임에서 빌드된 산출물**이 전체로 필요하고, `public`만으로는 **서버·API·DB 연동**이 동작하지 않습니다.
- 그래서 **Vercel(또는 Node 지원 PaaS)** + **Supabase/Neon 같은 PostgreSQL** 조합이 일반적입니다.

---

## 8. 비용·한도(요약)

- **Vercel Hobby**: 개인/소규모 테스트에 자주 쓰임(빌드·대역·함수 한도는 문서를 확인).  
- **Neon** 무료 티어: DB 용량/컴퓨트 한도 있음.  
- 학교/팀 **프로덕션**이면 사내 정책에 맞는 **Azure**, **App Service** 등이 나을 수 있음(유료).

---

## 9. Microsoft(학교) 계정으로 로그인이 안 될 때

1. **`.env`에 실제 값**이 있는지: `AUTH_MICROSOFT_ENTRA_ID_ID`, `SECRET`, `ISSUER` — 플레이스홀더(예: 0000…)로 두면 실패합니다.  
2. **`AUTH_URL`**: 로컬은 `http://localhost:3000` (끝에 `/` 없음), 배포는 `https://배포도메인` 과 **브라우저 주소**가 같아야 합니다.  
3. **Entra 앱 등록** → **Authentication** → **Redirect URI** (플랫폼 **Web**):  
   `{AUTH_URL}/api/auth/callback/microsoft-entra-id`  
4. **단일 테넌트(학교)**: `AUTH_MICROSOFT_ENTRA_ID_ISSUER` = `https://login.microsoftonline.com/디렉터리(테넌트)ID/v2.0/`  
5. **API 권한(위임)**: `User.Read` 등이 등록돼 있고, 필요 시 **관리자 동의**를 받았는지 확인.  
6. **`AUTH_SECRET`**: 비어 있으면 세션이 안 될 수 있음. `openssl rand -base64 32` 로 생성.  
7. 실패 시 `/auth/error?error=...` 에 표시된 코드를 보고, 터미널에 **`AUTH_DEBUG="true"`** 를 넣고 다시 시도(개발용).

**개발용 이메일/비밀번호**(`AUTH_DEV_*`)는 **필수가 아닙니다.** 프로덕션·Vercel에는 넣지 않는 것이 좋고, 꼭 로컬에서만 쓰려면 `ALLOW_DEV_PASSWORD_LOGIN=true` 를 **함께** 설정하세요(본 저장소 `auth.ts` 참고).

---

## 10. 자주 쓰는 점검

| 증상 | 할 일 |
|------|--------|
| 빌드에서 `prisma migrate deploy` 실패 | Vercel에 `DATABASE_URL`이 **정확한지**, Neon이 **접속 허용(방화벽/SSL)** 인지 확인 |
| 로그인 리디렉트 루프/오류 | `AUTH_URL`이 **Vercel 도메인과 정확히 일치**하는지, Entra **Redirect URI**가 **위 콜백 URL**과 동일한지 |
| OneDrive/Graph 403 | 사용자가 **Microsoft(Entra)로 로그인**했는지, 앱 **API 권한**과 **관리자 동의**가 되었는지 |

---

## 11. 요약

1. **코드: Git → GitHub** (비밀 제외)  
2. **DB: Neon** 등에서 `DATABASE_URL`  
3. **배포: Vercel**이 저장소를 받아 `npm install` → `postinstall`(`prisma generate`) → `npm run build`(`migrate deploy` + `next build`)  
4. **비밀: Vercel Environment Variables**  
5. **Entra: Redirect URI**에 Vercel 주소 + `/api/auth/callback/microsoft-entra-id` 추가  

이 흐름이면 **무료에 가깝게** 웹 URL에서 앱·로그인·(Microsoft 계정으로) OneDrive 연동을 테스트할 수 있습니다.
