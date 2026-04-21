## 1. Spec
- [x] 1.1 계정 만료일 API와 라우팅 동작을 `accounts-management` delta에 정의한다.
- [x] 1.2 계정 상세 화면의 날짜 입력 UI를 `frontend-architecture` delta에 정의한다.

## 2. Implementation
- [x] 2.1 accounts 테이블과 backup payload에 만료일 필드를 추가한다.
- [x] 2.2 계정 만료일 수정 API를 추가하고, 만료일이 계정 풀 동작에 영향을 주지 않도록 유지한다.
- [x] 2.3 Accounts 페이지에 날짜 입력 기반 만료일 설정 UI와 만료일 정렬 UI를 추가한다.

## 3. Validation
- [x] 3.1 계정 만료일 API와 backup/restore round trip integration test를 추가한다.
- [x] 3.2 frontend schema/hook/component 테스트와 typecheck를 실행한다.
- [ ] 3.3 `openspec validate --specs`
  로컬 OpenSpec CLI 진입점이 없으면 실행하지 못할 수 있다.
