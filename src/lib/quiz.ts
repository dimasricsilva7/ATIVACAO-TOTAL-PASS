/**
 * Estrutura e textos do quiz. Centralizados aqui para que a cópia seja fácil de
 * ajustar e para que cliente e servidor validem exatamente as mesmas opções.
 *
 * A taxa é descrita como taxa de ATIVAÇÃO do serviço (inclusão de 1 CPF no programa
 * de benefícios TotalPass), não como taxa oficial cobrada pela TotalPass.
 */

export type QuizQuestion = {
  id: "objetivo" | "acessoAtual" | "preferenciaTreino" | "respostaTaxa";
  titulo: string;
  texto?: string;
  options: { value: string; label: string }[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "objetivo",
    titulo: "Qual é o seu objetivo?",
    options: [
      { value: "treino_mais_opcoes", label: "Já treino e quero conhecer mais opções de academias." },
      { value: "comecar_treinar", label: "Quero começar a treinar." },
      { value: "saude_bem_estar", label: "Quero cuidar mais da minha saúde e bem-estar." },
    ],
  },
  {
    id: "acessoAtual",
    titulo: "Você já tem acesso ao TotalPass?",
    options: [
      { value: "sem_acesso", label: "Não tenho acesso ao benefício e quero conhecer uma forma de solicitar." },
      { value: "com_acesso", label: "Já tenho acesso ao benefício." },
    ],
  },
  {
    id: "preferenciaTreino",
    titulo: "Onde você quer treinar?",
    options: [
      { value: "perto_casa", label: "Perto de casa." },
      { value: "perto_trabalho", label: "Perto do trabalho ou estudo." },
      { value: "varias_regioes", label: "Quero ter opções em várias academias e regiões." },
    ],
  },
  {
    id: "respostaTaxa",
    titulo: "Pronto para ativar seu acesso?",
    texto:
      "A ativação para incluir 1 CPF nos benefícios TotalPass tem taxa única de {FEE}. Veja o que está incluído e dê o próximo passo.",
    options: [
      { value: "ciente", label: "Quero ativar meu acesso agora." },
      { value: "duvidas", label: "Quero tirar algumas dúvidas antes." },
    ],
  },
];

export const QUESTION_IDS = QUIZ_QUESTIONS.map((q) => q.id);

/** Rótulo legível de uma resposta, para exibir no admin. */
export function labelFor(questionId: string, value: string | null | undefined): string {
  if (!value) return "—";
  const q = QUIZ_QUESTIONS.find((x) => x.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/** Valida se um valor pertence às opções da pergunta. */
export function isValidAnswer(questionId: string, value: string): boolean {
  const q = QUIZ_QUESTIONS.find((x) => x.id === questionId);
  return Boolean(q?.options.some((o) => o.value === value));
}
