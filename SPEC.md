# Parkour MVP — 구현 스펙

현재 구현된 상태를 기록한다. 버전이 바뀔 때마다 업데이트한다.

---

## 버전

**v0.15** — 키보드 브러시 에디터 + reach 시각화 + 에이전트 매개 저장
- `src/editor.js` 신규 — 에디터 상태(`mode: anchor | tile`, cursor, anchor, facing)와 순수 함수(moveCursor, toggleMode, toggleTile, setSpawn, setGoal, createBlankStage, computeReachArcs, serializeStage, snapToGrid)
- `E` 키로 Play ↔ Edit 토글. 에디터에서 `T`로 anchor↔tile 모드 전환
- **anchor 모드**: 화살표로 cursor·anchor 함께 이동(16px). reach arc가 anchor 따라 실시간 갱신
- **tile 모드**: cursor만 이동, anchor 고정. SPACE로 16x16 타일 토글(없으면 추가, 있으면 제거 — eraser는 임의 크기 solid 덮어 제거)
- **reach arc**: 발 중앙 takeoff 가정. facing 방향 outer 포물선 점선 + 사이 영역 반투명 fill. 솔리드와 만나면 그 지점에서 trajectory 종료
- 단축키: `P`(spawn), `G`(goal 40x40), `N`(빈 스테이지로 초기화), `0~5`(스테이지 점프), `Tab`(편집 ↔ 시뮬), `S`(저장)
- **Tab 시뮬 모드**: 에디터 안에서 scratchStage로 실제 게임 플레이. R로 재시도, Tab 다시로 편집 복귀
- **Goal 중력**: play·sim 모드에서 goal 박스가 중력 받아 가장 가까운 surface에 안착 (디자이너가 정확한 plat 정렬 불필요)
- **저장 흐름**: `node server.js`(정적 + `POST /save` 엔드포인트) → S 키가 `saved-stages/stage-{ts}.json`에 fetch → `parkour-stage-save` 스킬이 읽어 level.js에 통합
- **arena 그리드 정렬**: floor h=32 (y=608), walls/ceiling h=16. 모든 외곽이 16-그리드. 인테리어 플랫폼도 일괄 16 정렬
- **Stage 4 추가** (custom: Long Gap variant). 기존 4·5는 5·6으로 시프트. 총 7개 스테이지(Tutorial / Stairs / Drop / Long Gap / Long Gap custom / Climb / Zigzag Drop)
- 테스트 34 → 75 (신규 `test/editor.test.js` 41개)

**v0.14** — validator·패턴 라이브러리 제거 (Phase 0 정리)
- `src/validator.js`·`src/patterns.js` 삭제. 자동 클리어 가능성 검증 폐기
- `test/validator.test.js`·`test/patterns.test.js` 삭제
- `render.js`의 `drawRoute`·`drawPlatformNumbers`·`simulateStep` 제거. route 시각화 폐기
- 모든 스테이지에서 `route` 필드 제거. 스테이지 형태 = `{ id, name, spawn, solids, goal }`
- Stage 2~5의 패턴 함수 호출을 풀어 literal 좌표로 재작성 (좌표 동일, 시각적·기능적 회귀 없음)
- 테스트 92 → 34개
- 의도: validator는 점프 step만 검증 가능, 게임플레이 결함(바닥 우회·column 스킵)은 못 잡음. 패턴 API는 사람한테 인지부하 큼. 자동 검증 대신 reach 시각화 + 키보드 브러시 에디터로 사람 디자인 지원 방향 전환 (후속 plan)

**v0.13** — Stage 5 추가 + 디버그 시각화 보강
- Stage 5 (Zigzag Drop) 추가 — 진짜 좌·우 교차 zigzag. `dropStep` 4번 호출, **비대칭 dx**(우=210, 좌=100)로 매 단계 ~10px 우측 drift → column 정렬 방지(직접 낙하로 다음 same-side 플랫폼 스킵 막음). 바닥 없음 → 잘못 떨어지면 OOB 리스폰
- `render.js > drawPlatformNumbers` — 튜닝 패널 켜졌을 때 route 순서대로 각 플랫폼 위에 번호(0=시작, 1=첫 점프 타깃, ...) 동그라미 표시. trajectory와 함께 디자인 검토용
- `validator.test.js`에 stage5 클리어 가능성 케이스 추가 (92개)
- 디자인 함정 기록: validator가 통과해도 게임플레이 결함은 가능 (예: 바닥에서 골 도달, 같은 column 스킵). 플레이 테스트 필수

