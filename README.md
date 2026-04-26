# Parkour MVP

브라우저에서 실행되는 2D 사이드스크롤 파쿠르 게임. HTML5 Canvas + 순수 JavaScript.

## 실행

```bash
cd ~/Second-Brain/Projects/parkour-game
node server.js
```

브라우저에서 `http://localhost:8787` 열기.

`server.js`는 정적 파일 서빙 + 에디터 저장 엔드포인트(`POST /save`)를 제공한다. 에디터에서 S 키 누르면 JSON이 `saved-stages/stage-{timestamp}.json`에 저장됨. 그 후 Claude에게 "스테이지 저장" 또는 `/parkour-stage-save`로 import 요청.

## 테스트

Node 내장 테스트 러너 사용 (의존성 없음).

```bash
node --test test/*.test.js
```

현재 75개 테스트, 전부 통과.

## 조작

### Play 모드
| 키 | 동작 |
|---|---|
| A / ← | 왼쪽 이동 |
| D / → | 오른쪽 이동 |
| W / ↑ | 점프 (고정 높이) / 벽 점프 |
| SPACE | 다음 스테이지 (튜토리얼 → Stage 1, 클리어 후) |
| 0 ~ 5 | 해당 ID 스테이지로 점프 |
| R | 재시작 |
| **E** | 에디터 진입 |

### Edit 모드 (`E`로 진입)
| 키 | 동작 |
|---|---|
| ←→↑↓ | 커서 이동 (16px 그리드). anchor 모드면 anchor도 함께 이동, tile 모드면 cursor만 |
| **T** | anchor ↔ tile 모드 토글 |
| SPACE | 16x16 타일 토글 (커서가 덮는 임의 크기 solid는 통째로 제거) |
| P | 커서 위치를 spawn으로 |
| G | 커서 위치에 40x40 goal |
| N | 빈 스테이지로 초기화 |
| 0 ~ 5 | 해당 ID 스테이지를 scratch로 로드 |
| **Tab** | 시뮬 모드 진입/종료 — 편집 중인 스테이지 즉석 플레이 |
| **S** | 저장 (`saved-stages/stage-{ts}.json`) — Claude에 "스테이지 저장" 요청 |
| E | Play 복귀 |

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
├── server.js        Node 정적 서버 + POST /save 엔드포인트
├── src/
│   ├── physics.js   순수 물리 함수 (유닛 테스트)
│   ├── collision.js 순수 AABB 충돌 함수 (유닛 테스트)
│   ├── level.js     스테이지 데이터 + 판정 함수 (유닛 테스트)
│   ├── editor.js    에디터 상태 + reach 시각화 + 저장 함수 (유닛 테스트)
│   ├── tuning.js    런타임 물리 config (기본값 + 뮤터블 객체)
│   ├── panel.js     튜닝 패널 DOM (슬라이더 + 리셋)
│   ├── input.js     키보드 입력
│   ├── render.js    Canvas 렌더링
│   └── game.js      게임 루프
├── saved-stages/    에디터 저장 JSON (gitignore)
└── test/
    ├── physics.test.js
    ├── collision.test.js
    ├── level.test.js
    └── editor.test.js
```

스킬: `~/.claude/skills/parkour-stage-save/SKILL.md` — 저장된 JSON을 `level.js`에 통합.
