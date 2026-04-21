## 1. Spec
- [x] 1.1 `accounts-management` delta를 단일 backup/restore 요구사항으로 갱신한다.
- [x] 1.2 `frontend-architecture` delta를 Settings 중심 backup/restore UI와 Accounts UI 제거 기준으로 갱신한다.
- [x] 1.3 `api-keys`, `admin-auth` delta를 추가해 durable backup/restore 범위를 명시한다.

## 2. Implementation
- [x] 2.1 `GET /api/settings/backup`과 `POST /api/settings/restore`를 추가한다.
- [x] 2.2 계정, settings, dashboard auth, API key durable 상태를 단일 JSON으로 export/restore 한다.
- [x] 2.3 legacy account import/export API와 Accounts 페이지 import/export UI를 제거한다.
- [x] 2.4 restore 직후 settings/account/api key 관련 캐시를 무효화해 재시작 없이 반영되게 한다.

## 3. Validation
- [x] 3.1 backend integration/unit tests를 새 backup/restore 계약으로 갱신했다.
- [x] 3.2 frontend tests, mocks, typecheck를 새 UI/API 계약으로 갱신했다.
- [x] 3.3 targeted pytest, vitest, TypeScript typecheck, ruff 검증을 실행했다.
- [ ] 3.4 `openspec validate --specs` 실행
  현재 로컬 환경에서는 `python -m openspec` 진입점이 없어 실행하지 못했다.