**v0.12** — 패턴 라이브러리 도입(Phase 1) + 튜닝 패널 슬림화
- `src/patterns.js` 신규 — `dropStep(ox, oy, dir, opts)`·`longGap`·`wallClimb` + `PATTERN_REGISTRY`. 각 함수는 translation-invariant하게 `{ platforms, route, bbox }` 반환. `dropStep`은 atomic 단위(한 칸 점프)로, 좌·우 방향 + `opts.dx`·`dy`·`targetW`·`targetH`로 타깃 위치·크기 자유 지정. dy<0면 위로 점프(점프 높이 한도 ≈114px). 여러 번 호출해 계단/오르기 합성
- Stage 2·3·4를 패턴 호출로 재작성 (좌표 동일, 회귀 없음)
- `test/patterns.test.js` 추가 — 임의 offset에서 validator 통과 확인 (translation invariance)
- 그리드 컨벤션: `(ox, oy)`는 16의 배수 권장 (강제 X)
- 튜닝 패널의 CLEARABILITY 텍스트 섹션 제거 (drawRoute 시각화는 유지). 패턴이 사전 검증되므로 패널의 실시간 텍스트 판독은 사실상 불필요
- 테스트 53 → 77, 전부 통과
- 의도: 좌표 연립 문제로 새 스테이지 추가가 막혔던 구조 해소. 검증된 패턴만 호출하면 자동 통과. validator는 디자인 search 도구에서 **테스트 oracle + 경로 시각화**로 역할 축소

**v0.11** — Tuning 패널 슬림화. 게임성에 직접 영향 주는 5개(`gravity`·`jumpVelocity`·`moveSpeed`·`wallJumpVx`·`wallJumpVy`)만 노출. 나머지 4개는 DEFAULTS 고정값으로 유지.

**v0.10** — 코드 정리
- `panel.js`: 동작 안 하던 슬라이더 2개(`jumpHoldForce`·`jumpHoldMaxFrames`) 제거. 가변 점프 제거 후 남은 흔적
- `physics.js`: 미사용 함수(`computeVx`·`step`) 및 DEFAULTS 미러 상수 7개 제거. 테스트도 `DEFAULTS` 직접 참조로 변경
- `validator.js`: 어떤 스테이지도 사용하지 않던 `wall-touch`·`wall-jump-land` step type 제거 (`canReachWall`·`canWallJumpLand`·`advance` 함수 삭제). render의 시뮬레이션 분기도 정리
- 테스트 62 → 53개, 전부 통과

**v0.9** — 스테이지 추가: 기술별 커리큘럼 4종 (Stairs / Climb / Long Gap / Drop). 기존 Climb는 Stage 1 → Stage 2로 이동.

**v0.8** — 검증기 모델을 bbox-overlap으로 통합 + 경로 시각화
- 모든 route step을 `targetPlatform: {x, y, w, h}`로 통일 (verticalGap·horizontalGap 제거)
- validator는 trajectory 중 player bbox와 target bbox가 겹치는지 검사 — top landing이든 side wall-cling이든 통과로 판정 (벽 메카닉으로 측면→상단 전환이 가능하므로)
- 튜닝 패널 열면 캔버스에 통과 경로를 점선으로 시각화 (각 step 끝에 player bbox 표시)
- `side-cling-clear` step type은 'jump'로 흡수 (동일 로직)

**v0.7** — Stage 1 재설계: Goal 낮춤(y=110), P4→Goal 벽 메카닉, P5 함정화

**v0.6** — 검증기 수평 간격 체크에 PLAYER_W 반영 + P5→Goal route 보정 (160→150)

