# 🏗️ KAFI시스템 아키텍처

> 이 문서는 KAFI의 전체 시스템 아키텍처, 데이터 흐름, 모듈 설계를 기술합니다.
> 기준일(2026-02-28): 아래 내용 중 Backend/REST/WebSocket 파트는 목표 아키텍처이며, 현재 저장소에서는 `desktop` + `renderer` + `shared`만 실행 가능합니다.

---

## 목차

- [시스템 전체 아키텍처](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [레이어별 상세 설계](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [데이터 흐름 (목표 아키텍처)](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [위젯 시스템](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [AI Agent 시스템](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [팀 협업 시스템](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)
- [보안 및 인증 (목표 아키텍처)](https://www.notion.so/2c315ddb8bf8802ab59fd377d17c12df?pvs=21)

---

## 시스템 전체 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                    Desktop App (Electron)             │
│  ┌──────────────┐  ┌───────────────────────────────┐ │
│  │ Main Process │  │     Renderer Process          │ │
│  │              │  │  ┌─────────┐ ┌─────────────┐  │ │
│  │ • Window Mgr │  │  │ Widget  │ │  Dashboard  │  │ │
│  │ • Tray Icon  │◄─┤  │  View   │ │    View     │  │ │
│  │ • IPC Bridge │  │  │(캐릭터) │ │(관리 화면) │  │ │
│  │ • Auto Update│  │  └────┬────┘ └──────┬──────┘  │ │
│  └──────────────┘  │       │              │         │ │
│                    └───────┼──────────────┼─────────┘ │
└────────────────────────────┼──────────────┼───────────┘
                             │   Socket.IO  │  REST API
                    ┌────────▼──────────────▼────────┐
                    │       Backend Server            │
                    │  ┌──────────┐ ┌──────────────┐  │
                    │  │ API      │ │  WebSocket   │  │
                    │  │ Routes   │ │  Handler     │  │
                    │  └────┬─────┘ └──────┬───────┘  │
                    │       │              │          │
                    │  ┌────▼──────────────▼───────┐  │
                    │  │   Agent Orchestrator      │  │
                    │  │  ┌───────┐ ┌───────┐      │  │
                    │  │  │Agent 1│ │Agent 2│ ...  │  │
                    │  │  └───┬───┘ └───┬───┘      │  │
                    │  └──────┼─────────┼──────────┘  │
                    └─────────┼─────────┼─────────────┘
                              │         │
                    ┌─────────▼─────────▼─────────────┐
                    │        LLM Providers             │
                    │  OpenAI │ Claude │ Gemini │ Local │
                    └─────────────────────────────────┘
```

---

## 레이어별 상세 설계

### 1. Desktop Layer (Electron Main Process)

| 모듈 | 파일 | 역할 |
| --- | --- | --- |
| `index.ts` | 앱 진입점 | Electron 앱 초기화, 전역 설정 |
| `widget.ts` | 위젯 관리 | 투명 윈도우 생성/위치/크기 관리 |
| `tray.ts` | 트레이 | 시스템 트레이 아이콘, 컨텍스트 메뉴 |
| `ipc.ts` | IPC 통신 | Main ↔ Renderer 프로세스 간 통신 |

### 윈도우 구성

```
┌─ 데스크톱 ────────────────────────────────┐
│                                           │
│  ┌──── Widget Window (투명) ───────┐      │
│  │  🤖 Agent 캐릭터               │      │
│  │  💬 "코드 리뷰 진행 중..."     │      │
│  │  ██████████░░░ 70%             │      │
│  └─────────────────────────────────┘      │
│                                           │
│            ┌── Dashboard Window ──────┐   │
│            │  에이전트 목록           │   │
│            │  팀 보드                 │   │
│            │  채팅/로그              │   │
│            └──────────────────────────┘   │
│                                           │
│  [🍊] ← 시스템 트레이                    │
└───────────────────────────────────────────┘
```

### 2. Renderer Layer (React)

### 컴포넌트 트리

```
App
├── WidgetView               # 위젯 윈도우용
│   ├── WidgetContainer      # 위젯 컨테이너 (드래그 가능)
│   ├── AgentCharacter       # 캐릭터 렌더러 (Lottie/PixiJS)
│   ├── AgentStatusBubble    # 상태 말풍선
│   └── TaskProgress         # 진행률 표시
└── DashboardView            # 대시보드 윈도우용
    ├── AgentList            # 에이전트 목록/관리
    ├── TeamBoard            # 팀 칸반 보드
    ├── ChatPanel            # 에이전트 채팅/로그
    └── SettingsPanel        # 설정 (API 키, 테마 등)
```

### 상태 관리 구조 (Zustand)

```tsx
// 스토어 분리 전략
stores/
├── useAgentStore.ts     // 에이전트 상태 (목록, 활성, 상태)
├── useTeamStore.ts      // 팀 상태 (멤버, 태스크)
├── useWidgetStore.ts    // 위젯 상태 (위치, 크기, 가시성)
├── useSettingsStore.ts  // 설정 (API키, 테마, 언어)
└── useSocketStore.ts    // 소켓 연결 상태
```

### 3. Backend Layer (Node.js + Fastify)

> `packages/server`에는 현재 디렉터리 골격만 존재하며, 아래 모듈 구조는 구현 계획입니다.

### 모듈 구조

```
server/src/
├── index.ts                 # 서버 진입점 (Fastify 초기화)
├── routes/
│   ├── agent.routes.ts      # /api/agents
│   ├── team.routes.ts       # /api/teams
│   ├── task.routes.ts       # /api/tasks
│   └── auth.routes.ts       # /api/auth
├── services/
│   ├── agent/
│   │   ├── AgentManager.ts      # 에이전트 생명주기 (생성/삭제/조회)
│   │   ├── AgentOrchestrator.ts # 멀티 에이전트 태스크 분배
│   │   └── AgentWorker.ts       # 개별 에이전트 실행 단위
│   ├── llm/
│   │   ├── LLMProvider.ts       # 추상 프로바이더 인터페이스
│   │   ├── OpenAIProvider.ts    # OpenAI 구현
│   │   ├── ClaudeProvider.ts    # Anthropic 구현
│   │   └── GeminiProvider.ts    # Google 구현
│   └── team/
│       ├── TeamManager.ts       # 팀 관리
│       └── TaskAssigner.ts      # 태스크 자동 분배 로직
├── socket/
│   └── SocketHandler.ts     # WebSocket 이벤트 핸들러
├── models/
│   ├── agent.model.ts       # Agent 스키마
│   ├── team.model.ts        # Team 스키마
│   └── task.model.ts        # Task 스키마
└── config/
    └── index.ts             # 환경 설정
```

### 4. Shared Layer

```tsx
// shared/src/types/agent.ts
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  character: CharacterConfig;
  status: AgentStatus;
  currentTask: Task | null;
}

export type AgentRole =
  | "code-reviewer"
  | "doc-writer"
  | "tester"
  | "planner"
  | "designer"
  | "custom";

export type AgentStatus =
  | "idle"
  | "working"
  | "thinking"
  | "completed"
  | "error"
  | "chatting";

// shared/src/types/team.ts
export interface Team {
  id: string;
  name: string;
  agents: Agent[];
  tasks: Task[];
}
```

---

## 데이터 흐름 (목표 아키텍처)

> HTTP/Socket.IO 흐름은 서버 구현 후 적용됩니다. 현재 앱은 Electron IPC로만 통신합니다.

### 태스크 실행 흐름

```
사용자 입력
    │
    ▼
[Dashboard UI] ─── HTTP POST ──→ [API Route]
                                     │
                                     ▼
                              [AgentOrchestrator]
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                    [Agent 1]  [Agent 2]  [Agent 3]
                    (코드리뷰)  (문서작성)  (테스트)
                          │          │          │
                    LLM 호출    LLM 호출    LLM 호출
                          │          │          │
                          ▼          ▼          ▼
                    [결과 반환] ─── Socket.IO ──→ [Widget UI]
                                                     │
                                                     ▼
                                              캐릭터 상태 변경
                                              (working → completed)
```

### 실시간 통신 흐름

```
[Agent Worker]
    │ 상태 변경/로그 발생
    ▼
[Socket Handler] ──emit──→ [Socket.IO Client]
                              │
                           ┌──┼──┐
                           ▼     ▼
                    [Widget View]  [Dashboard]
                    캐릭터 애니메이션  로그/상태 UI
                    상태 변경        업데이트
```

---

## 위젯 시스템

### 위젯 윈도우 특성

| 속성 | 값 | 설명 |
| --- | --- | --- |
| transparent | `true` | 배경 투명 (캐릭터만 표시) |
| frame | `false` | 타이틀바 없음 |
| alwaysOnTop | `true` | 항상 최상위 표시 |
| skipTaskbar | `true` | 작업표시줄에 미표시 |
| resizable | `false` | 크기 고정 |
| movable | `true` | 드래그로 위치 이동 |

### 캐릭터 렌더링 파이프라인

```
캐릭터 이미지 (사용자 제공)
    │
    ▼
[캐릭터 프리셋 정의] ← 각 상태별 이미지/애니메이션 매핑
    │
    ├── idle.json      (Lottie 애니메이션)
    ├── working.json
    ├── thinking.json
    ├── completed.json
    └── error.json
    │
    ▼
[AgentCharacter 컴포넌트]
    │
    ├── Lottie Player (기본 애니메이션)
    └── PixiJS Layer  (파티클/이펙트 오버레이)
    │
    ▼
[투명 윈도우에 렌더링]
```

---

## AI Agent 시스템

### 에이전트 생명주기

```
                ┌─────────┐
                │ Created │
                └────┬────┘
                     │ initialize()
                     ▼
    ┌──────── ┌──────┐ ────────┐
    │         │ Idle │         │
    │         └──┬───┘         │
    │            │ assignTask()│
    │            ▼             │
    │      ┌──────────┐       │
    │      │ Thinking │       │
    │      └────┬─────┘       │
    │           │ LLM응답     │
    │           ▼             │
    │      ┌──────────┐       │
    │      │ Working  │──┐    │
    │      └────┬─────┘  │    │
    │           │완료     │에러│
    │           ▼        ▼    │
    │    ┌───────────┐ ┌─────┐│
    │    │ Completed │ │Error││
    │    └─────┬─────┘ └──┬──┘│
    │          │          │   │
    └──────────┴──────────┘   │
               │ destroy()    │
               ▼              │
         ┌───────────┐       │
         │ Destroyed │◄──────┘
         └───────────┘
```

### 멀티 에이전트 오케스트레이션

```tsx
// 태스크 분배 전략
interface OrchestrationStrategy {
  // 순차 실행: Agent 1 → Agent 2 → Agent 3
  sequential: (task: Task, agents: Agent[]) => Promise<Result>;

  // 병렬 실행: 모든 Agent가 동시 작업
  parallel: (task: Task, agents: Agent[]) => Promise<Result[]>;

  // 파이프라인: Agent 1 결과 → Agent 2 입력 → Agent 3 입력
  pipeline: (task: Task, agents: Agent[]) => Promise<Result>;

  // 토론: Agent들이 결과를 교차 검증
  debate: (task: Task, agents: Agent[]) => Promise<Result>;
}
```

---

## 팀 협업 시스템

### 팀 구조

```
Team
├── TeamManager (팀 전체 관리)
│   ├── 팀 생성/삭제
│   ├── 멤버(에이전트) 추가/제거
│   └── 팀 설정 관리
├── TaskAssigner (태스크 분배)
│   ├── 에이전트 역할 기반 자동 분배
│   ├── 우선순위 큐 관리
│   └── 부하 분산
└── MessageBus (에이전트 간 통신)
    ├── 에이전트 → 에이전트 메시지
    ├── 브로드캐스트 (전체 알림)
    └── 결과 공유
```

---

## 보안 및 인증 (목표 아키텍처)

### API Key 관리

- **로컬 저장**: OS keychain (macOS Keychain / Windows Credential Manager) 활용
- **서버 전송**: HTTPS + Bearer Token
- **암호화**: AES-256으로 로컬 설정 파일 암호화

### 인증 흐름

```
[사용자] → [로컬 앱] → [서버 API]
              │              │
              │  API Key     │ JWT Token
              │ (로컬 저장)  │ (세션 관리)
              ▼              ▼
        OS Keychain      PostgreSQL
```

---

## 확장 포인트

### 플러그인 시스템 (향후)

```tsx
interface KAFIPlugin {
  name: string;
  version: string;

  // 커스텀 에이전트 역할 추가
  registerAgentRole?: (registry: RoleRegistry) => void;

  // 커스텀 LLM 프로바이더 추가
  registerLLMProvider?: (registry: ProviderRegistry) => void;

  // 커스텀 위젯 컴포넌트 추가
  registerWidget?: (registry: WidgetRegistry) => void;
}
```
