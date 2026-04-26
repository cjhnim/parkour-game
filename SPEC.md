# Parkour MVP — 구현 스펙

현재 구현된 상태를 기록한다. 버전이 바뀔 때마다 업데이트한다.

---

## 버전

**v0.12** — 패턴 라이브러리 도입(Phase 1) + 튜닝 패널 슬림화
- `src/patterns.js` 신규 — `dropStep(ox, oy, dir)`·`longGap`·`wallClimb` + `PATTERN_REGISTRY`. 각 함수는 translation-invariant하게 `{ platforms, route, bbox }` 반환. `dropStep`은 atomic 단위(한 칸 하강)로, 좌·우 방향 선택 가능 + 여러 번 호출해 계단 합성
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

### Stage 4 — Climb (벽 점프 필수)

- 화면 하단 왼쪽에서 스폰, 화면 상단 오른쪽의 골 지점 도달 시 클리어
- 지그재그 플랫폼 6개 배치 (아래 → 위)

**정규 루트**: Floor → P1 → P2 → P3 → P4 → Goal (벽 이용)
- P4 왼쪽 끝에서 풀스피드 점프 → Goal 플랫폼 좌측면에 bbox 충돌 → 벽점프로 상단 착지
- P4→Goal은 직접 상단 착지 불가 (높이 130px > 최대 114px) — 측면 클링 + 벽점프 필수

**함정**: P5는 올라갈 수 있지만 Goal에 도달 불가

---

## UI

- **상단 좌**: 스테이지 이름
- **상단 우**: 경과 시간 (초, 소수점 2자리)
- **하단 중앙**: 조작 힌트
- **클리어 오버레이**: "CLEAR!" + 기록 시간 + 다음 행동 안내 (반투명 오버레이)

---

## 클리어 가능성 검증 (`src/validator.js`)

튜닝 패널에서 물리 파라미터를 바꿀 때 스테이지를 클리어할 수 있는지 실시간으로 판독한다.

- `computeMaxJumpHeight(cfg)` — 현재 config로 도달 가능한 최대 점프 높이
- `computeMaxHorizontalReach(cfg)` — 점프 중 최대 수평 이동 거리
- `validateStage(stage, cfg)` — route 각 step을 시뮬레이션 → `{ clearable, issues[], capabilities }`

**스테이지 route**: 각 step에 `takeoff: {x, y, vxDir}` (출발 지점 및 방향) + `targetPlatform: {x, y, w, h}` 명시.

**검증 모델 (bbox-overlap)**: 출발점에서 풀스피드로 점프했을 때의 포물선 중 어떤 프레임에서든 플레이어 bbox와 타깃 플랫폼 bbox가 겹치면 통과로 판정한다. 상단 착지뿐 아니라 측면 충돌(벽 클링)도 포함된다 — 측면에 닿으면 벽 점프 + 입력 제어로 상단 착지가 가능하기 때문.

**Step types**:
- `jump` — 타깃 플랫폼에 bbox 충돌 (대부분의 step)
- `wall-touch` — 임의 벽까지 수평 도달 (vertical 무관)
- `wall-jump-land` — 벽 점프 포물선이 타깃 플랫폼 상단에 착지

**용도**: (1) `test/patterns.test.js`에서 패턴이 임의 offset에서 클리어 가능한지 검증, (2) `render.js > drawRoute`에서 점프 trajectory 시각화. 튜닝 패널의 실시간 텍스트 판독은 v0.12에서 제거 (패턴 사전 검증으로 불필요해짐).

**경로 시각화 (`src/render.js > drawRoute`)**: 패널이 열려 있을 때 각 step의 시뮬레이션 trajectory를 점선으로 그리고, 종료 지점에 player bbox(32×24)를 박스로 표시한다.

---

## 테스트 현황

| 파일 | 테스트 수 | 상태 |
|---|---|---|
| `test/physics.test.js` | 12 | ✅ 전부 통과 |
| `test/collision.test.js` | 9 | ✅ 전부 통과 |
| `test/level.test.js` | 13 | ✅ 전부 통과 |
| `test/validator.test.js` | 19 | ✅ 전부 통과 |
| `test/patterns.test.js` | 32 | ✅ 전부 통과 |
| **합계** | **85** | **✅** |

테스트 대상: 순수 함수만. DOM·Canvas·RAF·키보드 입력은 수동 검증.

---

## 향후 작업 후보

### 게임 디자인
- 더블 점프
- 대시 (공중 수평 이동)
- 콤보/트릭 점수 시스템
- **스테이지 메이커** — 브라우저 에디터에서 검증된 패턴(long gap·drop·wall climb 등)을 스탬프처럼 배치해 스테이지를 만든다. 패턴 자체가 사전 검증돼있어 좌표 디버깅 불필요. 사용자는 패턴 배치·spawn·goal 위치만 책임. 만든 스테이지는 localStorage에 저장. Stage 5 추가가 validator 좌표 제약 연립 문제로 막힌 경험에서 나온 설계.
  - **Phase 1 완료 (v0.12)**: `patterns.js` 추출 + 테스트.
  - 후속: 신규 패턴 추가, 브라우저 에디터, localStorage 저장.

### QoL (Quality of Life)
- **베스트 타임 저장** — `localStorage`로 스테이지별 최단 시간 기록·표시
- **스테이지 셀렉트 메뉴** — 클리어 후 다른 스테이지로 돌아갈 수단. 현재는 R(재시작)만 가능. 마지막 스테이지 클리어 후 진입 메뉴 부재
- **Coyote time / Jump buffer** — 플랫폼 끝에서 살짝 늦게 점프하거나, 착지 직전 점프 키를 살짝 일찍 눌러도 받아주는 grace frame. 플랫포머 표준 QoL