**v0.5** — 플레이어 크기 32×24로 변경 (가로세로 비율을 SVG 캐릭터에 맞게 조정)

**v0.4** — 픽셀아트 캐릭터 SVG 원본 재구현 + 눈동자 방향 전환 애니메이션

**v0.3** — 픽셀아트 캐릭터 + 고정 점프 (가변 점프 제거) + 물리 재조정

---

## 화면

- 캔버스 크기: **960 × 640px**
- **고정 카메라** — 스크롤 없음. 모든 스테이지는 화면 한 장 안에 담긴다.
- 배경: 단색(`#1a1a24`)

---

## 플레이어

- 크기: 32 × 24px (가로 > 세로 — SVG 캐릭터 비율 반영)
- 외형: Claude Code 픽셀아트 캐릭터 — SVG 원본 좌표(`viewBox 0 0 24 24`) 기반
  - 색상: `#D97757` (오렌지)
  - 구성: 몸통 + 양팔 돌출 + 발 4개 + 눈(세로 직사각형) 2개
  - 눈동자: 이동 방향으로 이동 (좌 이동 → 왼쪽, 우 이동 → 오른쪽, 정지 → 기본)

### 물리 파라미터 (`src/tuning.js` — 런타임 변경 가능)

| 파라미터 | 기본값 | 설명 | 패널 노출 |
|---|---|---|---|
| `gravity` | 0.7 | 프레임당 중력 가속도 (px/frame²) | ✅ |
| `jumpVelocity` | -13 | 점프 초기 수직 속도 (고정 높이) | ✅ |
| `moveSpeed` | 5 | 수평 이동 최대 속도 | ✅ |
| `wallJumpVx` | 6 | 벽 점프 수평 킥 속도 | ✅ |
| `wallJumpVy` | -11 | 벽 점프 수직 킥 속도 | ✅ |
| `maxFallSpeed` | 16 | 최대 낙하 속도 | — |
| `wallSlideMaxFall` | 3 | 벽 슬라이드 중 최대 낙하 속도 | — |
| `moveAccel` | 0.8 | 이동 가속도 — 키를 누를 때마다 vx에 더해지는 값 | — |
| `moveFriction` | 0.75 | 이동 마찰 계수 — 키를 뗄 때 vx에 곱해지는 값 (0~1) | — |

**Tuning 패널** (왼쪽 토글)에는 게임성에 직접 영향을 주는 5개 파라미터만 노출. 나머지는 `tuning.js`의 DEFAULTS로 고정 유지. "↺ Reset to defaults"로 초기값 복원.

### 조작

- **좌우 이동**: A/D 또는 ← → (가속/마찰 적용, 즉각 최고 속도 아님)
- **점프**: W / ↑
  - 지면에 있을 때 → 고정 높이 점프 (키 지속시간 무관)
  - 공중 + 벽에 닿아 있을 때 → 벽 점프 (벽 반대 방향으로 킥)
- **벽 슬라이드**: 공중에서 벽에 닿은 채 아래로 이동 중이면 낙하 속도가 `wallSlideMaxFall`로 제한됨

### 낙사 조건

- 플레이어 y좌표가 화면 높이(640)를 초과하면 스폰 위치로 리스폰
- Stage 3 (pit)·Stage 4 (no floor)에서 실제로 발동

---

## 충돌 (`src/collision.js`)

- **AABB** (축 정렬 경계 박스)
- 해결 순서: X축 먼저 → Y축
- `wallSide` 반환값: `-1` (왼쪽 벽), `1` (오른쪽 벽), `0` (벽 없음)
- `grounded`: Y축 해결 시 아래에서 막히면 `true`

---

## 스테이지 (`src/level.js`)

### Stage 0 — Tutorial

- 장애물 없는 빈 방 (바닥 + 양쪽 벽 + 천장)
- 골 없음 (`goal: null`) — 자유롭게 조작 테스트
- SPACE로 Stage 1 진입

### Stage 1 — Stairs (점프만)

- 단순 계단형 플랫폼 3개. 단일 점프로 모두 도달 가능
- 벽 메카닉·이동 가속 등 별도 기술 불필요
- 첫 스테이지로 점프 감각만 익히게 함

