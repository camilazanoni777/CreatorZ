import type {
  DailyCategory,
  DailyEntry,
  DailyHabit,
  DailyPriority,
  ExtraTask,
  Reflections,
  RhythmBlock,
  WeeklySummary,
} from "./daily-types";

export const categories: DailyCategory[] = [
  "Trabalho",
  "Estudos",
  "Saúde",
  "Casa",
  "Financeiro",
  "Relacionamentos",
  "Pessoal",
];

export const priorityLevels = ["Alta", "Média", "Baixa"] as const;
export const periods = ["Manhã", "Tarde", "Noite"] as const;

export const moodMessages: Record<string, string> = {
  Ansiosa: "Vamos diminuir o barulho e escolher só o próximo passo.",
  Feliz: "Que bom. Deixe essa leveza guiar as pequenas escolhas.",
  Confiante: "Use essa segurança para proteger o que importa.",
  Cansada: "Hoje o mínimo bem feito já conta como vitória.",
  Triste: "Vá com delicadeza. Um passo pequeno ainda é movimento.",
  Produtiva: "Aproveite o ritmo sem esquecer de respirar.",
  Irritada: "Antes de resolver tudo, tente baixar a temperatura do dia.",
  Sobrecarregada: "Você não precisa carregar o mundo em uma terça-feira.",
  Motivada: "Aproveita essa energia e protege suas prioridades.",
  "Sem energia": "Escolha uma versão leve do dia. Ela também conta.",
};

export const reorganizeOptions = {
  "Estou sem energia": [
    "Ativar modo dia leve",
    "Manter só 3 prioridades reais",
    "Sugerir uma pausa de 10 minutos antes de recomeçar",
  ],
  "Estou ansiosa": [
    "Diminuir tarefas abertas",
    "Transformar tarefas grandes em próximos passos pequenos",
    "Separar o que é urgente do que é só barulho",
  ],
  "Estou sobrecarregada": [
    "Adiar tarefas não urgentes",
    "Escolher um bloco de foco por vez",
    "Levar pendências extras para amanhã",
  ],
  "Estou procrastinando": [
    "Começar por uma ação de 5 minutos",
    "Quebrar a primeira prioridade em um passo visível",
    "Remover distrações por um bloco curto",
  ],
  "Meu dia saiu do controle": [
    "Replanejar o restante do dia em manhã, tarde e noite",
    "Salvar o essencial e soltar o que virou excesso",
    "Criar um fechamento gentil para não levar tudo para a cama",
  ],
};

export const defaultPriorities: DailyPriority[] = [
  { id: "priority-1", title: "", category: "Trabalho", level: "Alta", done: false },
  { id: "priority-2", title: "", category: "Pessoal", level: "Média", done: false },
  { id: "priority-3", title: "", category: "Saúde", level: "Baixa", done: false },
];

export const defaultRhythmBlocks: RhythmBlock[] = [
  { id: "rhythm-1", period: "Manhã", time: "09:00", title: "Começar pelo essencial", category: "Trabalho", done: false },
  { id: "rhythm-2", period: "Tarde", time: "15:00", title: "Revisar pendências", category: "Pessoal", done: false },
  { id: "rhythm-3", period: "Noite", time: "21:00", title: "Fechar o dia com calma", category: "Saúde", done: false },
];

export const defaultHabits: DailyHabit[] = [
  { id: "agua", title: "Beber água", icon: "droplets", visible: true, done: false },
  { id: "arrumar", title: "Tomar banho e me arrumar", icon: "sparkles", visible: true, done: false },
  { id: "refeicao", title: "Comer pelo menos uma refeição decente", icon: "utensils", visible: true, done: false },
  { id: "movimento", title: "Fazer algum movimento", icon: "activity", visible: true, done: false },
  { id: "foco", title: "Trabalhar/estudar com foco", icon: "target", visible: true, done: false },
  { id: "casa", title: "Cuidar da casa por alguns minutos", icon: "home", visible: true, done: false },
  { id: "amor", title: "Falar com alguém que eu amo", icon: "heart", visible: true, done: false },
  { id: "sono", title: "Dormir em um horário saudável", icon: "moon", visible: true, done: false },
];

export const defaultExtraTasks: ExtraTask[] = [];

export const defaultNightChecks: DailyHabit[] = [
  { id: "review", title: "Revisei minhas tarefas", icon: "check", visible: true, done: false },
  { id: "tomorrow", title: "Preparei o básico de amanhã", icon: "calendar", visible: true, done: false },
  { id: "space", title: "Separei roupa ou organizei meu espaço", icon: "home", visible: true, done: false },
  { id: "screen", title: "Fiquei alguns minutos sem tela", icon: "moon", visible: true, done: false },
  { id: "me", title: "Fiz algo por mim", icon: "heart", visible: true, done: false },
];

export const defaultReflections: Reflections = {
  victory: "",
  gratitude: "",
  learning: "",
  release: "",
  tomorrowPriority: "",
};

export const emptyWeeklySummary: WeeklySummary = {
  closedDays: 0,
  averageMood: "Ainda sem registros",
  consistentHabits: [],
  completedPriorities: 0,
  bestMoodDays: [],
};

export function createDefaultDaily(date: string): DailyEntry {
  return {
    date,
    mood_label: "",
    arrival_message: "",
    intention: "",
    good_day: "",
    day_mode: "",
    day_score: null,
    day_closed_at: null,
    water_count: 0,
    movement_note: "",
    worry_note: "",
    priorities: defaultPriorities,
    rhythm_blocks: defaultRhythmBlocks,
    habits_state: defaultHabits,
    extra_tasks: defaultExtraTasks,
    finance_logs: [],
    pause_actions: [],
    night_checks: defaultNightChecks,
    reflections: defaultReflections,
    important_events: [],
    weekly_summary: emptyWeeklySummary,
  };
}
