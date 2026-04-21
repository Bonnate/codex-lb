## Why

계정 import/export가 Accounts 페이지에 흩어져 있고, 운영 설정과 API 키, 대시보드 로그인 보안 상태는 함께 이동할 수 없습니다. 그래서 실제 백업/복원 시에는 여러 화면과 수동 절차를 거쳐야 하고, 다른 인스턴스로 옮길 때도 durable 상태를 한 번에 재현하기 어렵습니다.

## What Changes

- 기존 계정 import/export 기능을 Settings 페이지의 단일 backup/restore 기능으로 치환합니다.
- `GET /api/settings/backup`이 계정, dashboard settings, dashboard auth, API key durable 상태를 담은 단일 JSON 첨부 파일을 제공합니다.
- `POST /api/settings/restore`가 단일 JSON 파일 하나를 받아 설정은 덮어쓰고, 계정과 API 키는 duplicate를 skip하며 병합합니다.
- `POST /api/accounts/import`, `POST /api/accounts/export`, `GET /api/accounts/{account_id}/export`를 제거합니다.
- restore 직후 settings cache, account selection cache, API key cache를 무효화해서 서버 재시작 없이 다음 요청부터 반영되게 합니다.
- Accounts 페이지에서는 import/export UI를 제거하고, Settings 페이지에 Backup & Restore 섹션을 추가합니다.

## Impact

- 대시보드 운영 백업/복원 UX와 관련 API 계약이 바뀝니다.
- 계정 토큰과 TOTP secret은 export 시 portable 값으로 직렬화되고, restore 시 현재 인스턴스 키로 다시 암호화됩니다.
- plain API key 문자열은 백업 대상이 아니며, hash/prefix/limits/assignments 같은 durable metadata만 백업됩니다.
- 로컬에서는 `openspec validate --specs`를 실행하려 했지만 현재 OpenSpec CLI 진입점이 없어 수동 검토로 대체합니다.
