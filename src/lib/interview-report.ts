import type { Interview, InterviewMessage } from "@/types";

export type InterviewType = "behavioral" | "technical" | "general";

export interface InterviewMetrics {
  overallScore: number;
  wordsPerMinute: number;
  fillerWords: number;
  pauses: number;
  durationSeconds: number;
  eyeContactPercent?: number;
  postureScore?: number;
}

export interface InterviewQuestionReport {
  question: InterviewMessage;
  answer: InterviewMessage;
  score: number;
  rubric: { label: string; score: number }[];
  weakArea: string;
}

export interface InterviewReportData {
  interviewId: number;
  jobId: string;
  interviewType: InterviewType;
  metrics: InterviewMetrics;
  weakAreas: { label: string; score: number }[];
}

const STORAGE_PREFIX = "genuis:interview-report:";
const FILLERS = /\b(um+|uh+|erm+|like|you know|actually|basically|literally)\b/gi;
const STAR_MARKERS = /\b(situation|context|task|challenge|action|result|outcome|impact)\b/gi;
const CONCRETE_MARKERS = /\b(increased|reduced|improved|built|created|led|delivered|launched|saved|grew|%|\d+)\b/gi;

const words = (value: string) => value.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
const countMatches = (value: string, expression: RegExp) => value.match(expression)?.length ?? 0;
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
export const isInterviewSetupMessage = (message: InterviewMessage) =>
  message.role === "user" && message.content.startsWith("Hello, I'm ready to begin a ");

export function getInterviewQuestions(messages: InterviewMessage[]): InterviewQuestionReport[] {
  const ordered = [...messages].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const reports: InterviewQuestionReport[] = [];
  let pendingQuestion: InterviewMessage | undefined;

  for (const message of ordered) {
    if (isInterviewSetupMessage(message)) continue;
    if (message.role === "assistant") {
      pendingQuestion = message;
      continue;
    }
    if (!pendingQuestion) continue;

    const answerText = message.transcript?.trim() || message.content;
    const answerWords = words(answerText);
    const answerLower = answerText.toLowerCase();
    const questionTerms = words(pendingQuestion.content.toLowerCase())
      .filter((term) => term.length > 4 && !["about", "there", "which", "would", "could", "should"].includes(term));
    const relevanceHits = questionTerms.filter((term) => answerLower.includes(term)).length;
    const relevance = clamp(58 + Math.min(32, relevanceHits * 8) + (answerWords.length >= 35 ? 10 : 0));
    const starCount = countMatches(answerText, STAR_MARKERS);
    const structure = clamp(45 + starCount * 11 + (answerWords.length >= 45 ? 10 : 0));
    const evidenceCount = countMatches(answerText, CONCRETE_MARKERS);
    const evidence = clamp(48 + evidenceCount * 13 + (answerWords.length >= 35 ? 8 : 0));
    const concision = clamp(answerWords.length === 0 ? 0 : answerWords.length < 20 ? 45 : answerWords.length <= 130 ? 88 : Math.max(45, 88 - (answerWords.length - 130) * 0.35));
    const rubric = [
      { label: "Relevance", score: relevance },
      { label: "Structure", score: structure },
      { label: "Specific evidence", score: evidence },
      { label: "Concision", score: concision },
    ];
    const weakRubric = rubric.reduce((weakest, current) => current.score < weakest.score ? current : weakest);
    reports.push({ question: pendingQuestion, answer: message, score: clamp(rubric.reduce((sum, item) => sum + item.score, 0) / rubric.length), rubric, weakArea: weakRubric.label });
    pendingQuestion = undefined;
  }
  return reports;
}

export function calculateInterviewMetrics(
  messages: InterviewMessage[],
  durationSeconds: number,
  presence?: Pick<InterviewMetrics, "eyeContactPercent" | "postureScore">,
): InterviewMetrics {
  const ordered = [...messages].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const userMessages = ordered.filter((message) => message.role === "user" && !isInterviewSetupMessage(message));
  const userText = userMessages.map((message) => message.transcript?.trim() || message.content).join(" ");
  const totalWords = words(userText).length;
  const minutes = Math.max(durationSeconds / 60, 1 / 60);
  let pauses = 0;
  for (const message of userMessages) {
    const previousAssistant = [...ordered].reverse().find((item) => item.role === "assistant" && Date.parse(item.created_at) <= Date.parse(message.created_at));
    if (previousAssistant && Date.parse(message.created_at) - Date.parse(previousAssistant.created_at) >= 3000) pauses += 1;
  }
  const metrics: InterviewMetrics = {
    overallScore: scoreInterview(messages),
    wordsPerMinute: Math.round(totalWords / minutes),
    fillerWords: countMatches(userText, FILLERS),
    pauses,
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
  };
  if (typeof presence?.eyeContactPercent === "number") metrics.eyeContactPercent = clamp(presence.eyeContactPercent);
  if (typeof presence?.postureScore === "number") metrics.postureScore = clamp(presence.postureScore);
  return metrics;
}

export function buildInterviewReport(
  interview: Interview,
  messages: InterviewMessage[],
  metrics: InterviewMetrics,
  interviewType: InterviewType,
): InterviewReportData {
  return { interviewId: interview.id, jobId: interview.job_id, interviewType, metrics, weakAreas: getWeakAreas(messages) };
}

export function saveInterviewReport(report: InterviewReportData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${report.interviewId}`, JSON.stringify(report));
    window.dispatchEvent(new CustomEvent("genuis:interview-report-updated", { detail: report.interviewId }));
  } catch {
    // Reports remain available from the interview transcript if browser storage is disabled.
  }
}

export function loadInterviewReport(interviewId: number): InterviewReportData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${interviewId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const report = parsed as InterviewReportData;
    if (report.interviewId !== interviewId || !report.metrics || !["behavioral", "technical", "general"].includes(report.interviewType)) return null;
    const numericValues = Object.values(report.metrics).filter((value) => value !== undefined);
    if (!numericValues.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
    return report;
  } catch {
    return null;
  }
}

export function scoreInterview(messages: InterviewMessage[]) {
  const questions = getInterviewQuestions(messages);
  return questions.length ? clamp(questions.reduce((sum, question) => sum + question.score, 0) / questions.length) : 0;
}

export function getWeakAreas(messages: InterviewMessage[]) {
  const totals = new Map<string, { score: number; count: number }>();
  for (const question of getInterviewQuestions(messages)) {
    const current = totals.get(question.weakArea) ?? { score: 0, count: 0 };
    current.score += question.rubric.find((item) => item.label === question.weakArea)?.score ?? question.score;
    current.count += 1;
    totals.set(question.weakArea, current);
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, score: Math.round(value.score / value.count) }))
    .sort((a, b) => a.score - b.score);
}