### Stage 2 — Drop (하강)

- 천장 부근(y=160)에서 스폰, 4개 플랫폼을 오른쪽으로 한 칸씩 내려가는 계단형 (Top → P1 → P2 → P3)
- 바닥 floor 없음 — 잘못 떨어지면 OOB → 리스폰 (낙사 로직 검증 겸)
- Goal: P3 우측면, 오른쪽 벽 직전. P3 위로 걸어가야 도달

### Stage 3 — Long Gap (이동 중 점프)

- 좌·우 두 개의 floor 사이에 190px 폭의 함정 (pit). 이론상 max ≈ 200px라 마진 매우 좁음
- 정지 점프로는 거리 부족 — 좌측 floor에서 가속한 뒤 우측 끝에서 정확히 점프해야 우측 floor 착지
- pit으로 떨어지면 OOB → 리스폰

### Stage 4 — Long Gap (custom)

- Stage 3의 변형. 우측 floor가 16x16 타일 27개로 재구성되어 24px 위로 올라감 (y=576·592 두 행)
- 에디터에서 직접 만든 스테이지의 첫 사례 (`saved-stages/`에서 import)
- 그 외엔 Stage 3와 동일한 long gap 메커닉

### Stage 5 — Climb (벽 점프 필수)

- 화면 하단 왼쪽에서 스폰, 화면 상단 오른쪽의 골 지점 도달 시 클리어
- 지그재그 플랫폼 6개 배치 (아래 → 위)

**정규 루트**: Floor → P1 → P2 → P3 → P4 → Goal (벽 이용)
- P4 왼쪽 끝에서 풀스피드 점프 → Goal 플랫폼 좌측면에 bbox 충돌 → 벽점프로 상단 착지
- P4→Goal은 직접 상단 착지 불가 (높이 130px > 최대 114px) — 측면 클링 + 벽점프 필수

**함정**: P5는 올라갈 수 있지만 Goal에 도달 불가

### Stage 6 — Zigzag Drop (좌·우 교차 하강)

- 화면 상단 좌측에서 스폰, 좌·우 교차하며 4번 점프해 하단으로 내려감
- 비대칭 dx(우=210, 좌=100)로 매 단계 ~10px 우측 drift → 같은 column에 다음 same-side 플랫폼이 오지 않게 함. 직접 낙하로 스킵 불가
- 바닥 floor 없음 — 잘못 떨어지면 OOB → 리스폰
- Goal: P4 위 (좌측 하단)

---

## UI

- **상단 좌**: 스테이지 이름 (에디터에선 `EDIT [anchor|tile]` 또는 `TEST` 접두사)
- **상단 우**: 경과 시간 (초, 소수점 2자리)
- **하단 중앙**: 모드별 조작 힌트
- **클리어 오버레이**: "CLEAR!" + 기록 시간 + 다음 행동 안내 (반투명)
- **토스트**: 저장·모드 전환 등 일시 알림 (상단)

---

## 에디터 (`src/editor.js`)

`E` 키로 Play ↔ Edit 토글. 에디터 모드는 두 서브모드를 가진다.

### 모드

| 모드 | 동작 |
|---|---|
| `anchor` (기본) | 화살표가 cursor와 anchor를 함께 이동(16px). reach arc가 anchor 따라 실시간 갱신 |
| `tile` | cursor만 이동, anchor 고정. 타일 배치에 집중 |

`T` 키로 토글. anchor 모드 진입 시 anchor가 현재 cursor로 점프.

### Edit 모드 단축키

| 키 | 동작 |
|---|---|
| ←→↑↓ | 커서 이동 (16px). anchor 모드는 anchor도 함께. 좌·우 입력은 facing 갱신 |
| T | anchor ↔ tile 모드 토글 |
| SPACE | 16x16 타일 토글 (커서가 덮는 임의 크기 solid는 통째로 제거) |
| P | 커서 위치를 spawn으로 설정 |
| G | 커서 위치에 40x40 goal 설정 |
| N | 빈 스테이지로 초기화 (arena 외곽만, spawn은 좌하단) |
| 0~5 | 해당 ID 스테이지를 scratch로 로드 |
| Tab | **시뮬 모드** 진입/종료 — 편집 중인 스테이지를 즉석 플레이 |
| S | 현재 스테이지를 `POST /save`로 전송 → `saved-stages/stage-{ts}.json` |
| E | Play 모드로 복귀 (편집 폐기) |

