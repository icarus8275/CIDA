import type { Locale } from "./types";

/** Flat message map: key -> { en, ko } */
export const MESSAGES: Record<string, Record<Locale, string>> = {
  // home
  "home.subtitle": {
    en: "Courses, codes, and OneDrive links. Open Explore for the read-only tree.",
    ko: "과목, 코드, OneDrive 링크를 한곳에 둡니다. 탐색에서 읽기 전용 트리를 엽니다.",
  },
  "home.explore": { en: "Explore (tree)", ko: "탐색 (트리)" },
  "home.signIn": { en: "Sign in", ko: "로그인" },
  "home.admin": { en: "Admin", ko: "관리" },
  "home.faculty": { en: "Faculty", ko: "교수" },
  // explore
  "explore.loading": { en: "Loading…", ko: "불러오는 중…" },
  "explore.title": { en: "Course–Code", ko: "Course–Code" },
  "explore.searchPlaceholder": {
    en: "Search course, item, or code…",
    ko: "과목, 항목, 코드 검색…",
  },
  "explore.tabTree": { en: "Tree", ko: "트리" },
  "explore.tabCodes": { en: "Codes", ko: "코드" },
  "explore.collapse": { en: "Collapse", ko: "접기" },
  "explore.expand": { en: "Expand", ko: "펼치기" },
  "explore.noResults": {
    en: "No results for this search.",
    ko: "검색 결과가 없습니다.",
  },
  "explore.codeIndex": { en: "Code index", ko: "코드 색인" },
  "explore.noCodes": {
    en: "No codes in data yet.",
    ko: "아직 등록된 코드가 없습니다.",
  },
  "explore.panelTitle": { en: "Details / reverse lookup", ko: "상세 / 역검색" },
  "explore.clear": { en: "Clear", ko: "지우기" },
  "explore.emptySelect": {
    en: "Click an assignment, project, or exam, or a code, to see details and reverse lookup.",
    ko: "과제·시험 등 항목이나 코드를 클릭하면 상세와 역검색을 볼 수 있습니다.",
  },
  "explore.selectedItem": { en: "Selected item", ko: "선택한 항목" },
  "explore.selectedCode": { en: "Selected code", ko: "선택한 코드" },
  "explore.codeUsedIn": { en: "This code is used in:", ko: "이 코드는 다음에 사용됩니다." },
  "explore.noMatch": { en: "No matches.", ko: "일치 항목이 없습니다." },
  "explore.footer": {
    en: "Click an item to focus its codes; click a code to see where it is used. Share state via URL query parameters.",
    ko: "항목을 누르면 코드에 집중되고, 코드를 누르면 사용처로 전환됩니다. URL 쿼리로 공유할 수 있습니다.",
  },
  // signin
  "signin.title": { en: "Sign in", ko: "로그인" },
  "signin.hint": {
    en: "Sign in with the email and password your administrator provided. New accounts are not self-service.",
    ko: "관리자가 알려준 이메일과 비밀번호로 로그인하세요. 공개 가입은 없습니다.",
  },
  "signin.microsoft": { en: "Continue with Microsoft", ko: "Microsoft로 계속" },
  "signin.devNote": {
    en: "Use email and password from your admin. Not self-service sign-up.",
    ko: "관리자가 만든 이메일/비밀번호를 사용하세요. 직접 가입은 불가합니다.",
  },
  "signin.devEmail": { en: "Email", ko: "이메일" },
  "signin.devPassword": { en: "Password", ko: "암호" },
  "signin.devButton": { en: "Dev sign in", ko: "개발용 로그인" },
  "signin.devFail": { en: "Sign in failed. Check email and password.", ko: "로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요." },
  // auth error
  "authError.title": { en: "Sign-in error", ko: "로그인 오류" },
  "authError.body": {
    en: "Something went wrong while signing in with Microsoft. Check the error code below and the checklist.",
    ko: "Microsoft로 로그인하는 중 오류가 발생했습니다. 아래 코드와 체크리스트를 확인하세요.",
  },
  "authError.back": { en: "Back to sign in", ko: "로그인으로 돌아가기" },
  "authError.hint1": {
    en: "Set AUTH_URL in .env to exactly this site (e.g. http://localhost:3000) — no trailing slash.",
    ko: ".env의 AUTH_URL을 이 사이트와 정확히 같게 하세요(예: http://localhost:3000, 끝에 / 없음).",
  },
  "authError.hint2": {
    en: "In Microsoft Entra app: Authentication → add Web Redirect URI: {origin}/api/auth/callback/microsoft-entra-id",
    ko: "Entra 앱 → Authentication → Web 리디렉트 URI: {origin}/api/auth/callback/microsoft-entra-id",
  },
  "authError.hint3": {
    en: "Use a valid client ID and secret; single-tenant issuer: https://login.microsoftonline.com/{tenantId}/v2.0/",
    ko: "클라이언트 ID/시크릿을 확인하세요. 단일 테넌트 Issuer는 https://login.microsoftonline.com/테넌트ID/v2.0/ 입니다.",
  },
  "authError.hint4": {
    en: "School directory: the app should allow the right account types in that tenant.",
    ko: "학교 테넌트에서 허용되는 계정 유형(조직만 등)이 앱에 맞는지 확인하세요.",
  },
  "authError.hint5": {
    en: "Set AUTH_SECRET (e.g. openssl rand -base64 32) — required for sessions.",
    ko: "AUTH_SECRET을 설정하세요(예: openssl rand -base64 32) — 세션에 필요합니다.",
  },
  // teach layout
  "teach.navTitle": { en: "Faculty", ko: "교수" },
  "teach.myCourses": { en: "My courses", ko: "내 과목" },
  "teach.admin": { en: "Admin", ko: "관리" },
  "teach.explore": { en: "Explore", ko: "탐색" },
  "teach.signOut": { en: "Sign out", ko: "로그아웃" },
  "teach.noCourses": {
    en: "No courses assigned. Ask an admin to assign you to a course.",
    ko: "담당 과목이 없습니다. 관리자에게 과목 배정을 요청하세요.",
  },
  // teach editor
  "teach.backList": { en: "← Back to list", ko: "← 목록" },
  "teach.addItem": { en: "Add item", ko: "항목 추가" },
  "teach.type": { en: "Type", ko: "유형" },
  "teach.codesPlaceholder": { en: "Codes (comma-separated)", ko: "코드(콤마로 구분)" },
  "teach.add": { en: "Add", ko: "추가" },
  "teach.itemsCodes": { en: "Items & codes", ko: "항목·코드" },
  "teach.closeLink": { en: "Close link panel", ko: "연결 패널 닫기" },
  "teach.openLink": { en: "Link from OneDrive", ko: "OneDrive에서 연결" },
  "teach.saveCodes": { en: "Save codes", ko: "코드 저장" },
  "teach.unlink": { en: "Unlink", ko: "연결 끊기" },
  "teach.odRoot": { en: "OneDrive root", ko: "OneDrive 루트" },
  "teach.newFolderName": { en: "New folder name", ko: "새 폴더 이름" },
  "teach.createFolder": { en: "Create folder", ko: "폴더 만들기" },
  "teach.linkToItem": { en: "Link to this item", ko: "이 항목에 연결" },
  "teach.deleteItem": { en: "Delete item", ko: "항목 삭제" },
  "teach.deleteConfirm": { en: "Delete this item?", ko: "이 항목을 삭제할까요?" },
  "teach.errForbidden": { en: "You do not have permission to edit this course.", ko: "이 과목을 편집할 권한이 없습니다." },
  "teach.errLoad": { en: "Failed to load course.", ko: "불러오기에 실패했습니다." },
  "teach.loading": { en: "Loading…", ko: "로딩 중…" },
  "teach.odApiFail": {
    en: "OneDrive API failed. Sign in with your school Microsoft (Entra) account.",
    ko: "OneDrive API에 실패했습니다. 학교 Microsoft(Entra) 계정으로 로그인했는지 확인하세요.",
  },
  // admin layout
  "admin.navTitle": { en: "Admin", ko: "관리" },
  "admin.home": { en: "Home", ko: "개요" },
  "admin.courses": { en: "Courses", ko: "과목" },
  "admin.itemTypes": { en: "Item types", ko: "항목 유형" },
  "admin.profCourses": { en: "Faculty & courses", ko: "교수–과목" },
  "admin.signOut": { en: "Sign out", ko: "로그아웃" },
  "admin.pageTitle": { en: "Administration", ko: "관리자" },
  "admin.pageBody": {
    en: "Manage courses, item types, and which faculty can edit which course. For OneDrive, sign in with Microsoft and use Faculty pages to link files.",
    ko: "과목·항목 유형·담당 교수를 설정합니다. OneDrive는 Microsoft로 로그인한 뒤 교수 화면에서 파일을 연결하세요.",
  },
  "admin.linkCourses": { en: "Courses", ko: "과목" },
  "admin.linkItemTypes": { en: "Item types (top-level categories)", ko: "항목 유형(상위 그룹)" },
  "admin.linkAssign": { en: "Assign faculty to courses", ko: "교수·과목 배정" },
  "admin.coursesPageTitle": { en: "Courses", ko: "과목" },
  "admin.itemTypesPageTitle": { en: "Item types", ko: "항목 유형" },
  "admin.itemTypesPageBody": {
    en: "Define labels for top-level groups (Assignment, Project, etc.). In-use types are deactivated instead of deleted.",
    ko: "Assignment, Project 등 상위 그룹 이름을 정의합니다. 사용 중인 유형은 삭제 대신 비활성됩니다.",
  },
  "admin.scheduleNav": { en: "Schedule", ko: "학기/배정" },
  "admin.scheduleTitle": { en: "Schedule & section assignments", ko: "학기별 수업·섹션" },
  "admin.profPageTitle": { en: "Faculty & courses", ko: "교수·과목" },
  "admin.coursesLoadFail": { en: "Failed to load courses.", ko: "과목을 불러오지 못했습니다." },
  "admin.coursesCreateFail": { en: "Failed to create course.", ko: "과목을 만들지 못했습니다." },
  "admin.coursesNameLabel": { en: "New course name", ko: "새 과목 이름" },
  "admin.coursesAdd": { en: "Add", ko: "추가" },
  "admin.coursesSave": { en: "Save", ko: "저장" },
  "admin.coursesCancel": { en: "Cancel", ko: "취소" },
  "admin.coursesOrder": { en: "order", ko: "순서" },
  "admin.coursesEdit": { en: "Edit", ko: "편집" },
  "admin.coursesDelete": { en: "Delete", ko: "삭제" },
  "admin.coursesDeleteConfirm": { en: "Delete this course?", ko: "이 과목을 삭제할까요?" },
  "admin.itAddType": { en: "Add type", ko: "유형 추가" },
  "admin.itKeyPh": { en: "key (e.g. assignment)", ko: "키 (예: assignment)" },
  "admin.itLabelPh": { en: "Label (e.g. Assignment)", ko: "라벨 (예: Assignment)" },
  "admin.itAdd": { en: "Add", ko: "추가" },
  "admin.itCreateFail": {
    en: "Create failed. Key: lowercase letters, numbers, and hyphens only.",
    ko: "생성 실패. 키는 소문자·숫자·하이픈만 사용하세요.",
  },
  "admin.itActive": { en: "Active", ko: "사용" },
  "admin.itInactive": { en: "(inactive)", ko: "(비활성)" },
  "admin.itEdit": { en: "Edit", ko: "편집" },
  "admin.itDelete": { en: "Delete", ko: "삭제" },
  "admin.itDeleteConfirm": {
    en: "Delete? If the type is in use, it will be deactivated.",
    ko: "삭제할까요? 사용 중이면 비활성으로 전환됩니다.",
  },
  "admin.profFaculty": { en: "Faculty", ko: "교수" },
  "admin.profCourse": { en: "Course", ko: "과목" },
  "admin.profSelect": { en: "Select", ko: "선택" },
  "admin.profAssign": { en: "Assign", ko: "배정" },
  "admin.profNote": {
    en: "Users appear after their first sign-in. Promote admins with BOOTSTRAP_ADMIN_EMAILS.",
    ko: "Microsoft로 첫 로그인한 뒤 목록에 나타납니다. 관리자는 BOOTSTRAP_ADMIN_EMAILS로 올릴 수 있습니다.",
  },
  "admin.profRemove": { en: "Remove", ko: "제거" },
  "locale.en": { en: "EN", ko: "EN" },
  "locale.ko": { en: "KO", ko: "한" },
  "locale.label": { en: "Language", ko: "언어" },
};

export function t(locale: Locale, key: string): string {
  const row = MESSAGES[key];
  if (!row) {
    return key;
  }
  return row[locale] ?? row.en;
}
