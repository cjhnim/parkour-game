# Parkour MVP

브라우저에서 실행되는 2D 사이드스크롤 파쿠르 게임. HTML5 Canvas + 순수 JavaScript.

## 실행

ES Module 사용으로 로컬 서버가 필요합니다.

```bash
cd ~/Second-Brain/Projects/parkour-game
python3 -m http.server 8787
```

브라우저에서 `http://localhost:8787` 열기.

## 테스트

Node 내장 테스트 러너 사용 (의존성 없음).

```bash
node --test test/*.test.js
```

현재 91개 테스트, 전부 통과.

## 조작

| 키 | 동작 |
|---|---|
| A / ← | 왼쪽 이동 |
| D / → | 오른쪽 이동 |
| W / ↑ | 점프 (고정 높이) / 벽 점프 |
| SPACE | 다음 스테이지 (튜토리얼 → Stage 1, 클리어 후) |
| R | 재시작 |

## 개발 원칙

유닛 테스트 가이드: `03 Resources/Software/에이전트 코딩 가이드/유닛 테스트.md`

- **순수 로직은 반드시 유닛 테스트** — `physics.js` · `collision.js` · `level.js` 처럼 외부 I/O 없는 함수는 mock 없이 테스트한다.
- **렌더링·입력·게임루프는 수동 검증** — DOM/Canvas/RAF는 테스트 대상이 아니다.
- **행동을 검증한다, 구현이 아니다** — 내부 호출 횟수나 private 상태를 단언하지 않는다.
- **알리바이 테스트 금지** — 실패한 테스트는 assertion을 느슨하게 바꿔 통과시키지 않는다. 코드에서 원인을 고친다.
- 새 기능 추가 시: 순수 로직 함수 작성 → 테스트 작성 → `node --test test/*.test.js` 통과 확인 후 진행.

## 프로젝트 구조

```
parkour-game/
├── index.html       캔버스 + 진입점
├── src/
│   ├── physics.js   순수 물리 함수 (유닛 테스트)
│   ├── collision.js 순수 AABB 충돌 함수 (유닛 테스트)
│   ├── level.js     스테이지 데이터 + 판정 함수 (유닛 테스트)
│   ├── patterns.js  검증된 점프 패턴 라이브러리 (유닛 테스트)
│   ├── validator.js 스테이지 클리어 가능성 검증 (유닛 테스트)
│   ├── tuning.js    런타임 물리 config (기본값 + 뮤터블 객체)
│   ├── panel.js     튜닝 패널 DOM (슬라이더 + 리셋)
│   ├── input.js     키보드 입력
│   ├── render.js    Canvas 렌더링
│   └── game.js      게임 루프
└── test/
    ├── physics.test.js
    ├── collision.test.js
    ├── level.test.js
    ├── validator.test.js
    └── patterns.test.js
```