### 시뮬 모드 (Tab)

편집 중인 scratchStage에서 캐릭터를 spawn시켜 실제 게임처럼 플레이. 점프·벽점프·OOB·goal 모두 동작. R로 캐릭터만 리스폰. Tab 다시 누르면 편집 복귀 (cursor·anchor 그대로).

### Reach 시각화

`computeReachArcs(takeoff, facing, cfg, solids)` — takeoff 지점에서 발 중앙 trajectory를 facing 방향 max 속도로 시뮬레이션. solid와 만나면 그 지점에서 종료. 두 호 사이 영역(outer 곡선 + 위쪽 cap + 좌측 수직선)을 반투명 fill로 그려 도달 가능 영역 표시.

### Goal 중력

play·sim 모드에서 goal 박스가 매 프레임 중력 + 충돌 적용 받아 가장 가까운 surface에 안착. 디자이너는 goal을 공중에 두기만 해도 자동으로 플랫폼 위에 놓임.

---

## 저장 / Import 흐름 (에이전트 매개)

1. `node server.js` (정적 파일 + `POST /save` 엔드포인트)
2. 에디터에서 S → `fetch('/save', ...)` → `saved-stages/stage-{ts}.json`
3. 사용자가 Claude에 "스테이지 저장" / `/parkour-stage-save`
4. `~/.claude/skills/parkour-stage-save` 스킬:
   - 최신 saved 파일 읽기
   - id 충돌 시 사용자에 confirm (replace / append)
   - `src/level.js`에 stage 추가 + STAGES 배열 갱신
   - `node --test test/*.test.js` 실행해 회귀 확인

`saved-stages/`는 gitignore.

---

## 그리드 정렬

- 모든 인테리어 플랫폼·arena 외곽은 **16px 그리드**에 정렬
- arena floor: y=608, h=32 / walls: w=16 / ceiling: h=16
- spawn·goal 위치는 16-그리드일 필요 없음 (player 24px 등 비배수 크기 때문)
- 에디터 진입 시 cursor를 spawn에서 16-그리드로 스냅해 깔끔한 시작점 보장

---

## 테스트 현황

| 파일 | 테스트 수 | 상태 |
|---|---|---|
| `test/physics.test.js` | 12 | ✅ 전부 통과 |
| `test/collision.test.js` | 9 | ✅ 전부 통과 |
| `test/level.test.js` | 13 | ✅ 전부 통과 |
| `test/editor.test.js` | 41 | ✅ 전부 통과 |
| **합계** | **75** | **✅** |

테스트 대상: 순수 함수만. DOM·Canvas·RAF·키보드 입력은 수동 검증.

---

## 향후 작업 후보

### 게임 디자인
- 더블 점프
- 대시 (공중 수평 이동)
- 콤보/트릭 점수 시스템

### 에디터 보강
- **인접 타일 병합** — 16x16 타일 여러 개로 칠한 큰 면을 더 큰 박스 하나로 합치기 (저장 시 압축)
- **stage name 편집** — 현재 placeholder 'Custom Stage N' 그대로. 인게임 텍스트 입력 또는 import 시 사용자 명시
- **타일 클립보드** — 일정 영역을 복사·붙여넣기

### QoL (Quality of Life)
- **베스트 타임 저장** — `localStorage`로 스테이지별 최단 시간 기록·표시
- **스테이지 셀렉트 메뉴** — 클리어 후 다른 스테이지로 돌아갈 수단. 현재는 R(재시작)·0~5 단축키만
- **Coyote time / Jump buffer** — 플랫폼 끝에서 살짝 늦게 점프하거나, 착지 직전 점프 키를 살짝 일찍 눌러도 받아주는 grace frame. 플랫포머 표준 QoL
