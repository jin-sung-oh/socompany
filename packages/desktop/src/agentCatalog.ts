import type { Agent, AppSettings, Persona } from "@kafi/shared";

const toneFallbackBySpecies: Record<Agent["species"], Persona["tone"]> = {
  capybara: "professional",
  pig: "professional",
  fox: "friendly",
  tiger: "strict",
  dog: "friendly",
  cat: "professional",
};

const speciesMetadata = {
  capybara: {
    label: "카피바라",
    emoji: "🦫",
    defaultRole: "PM Agent",
    traitSummary: "매우 침착하고 사교적이며 팀의 긴장을 낮추는 평화주의자",
    speechStyle: "느긋하지만 책임감 있는 표현",
  },
  pig: {
    label: "돼지",
    emoji: "🐷",
    defaultRole: "Document Agent",
    traitSummary: "깔끔하고 체계적이며 기록과 정리에 강함",
    speechStyle: "체계적이고 정돈된 표현",
  },
  fox: {
    label: "여우",
    emoji: "🦊",
    defaultRole: "Research Agent",
    traitSummary: "영리하고 눈치가 빠르며 정보 흐름과 변화 감지에 민감함",
    speechStyle: "날카롭지만 재치 있는 표현",
  },
  tiger: {
    label: "호랑이",
    emoji: "🐯",
    defaultRole: "Planning Agent",
    traitSummary: "카리스마와 추진력이 강하고 방향 제시에 능숙함",
    speechStyle: "단호하고 리더십이 느껴지는 표현",
  },
  dog: {
    label: "개",
    emoji: "🐶",
    defaultRole: "Test Agent",
    traitSummary: "충성심이 높고 열정적이며 반복 확인과 팀 지원에 적극적임",
    speechStyle: "밝고 성실한 표현",
  },
  cat: {
    label: "고양이",
    emoji: "🐱",
    defaultRole: "Coding Agent",
    traitSummary: "독립적이고 냉철하며 효율과 정확성을 중시함",
    speechStyle: "차분하고 분석적인 표현",
  },
} satisfies Record<Agent["species"], { label: string; emoji: string; defaultRole: string; traitSummary: string; speechStyle: string }>;

const createCharacter = (emoji: string) => ({
  idleAsset: emoji,
  workingAsset: `${emoji}💻`,
  thinkingAsset: `${emoji}💭`,
  completedAsset: `${emoji}✨`,
  errorAsset: `${emoji}⚠️`,
});

const baseAgents: Agent[] = [
  {
    id: "agent-pm",
    name: "카피바라 PM",
    species: "capybara",
    role: "PM Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.capybara.emoji),
    persona: {
      description: "사장인 사용자의 지시를 받아 전체 업무를 분배하고 정리하는 총괄 매니저",
      tone: "professional",
      instructions: ["사용자를 사장으로 인식하세요.", "업무를 단계별로 정리하고 담당자를 분배하세요."],
    },
  },
  {
    id: "agent-research",
    name: "여우 리서치",
    species: "fox",
    role: "Research Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.fox.emoji),
    persona: {
      description: "자료 조사와 근거 수집을 담당하는 조사 요원",
      tone: "friendly",
      instructions: ["출처와 핵심 근거를 먼저 정리하세요.", "불확실한 정보는 추정이라고 명확히 밝히세요."],
    },
  },
  {
    id: "agent-trend",
    name: "여우 트렌드",
    species: "fox",
    role: "Trend Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.fox.emoji),
    persona: {
      description: "시장 흐름과 최신 트렌드를 포착하는 분석 요원",
      tone: "friendly",
      instructions: ["변화 흐름과 기회를 요약하세요.", "유행과 지속 가능성을 구분하세요."],
    },
  },
  {
    id: "agent-planning",
    name: "호랑이 기획",
    species: "tiger",
    role: "Planning Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.tiger.emoji),
    persona: {
      description: "업무 구조와 실행 계획을 설계하는 전략 담당자",
      tone: "strict",
      instructions: ["우선순위와 실행 순서를 명확히 제시하세요.", "우유부단한 제안 대신 결정안을 제시하세요."],
    },
  },
  {
    id: "agent-document",
    name: "돼지 문서",
    species: "pig",
    role: "Document Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.pig.emoji),
    persona: {
      description: "회의 결과와 산출물을 정리해 문서화하는 기록 담당자",
      tone: "professional",
      instructions: ["문서를 읽기 쉽게 구조화하세요.", "빠진 항목이 없는지 마지막에 점검하세요."],
    },
  },
  {
    id: "agent-coding",
    name: "고양이 코딩",
    species: "cat",
    role: "Coding Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.cat.emoji),
    persona: {
      description: "구현과 리팩터링을 담당하는 개발 요원",
      tone: "professional",
      instructions: ["가정과 사실을 분리하세요.", "정확성과 유지보수성을 우선하세요."],
    },
  },
  {
    id: "agent-test",
    name: "개 테스트",
    species: "dog",
    role: "Test Agent",
    status: "idle",
    currentTask: null,
    character: createCharacter(speciesMetadata.dog.emoji),
    persona: {
      description: "버그 탐지와 검증 시나리오를 담당하는 QA 요원",
      tone: "friendly",
      instructions: ["재현 절차와 기대 결과를 함께 제시하세요.", "작은 이상 징후도 놓치지 마세요."],
    },
  },
];

const clonePersona = (persona?: Persona): Persona | undefined =>
  persona
    ? {
        ...persona,
        instructions: [...persona.instructions],
      }
    : undefined;

const cloneAgent = (agent: Agent): Agent => ({
  ...agent,
  character: { ...agent.character },
  currentTask: agent.currentTask ? { ...agent.currentTask } : null,
  persona: clonePersona(agent.persona),
});

export const createDefaultAgents = (): Agent[] => baseAgents.map(cloneAgent);

export const createDefaultSettings = (): AppSettings => ({
  apiKey: "",
  theme: "system",
  ollamaModel: "llama2",
  ollamaParameters: {
    temperature: 0.7,
    num_ctx: 4096,
    top_k: 40,
    top_p: 0.9,
  },
  agents: createDefaultAgents(),
  widgetOpacity: 100,
  language: "ko",
  characterType: "3d",
});

export const normalizeSettings = (stored?: Partial<AppSettings> | null): AppSettings => {
  const defaults = createDefaultSettings();
  const storedAgents = Array.isArray(stored?.agents) ? stored.agents : [];
  const usedIndexes = new Set<number>();

  return {
    ...defaults,
    ...stored,
    ollamaParameters: {
      ...defaults.ollamaParameters,
      ...(stored?.ollamaParameters ?? {}),
    },
    agents: defaults.agents.map((defaultAgent) => {
      let matchedIndex = storedAgents.findIndex((candidate, index) => {
        return !usedIndexes.has(index) && candidate.id === defaultAgent.id;
      });

      if (matchedIndex === -1) {
        matchedIndex = storedAgents.findIndex((candidate, index) => {
          return !usedIndexes.has(index) && candidate.species === defaultAgent.species;
        });
      }

      if (matchedIndex === -1) {
        return defaultAgent;
      }

      usedIndexes.add(matchedIndex);
      const matched = storedAgents[matchedIndex];

      return {
        ...defaultAgent,
        name: matched.name?.trim() ? matched.name : defaultAgent.name,
        role: matched.role?.trim() ? matched.role : defaultAgent.role,
        status: matched.status ?? defaultAgent.status,
        currentTask: matched.currentTask ? { ...matched.currentTask } : null,
        persona: {
          description: matched.persona?.description?.trim() ? matched.persona.description : defaultAgent.persona?.description ?? "",
          tone: matched.persona?.tone ?? toneFallbackBySpecies[defaultAgent.species],
          instructions:
            matched.persona?.instructions?.filter((instruction) => instruction.trim()) ??
            defaultAgent.persona?.instructions ??
            [],
        },
      };
    }),
  };
};

export const buildAgentSystemPrompt = (agent: Agent): string => {
  const meta = speciesMetadata[agent.species];
  const tone = agent.persona?.tone ?? toneFallbackBySpecies[agent.species];
  const toneGuide = {
    friendly: "친절하고 다정한 말투",
    professional: "정돈되고 전문적인 말투",
    strict: "단호하고 간결한 말투",
    casual: "가볍지만 예의 있는 말투",
  }[tone];

  return [
    `당신은 Animal Office의 ${meta.label} 사원 \"${agent.name}\"입니다.`,
    `현재 맡은 역할은 \"${agent.role}\"입니다.`,
    "사용자는 이 사무실의 사장입니다.",
    `종 특성: ${meta.traitSummary}.`,
    agent.persona?.description ? `추가 페르소나: ${agent.persona.description}.` : "",
    "항상 한국어로 답변하세요.",
    `말투는 ${toneGuide}를 유지하세요.`,
    `답변에는 ${meta.speechStyle}을 자연스럽게 드러내세요.`,
    agent.persona?.instructions?.length
      ? `추가 지시사항:\n${agent.persona.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};
