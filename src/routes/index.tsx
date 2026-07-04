import { createFileRoute } from "@tanstack/react-router";
import {
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hivo Studio" },
      { name: "description", content: "Hivo Studio team tasks and idea review board." },
    ],
    links: [
      { rel: "icon", type: "image/png", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
      { rel: "shortcut icon", type: "image/png", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
      { rel: "apple-touch-icon", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
    ],
  }),
});

type Member = {
  id: string;
  name: string;
  aliases: string[];
  hidden?: boolean;
  baseCompleted?: number;
  baseApproved?: number;
  baseRejected?: number;
  basePoints?: number;
  adminNote?: string;
  publicFlag?: string;
  repoUrl?: string;
  driveUrl?: string;
};

type StudioTask = {
  id: string;
  title: string;
  question: string;
  points: number;
  taskType?: TaskType | "task";
  scope: "all" | "member";
  memberId?: string;
  memberIds?: string[];
  createdAt: string;
  startAt?: string;
  deadlineAt?: string;
  status?: "active" | "hidden" | "archived";
};

type TaskType = "technical" | "nonTechnical" | "problem";

type TaskResponse = {
  memberId: string;
  memberName: string;
  answer: string;
  status: "submitted" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  awardedPoints?: number;
  lateSubmission?: boolean;
  scoreOverride?: boolean;
  reviewEvents?: TaskReviewEvent[];
};

type TaskReviewEvent = {
  id: string;
  status: "approved" | "rejected";
  reviewedAt: string;
  note?: string;
  awardedPoints?: number;
  scoreOverride?: boolean;
};

type TaskSkip = {
  memberId: string;
  memberName: string;
  skippedAt: string;
  note?: string;
};

type TaskProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  note: string;
  createdAt: string;
};

type TaskAnnouncement = {
  id: string;
  taskId: string;
  message: string;
  createdAt: string;
};

type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  points: number;
  status?: "active" | "archived";
  createdAt: string;
};

type MeetingAttendance = {
  memberId: string;
  memberName: string;
  checkedAt: string;
  lateMinutes: number;
  score: number;
  manual?: boolean;
};

type InteractionTargetType = "task" | "taskUpdate" | "meeting";

type MemberInteraction = {
  id: string;
  memberId: string;
  targetType: InteractionTargetType;
  targetId: string;
  taskId?: string;
  seenAt: string;
};

type BonusGrade = {
  id: string;
  memberId: string;
  points: number;
  note: string;
  createdAt: string;
};

type StudioSettings = {
  adminPassword: string;
  statsPassword: string;
  backendUrl?: string;
};

type QueuedSubmission = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  answer: string;
  submittedAt: string;
};

type QueuedProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  note: string;
  createdAt: string;
};

type RepoAttentionRequest = {
  memberId: string;
  taskId?: string;
  excerpt?: string;
  note?: string;
  source?: RepoUpdate["source"];
};

type AdminQueue = {
  submissions: QueuedSubmission[];
  progressUpdates: QueuedProgressUpdate[];
};

type RepoUpdate = {
  id: string;
  memberId: string;
  createdAt: string;
  taskId?: string;
  source?: "submission" | "progress" | "manual" | "drive";
  excerpt?: string;
  note?: string;
  seen?: boolean;
};

type MemberProfileRequest = {
  id: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  nickname?: string;
  repoUrl?: string;
  driveUrl?: string;
  previousAliases?: string[];
  previousRepoUrl?: string;
  previousDriveUrl?: string;
  reviewedAt?: string;
};

type MemberProfileRequestInput = {
  memberId: string;
  nickname?: string;
  repoUrl?: string;
  driveUrl?: string;
};

type InteractionInput = {
  memberId: string;
  targetType: InteractionTargetType;
  targetId: string;
  taskId?: string;
};

type StudioData = {
  projectName: string;
  announcement?: string;
  settings?: StudioSettings;
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  taskSkips?: Record<string, Record<string, TaskSkip>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  taskUpdates?: Record<string, TaskAnnouncement[]>;
  meetings?: Meeting[];
  meetingAttendance?: Record<string, Record<string, MeetingAttendance>>;
  interactions?: MemberInteraction[];
  bonusGrades?: BonusGrade[];
  repoUpdates?: RepoUpdate[];
  profileRequests?: MemberProfileRequest[];
  meta: { updatedAt: string };
};

type ActiveMember = {
  member: Member;
  displayName: string;
};

type MemberScore = {
  member: Member;
  assignedTasks: number;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  reviewed: number;
  rejectionRate: number;
  baseCompleted: number;
  baseApproved: number;
  baseRejected: number;
  completed: number;
  taskPoints: number;
  basePoints: number;
  bonusPoints: number;
  bonusCount: number;
  meetingPoints: number;
  points: number;
  privateTasks: number;
  avgHours: number | null;
  avgFastHours: number | null;
  technicalTimingScore: number | null;
  responseRate: number;
  approvalRate: number;
  attendedMeetings: number;
  accountableMeetings: number;
  meetingAttendanceRate: number;
  avgMeetingLateMinutes: number | null;
  seenTargets: number;
  expectedSeenTargets: number;
  avgSeenHours: number | null;
  submissionScore: number;
  completionScore: number;
  qualityScore: number;
  timingScore: number;
  interactionScore: number;
  meetingScore: number;
  effortScore: number;
};

type TaskMetric = {
  task: StudioTask;
  received: number;
  expected: number;
  approved: number;
  rejected: number;
  submitted: number;
  progressUpdates: number;
};

type MeetingMetric = {
  meeting: Meeting;
  attended: number;
  expected: number;
  totalScore: number;
};

const DEFAULT_ADMIN_PASSWORD = "5678";
const DEFAULT_STATS_PASSWORD = "6789";
const ACTIVE_MEMBER_KEY = "hivo-studio-active-member";
const ACTIVE_DISPLAY_NAME_KEY = "hivo-studio-active-display-name";
const ADMIN_SESSION_KEY = "hivo-studio-admin";
const ADMIN_AUTH_KEY = "hivo-studio-admin-auth";
const STATS_SESSION_KEY = "hivo-studio-stats";
const GITHUB_TOKEN_KEY = "hivo-studio-github-token";
const REFRESHED_SESSION_KEY = "hivo-studio-refreshed-this-session";
const NICKNAME_HINT_KEY = "hivo-studio-nickname-hint";
const MEMBER_DRAFTS_KEY = "hivo-studio-member-drafts";
const MEMBER_SENT_STATE_KEY = "hivo-studio-member-sent-state";
const LOCAL_QUEUE_KEY = "hivo-studio-local-admin-queue";
const SEEN_MEETINGS_KEY = "hivo-studio-seen-meetings";
const SEEN_TASK_UPDATES_KEY = "hivo-studio-seen-task-updates";
const GITHUB_OWNER = "abdoabozena7";
const GITHUB_REPO = "Team-tasks";
const GITHUB_BRANCH = "main";
const GITHUB_DATA_PATHS = ["team-data.json", "public/team-data.json"];
const DEFAULT_HIVO_API_URL = "https://hivo-studio-api.boodyabozena.workers.dev";
const HIVO_API_URL = (import.meta.env.VITE_HIVO_API_URL || DEFAULT_HIVO_API_URL).replace(/\/+$/, "");
const HIVO_QUEUE_URL = `${HIVO_API_URL}/api`;

const DEFAULT_SETTINGS: StudioSettings = {
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  statsPassword: DEFAULT_STATS_PASSWORD,
  backendUrl: HIVO_QUEUE_URL,
};

const DEFAULT_DATA: StudioData = {
  projectName: "Hivo Studio",
  announcement: "",
  settings: DEFAULT_SETTINGS,
  members: [],
  tasks: [],
  responses: {},
  taskSkips: {},
  progressUpdates: {},
  taskUpdates: {},
  meetings: [],
  meetingAttendance: {},
  interactions: [],
  bonusGrades: [],
  repoUpdates: [],
  profileRequests: [],
  meta: { updatedAt: new Date().toISOString() },
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function seenMeetingsStorageKey(memberId: string) {
  return `${SEEN_MEETINGS_KEY}:${memberId}`;
}

function readSeenMeetingIds(memberId: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seenMeetingsStorageKey(memberId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeSeenMeetingIds(memberId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seenMeetingsStorageKey(memberId), JSON.stringify(uniqueText(ids)));
}

function seenTaskUpdatesStorageKey(memberId: string) {
  return `${SEEN_TASK_UPDATES_KEY}:${memberId}`;
}

function readSeenTaskUpdateIds(memberId: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seenTaskUpdatesStorageKey(memberId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeSeenTaskUpdateIds(memberId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seenTaskUpdatesStorageKey(memberId), JSON.stringify(uniqueText(ids)));
}

function isStatsLoginName(value: string) {
  const normalized = normalizeName(value);
  const lowered = value.trim().toLowerCase();
  return lowered.includes("soha") || normalized.includes(normalizeName("سهي"));
}

function findMemberByName(name: string, members: Member[]) {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  return members.find((member) =>
    [member.name, ...member.aliases].some((alias) => normalizeName(alias) === normalized),
  );
}

function sanitizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : 0;
}

function sanitizePositiveNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function meetingStatus(meeting: Meeting) {
  return meeting.status === "archived" ? "archived" : "active";
}

function isActiveMeeting(meeting: Meeting) {
  return meetingStatus(meeting) === "active";
}

type MeetingPhase = "upcoming" | "live" | "ended" | "invalid";

function meetingWindow(meeting: Meeting) {
  const startMs = new Date(meeting.startsAt).getTime();
  const durationMinutes = Math.max(1, sanitizeNumber(meeting.durationMinutes) || 60);
  if (!Number.isFinite(startMs)) return null;
  return {
    startMs,
    endMs: startMs + durationMinutes * 60000,
    durationMinutes,
  };
}

function meetingPhase(meeting: Meeting, now = new Date()): MeetingPhase {
  const timeWindow = meetingWindow(meeting);
  if (!timeWindow) return "invalid";
  const nowTime = now.getTime();
  if (nowTime < timeWindow.startMs) return "upcoming";
  if (nowTime <= timeWindow.endMs) return "live";
  return "ended";
}

function canRecordMeetingAttendance(meeting: Meeting, now = new Date()) {
  const phase = meetingPhase(meeting, now);
  return phase === "live" || phase === "ended";
}

function meetingPhaseLabel(phase: MeetingPhase) {
  if (phase === "upcoming") return "Upcoming";
  if (phase === "live") return "Live now";
  if (phase === "ended") return "Ended";
  return "Time missing";
}

function meetingPhaseTone(phase: MeetingPhase) {
  if (phase === "upcoming") return "border-sky-200 bg-sky-50 text-sky-800";
  if (phase === "live") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (phase === "ended") return "border-zinc-200 bg-zinc-50 text-zinc-600";
  return "border-red-200 bg-red-50 text-red-700";
}

function memberVisibleMeetings(meetings: Meeting[], now = new Date()) {
  const nowTime = now.getTime();
  return meetings
    .filter((meeting) => isActiveMeeting(meeting))
    .filter((meeting) => {
      const timeWindow = meetingWindow(meeting);
      return Boolean(timeWindow && nowTime <= timeWindow.endMs);
    })
    .sort((a, b) => (meetingWindow(a)?.startMs ?? 0) - (meetingWindow(b)?.startMs ?? 0));
}

function normalizedTaskType(task: Pick<StudioTask, "taskType" | "points">): TaskType {
  if (task.taskType === "problem") return "problem";
  if (task.taskType === "technical") return "technical";
  if (task.taskType === "nonTechnical") return "nonTechnical";
  return Number(task.points) === 5 ? "technical" : "nonTechnical";
}

function taskTypeLabel(task: Pick<StudioTask, "taskType" | "points">) {
  const type = normalizedTaskType(task);
  return taskTypeOptionLabel(type);
}

function taskTypeOptionLabel(type: TaskType) {
  if (type === "problem") return "Problem";
  if (type === "technical") return "Technical";
  return "Non-technical";
}

function sanitizeData(data: StudioData): StudioData {
  const tasks: StudioTask[] = (data.tasks ?? []).map((task) => {
    const points = sanitizeNumber(task.points) || 1;
    const taskType = normalizedTaskType({ ...task, points });
    return {
      ...task,
      points,
      taskType,
      scope: task.scope === "member" ? "member" : "all",
      memberId:
        task.scope === "member"
          ? task.memberId ?? uniqueText(task.memberIds ?? [])[0]
          : undefined,
      memberIds:
        task.scope === "member"
          ? uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []))
          : [],
      startAt: task.startAt ?? task.createdAt,
      deadlineAt: taskType === "technical" ? "" : task.deadlineAt ?? "",
      status: task.status === "archived" ? "archived" : task.status === "hidden" ? "hidden" : "active",
    };
  });
  const taskIds = new Set(tasks.map((task) => task.id));
  const meetings: Meeting[] = (data.meetings ?? []).map((meeting) => ({
    ...meeting,
    title: meeting.title || "Meeting",
    startsAt: meeting.startsAt || meeting.createdAt || new Date().toISOString(),
    durationMinutes: sanitizeNumber(meeting.durationMinutes) || 60,
    points: sanitizePositiveNumber(meeting.points, 1),
    status: meeting.status === "archived" ? "archived" : "active",
    createdAt: meeting.createdAt || new Date().toISOString(),
  }));
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));
  const memberIds = new Set((data.members ?? []).map((member) => member.id));
  const interactionKeys = new Set<string>();

  return {
    ...DEFAULT_DATA,
    ...data,
    announcement: data.announcement ?? "",
    settings: {
      adminPassword: data.settings?.adminPassword || DEFAULT_ADMIN_PASSWORD,
      statsPassword: data.settings?.statsPassword || DEFAULT_STATS_PASSWORD,
      backendUrl: data.settings?.backendUrl || HIVO_QUEUE_URL,
    },
    members: (data.members ?? []).map((member) => ({
      ...member,
      aliases: uniqueText(member.aliases ?? []),
      hidden: Boolean(member.hidden),
      baseCompleted: sanitizeNumber(member.baseCompleted),
      baseApproved: sanitizeNumber(member.baseApproved),
      baseRejected: sanitizeNumber(member.baseRejected),
      basePoints: sanitizeNumber(member.basePoints),
      adminNote: member.adminNote ?? "",
      publicFlag: member.publicFlag ?? "",
      repoUrl: member.repoUrl ?? "",
      driveUrl: member.driveUrl ?? "",
    })),
    tasks,
    responses: data.responses ?? {},
    taskSkips: data.taskSkips ?? {},
    progressUpdates: data.progressUpdates ?? {},
    taskUpdates: Object.fromEntries(
      Object.entries(data.taskUpdates ?? {})
        .filter(([taskId]) => taskIds.has(taskId))
        .map(([taskId, updates]) => [
          taskId,
          updates
            .filter((update) => update.message?.trim())
            .map((update) => ({
              ...update,
              taskId,
              message: update.message.trim(),
              createdAt: update.createdAt || new Date().toISOString(),
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        ]),
    ),
    meetings,
    meetingAttendance: Object.fromEntries(
      Object.entries(data.meetingAttendance ?? {}).filter(([meetingId]) => meetingIds.has(meetingId)),
    ),
    interactions: (data.interactions ?? [])
      .filter((interaction) => {
        if (!memberIds.has(interaction.memberId)) return false;
        if (!["task", "taskUpdate", "meeting"].includes(interaction.targetType)) return false;
        if (!interaction.targetId || !interaction.seenAt) return false;
        if (interaction.targetType === "task" && !taskIds.has(interaction.targetId)) return false;
        if (interaction.targetType === "taskUpdate" && (!interaction.taskId || !taskIds.has(interaction.taskId))) return false;
        if (interaction.targetType === "meeting" && !meetingIds.has(interaction.targetId)) return false;
        const key = interactionKey(interaction.memberId, interaction.targetType, interaction.targetId);
        if (interactionKeys.has(key)) return false;
        interactionKeys.add(key);
        return true;
      })
      .map((interaction) => ({
        ...interaction,
        id:
          interaction.id ||
          interactionKey(interaction.memberId, interaction.targetType, interaction.targetId),
        taskId: interaction.taskId || undefined,
      }))
      .sort((a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime()),
    bonusGrades: (data.bonusGrades ?? [])
      .filter((bonus) => memberIds.has(bonus.memberId) && String(bonus.note ?? "").trim())
      .map((bonus) => ({
        id: bonus.id || `bonus-${bonus.memberId}-${bonus.createdAt || Date.now()}`,
        memberId: bonus.memberId,
        points: sanitizeNumber(bonus.points),
        note: String(bonus.note ?? "").trim(),
        createdAt: bonus.createdAt || new Date().toISOString(),
      }))
      .filter((bonus) => bonus.points !== 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    repoUpdates: (data.repoUpdates ?? []).filter(
      (update) => !update.taskId || taskIds.has(update.taskId),
    ),
    profileRequests: data.profileRequests ?? [],
    meta: data.meta ?? DEFAULT_DATA.meta,
  };
}

function interactionKey(memberId: string, targetType: InteractionTargetType, targetId: string) {
  return `${memberId}:${targetType}:${targetId}`;
}

function isProblemTask(task: StudioTask) {
  return normalizedTaskType(task) === "problem";
}

function isTechnicalTask(task: StudioTask) {
  return normalizedTaskType(task) === "technical";
}

function taskDeadlineLabel(task: StudioTask) {
  return isTechnicalTask(task) ? "No deadline" : formatDateTime(task.deadlineAt);
}

function privateTaskMemberId(task: StudioTask) {
  if (task.scope !== "member") return null;
  const memberIds = uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []));
  return memberIds.length === 1 ? memberIds[0] : null;
}

function taskIsForMember(task: StudioTask, memberId: string) {
  if (task.scope === "all") return true;
  const memberIds = task.memberIds?.length ? task.memberIds : task.memberId ? [task.memberId] : [];
  return memberIds.includes(memberId);
}

function taskStatus(task: StudioTask) {
  return task.status === "archived" ? "archived" : task.status === "hidden" ? "hidden" : "active";
}

function isActiveTask(task: StudioTask) {
  return taskStatus(task) === "active";
}

function isHiddenTask(task: StudioTask) {
  return taskStatus(task) === "hidden";
}

function responseKey(taskId: string, memberId: string) {
  return `${taskId}:${memberId}`;
}

function progressKey(taskId: string, memberId: string) {
  return `progress:${taskId}:${memberId}`;
}

function readMemberDrafts() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(MEMBER_DRAFTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMemberDrafts(drafts: Record<string, string>) {
  window.localStorage.setItem(MEMBER_DRAFTS_KEY, JSON.stringify(drafts));
}

function readMemberSentState() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(MEMBER_SENT_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMemberSentState(state: Record<string, string>) {
  window.localStorage.setItem(MEMBER_SENT_STATE_KEY, JSON.stringify(state));
}

function emptyQueue(): AdminQueue {
  return { submissions: [], progressUpdates: [] };
}

function readLocalQueue() {
  if (typeof window === "undefined") return emptyQueue();

  try {
    const raw = window.localStorage.getItem(LOCAL_QUEUE_KEY);
    if (!raw) return emptyQueue();
    const parsed = JSON.parse(raw) as Partial<AdminQueue>;
    return {
      submissions: parsed.submissions ?? [],
      progressUpdates: parsed.progressUpdates ?? [],
    };
  } catch {
    return emptyQueue();
  }
}

function writeLocalQueue(queue: AdminQueue) {
  window.localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
}

function mergeQueue(current: AdminQueue, next: AdminQueue): AdminQueue {
  const submissionIds = new Set<string>();
  const progressIds = new Set<string>();
  return {
    submissions: [...next.submissions, ...current.submissions].filter((item) => {
      if (submissionIds.has(item.id)) return false;
      submissionIds.add(item.id);
      return true;
    }),
    progressUpdates: [...next.progressUpdates, ...current.progressUpdates].filter((item) => {
      if (progressIds.has(item.id)) return false;
      progressIds.add(item.id);
      return true;
    }),
  };
}

function removeLocalSubmission(id: string) {
  const queue = readLocalQueue();
  writeLocalQueue({
    ...queue,
    submissions: queue.submissions.filter((item) => item.id !== id),
  });
}

function removeLocalProgressUpdate(id: string) {
  const queue = readLocalQueue();
  writeLocalQueue({
    ...queue,
    progressUpdates: queue.progressUpdates.filter((item) => item.id !== id),
  });
}

function getResponse(data: StudioData, taskId: string, memberId: string) {
  return data.responses[taskId]?.[memberId];
}

function getTaskSkip(data: StudioData, taskId: string, memberId: string) {
  return data.taskSkips?.[taskId]?.[memberId];
}

function isTaskSkipped(data: StudioData, taskId: string, memberId: string) {
  return Boolean(getTaskSkip(data, taskId, memberId));
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeScore(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? roundScore(numberValue) : fallback;
}

function taskWindowDuration(task: StudioTask) {
  if (isTechnicalTask(task)) return null;
  if (!task.deadlineAt) return null;
  const startTime = new Date(task.startAt || task.createdAt).getTime();
  const deadlineTime = new Date(task.deadlineAt).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(deadlineTime) || deadlineTime <= startTime) {
    return null;
  }
  return deadlineTime - startTime;
}

function isSubmissionLate(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  if (isTechnicalTask(task)) return false;
  if (!task.deadlineAt) return false;
  const deadlineTime = new Date(task.deadlineAt).getTime();
  const submittedTime = new Date(response.submittedAt).getTime();
  return (
    Number.isFinite(deadlineTime) &&
    Number.isFinite(submittedTime) &&
    submittedTime > deadlineTime
  );
}

function isHardLocked(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  if (isTechnicalTask(task)) return false;
  const duration = taskWindowDuration(task);
  if (duration === null || !task.deadlineAt) return false;
  const deadlineTime = new Date(task.deadlineAt).getTime();
  const submittedTime = new Date(response.submittedAt).getTime();
  return Number.isFinite(submittedTime) && submittedTime > deadlineTime + duration;
}

function calculateAwardedPoints(
  task: StudioTask,
  response: Pick<TaskResponse, "submittedAt">,
  status: TaskResponse["status"],
) {
  if (status !== "approved") return 0;
  if (isHardLocked(task, response)) return 0;
  const points = sanitizePositiveNumber(task.points, 1);
  return roundScore(isSubmissionLate(task, response) ? points / 2 : points);
}

function responseAwardedPoints(task: StudioTask, response?: TaskResponse) {
  if (!response || response.status !== "approved") return 0;
  return response.awardedPoints ?? calculateAwardedPoints(task, response, response.status);
}

function responseIsLate(task: StudioTask, response?: TaskResponse) {
  if (!response) return false;
  return response.lateSubmission ?? isSubmissionLate(task, response);
}

function rejectionCount(response?: TaskResponse) {
  if (!response) return 0;
  const eventCount = response.reviewEvents?.filter((event) => event.status === "rejected").length;
  if (typeof eventCount === "number" && eventCount > 0) return eventCount;
  return response.status === "rejected" ? 1 : 0;
}

function latestReviewNote(response?: TaskResponse) {
  return response?.reviewEvents?.find((event) => event.note?.trim())?.note?.trim() ?? "";
}

function hoursBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return (endTime - startTime) / 36e5;
}

function formatHours(value: number | null) {
  if (value === null) return "N/A";
  if (value < 1) return `${Math.max(1, Math.round(value * 60))}m`;
  return `${value.toFixed(1)}h`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizedInverseScore(value: number | null, min: number | null, max: number | null) {
  if (value === null || min === null || max === null) return 0;
  if (max <= min) return 100;
  return clampScore(100 - ((value - min) / (max - min)) * 100);
}

function technicalTimingScore(task: StudioTask, response: TaskResponse) {
  if (isTechnicalTask(task)) return 75;
  const startTime = new Date(task.startAt || task.createdAt).getTime();
  const deadlineTime = task.deadlineAt ? new Date(task.deadlineAt).getTime() : NaN;
  const submittedTime = new Date(response.submittedAt).getTime();
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(deadlineTime) ||
    !Number.isFinite(submittedTime) ||
    deadlineTime <= startTime
  ) {
    return 75;
  }
  if (submittedTime > deadlineTime) return 0;
  const progress = clampScore(((submittedTime - startTime) / (deadlineTime - startTime)) * 100);
  if (progress < 50) return 25 + progress * 0.5;
  if (progress < 70) return 50 + ((progress - 50) / 20) * 35;
  if (progress <= 90) return 100;
  return 90 - ((progress - 90) / 10) * 15;
}

function createStats(data: StudioData) {
  const activeTasks = data.tasks.filter(isActiveTask);
  const scoreTasks = data.tasks.filter((task) => !isHiddenTask(task));
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const scoreMeetings = data.meetings ?? [];
  const accountableMeetings = scoreMeetings.filter((meeting) => {
    if (meetingStatus(meeting) === "archived") return true;
    const phase = meetingPhase(meeting);
    return phase === "live" || phase === "ended";
  });
  const memberOrder = new Map(data.members.map((member, index) => [member.id, index]));
  const rawMemberStats = data.members.map((member) => {
    const assignedTasks = scoreTasks.filter(
      (task) => taskIsForMember(task, member.id) && !isTaskSkipped(data, task.id, member.id),
    );
    const responses = assignedTasks
      .map((task) => ({ task, response: getResponse(data, task.id, member.id) }))
      .filter((item): item is { task: StudioTask; response: TaskResponse } =>
        Boolean(item.response),
      );
    const approvedTasks = responses.filter((item) => item.response.status === "approved");
    const taskPoints = approvedTasks.reduce(
      (sum, item) => sum + responseAwardedPoints(item.task, item.response),
      0,
    );
    const speedSamples = responses
      .map((item) => hoursBetween(item.task.startAt || item.task.createdAt, item.response.submittedAt))
      .filter((value): value is number => value !== null);
    const avgHours =
      speedSamples.length > 0
        ? speedSamples.reduce((sum, value) => sum + value, 0) / speedSamples.length
        : null;
    const fastSpeedSamples = responses
      .filter((item) => !isTechnicalTask(item.task))
      .map((item) => hoursBetween(item.task.startAt || item.task.createdAt, item.response.submittedAt))
      .filter((value): value is number => value !== null);
    const avgFastHours =
      fastSpeedSamples.length > 0
        ? fastSpeedSamples.reduce((sum, value) => sum + value, 0) / fastSpeedSamples.length
        : null;
    const technicalTimingSamples = responses
      .filter((item) => isTechnicalTask(item.task))
      .map((item) => technicalTimingScore(item.task, item.response));
    const technicalTimingScoreValue =
      technicalTimingSamples.length > 0
        ? technicalTimingSamples.reduce((sum, value) => sum + value, 0) / technicalTimingSamples.length
        : null;
    const baseCompleted = 0;
    const baseApproved = 0;
    const baseRejected = 0;
    const basePoints = sanitizeNumber(member.basePoints);
    const memberBonusGrades = (data.bonusGrades ?? []).filter((bonus) => bonus.memberId === member.id);
    const bonusPoints = memberBonusGrades.reduce((sum, bonus) => sum + sanitizeNumber(bonus.points), 0);
    const privateTasks = scoreTasks.filter(
      (task) => privateTaskMemberId(task) === member.id && !isTaskSkipped(data, task.id, member.id),
    ).length;
    const meetingPoints = scoreMeetings.reduce(
      (sum, meeting) => sum + (data.meetingAttendance?.[meeting.id]?.[member.id]?.score ?? 0),
      0,
    );
    const approved = approvedTasks.length;
    const rejected = responses.reduce((sum, item) => sum + rejectionCount(item.response), 0);
    const pending = responses.filter((item) => item.response.status === "submitted").length;
    const submitted = responses.length;
    const reviewed = approved + rejected;
    const rejectionRate = reviewed > 0 ? (rejected / reviewed) * 100 : 0;
    const responseRate =
      assignedTasks.length > 0 ? (responses.length / assignedTasks.length) * 100 : 0;
    const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;
    const meetingAttendances = accountableMeetings
      .map((meeting) => data.meetingAttendance?.[meeting.id]?.[member.id])
      .filter((attendance): attendance is MeetingAttendance => Boolean(attendance));
    const meetingLateSamples = meetingAttendances.map((attendance) => sanitizeNumber(attendance.lateMinutes));
    const avgMeetingLateMinutes =
      meetingLateSamples.length > 0
        ? meetingLateSamples.reduce((sum, value) => sum + value, 0) / meetingLateSamples.length
        : null;
    const attendedMeetings = meetingAttendances.length;
    const meetingAttendanceRate =
      accountableMeetings.length > 0 ? (attendedMeetings / accountableMeetings.length) * 100 : 100;
    const interactionTargets = [
      ...assignedTasks.map((task) => ({
        targetType: "task" as const,
        targetId: task.id,
        taskId: task.id,
        createdAt: task.startAt || task.createdAt,
      })),
      ...assignedTasks.flatMap((task) =>
        (data.taskUpdates?.[task.id] ?? []).map((update) => ({
          targetType: "taskUpdate" as const,
          targetId: update.id,
          taskId: task.id,
          createdAt: update.createdAt,
        })),
      ),
      ...activeMeetings.map((meeting) => ({
        targetType: "meeting" as const,
        targetId: meeting.id,
        taskId: undefined,
        createdAt: meeting.createdAt || meeting.startsAt,
      })),
    ];
    const memberInteractions = new Map(
      (data.interactions ?? [])
        .filter((interaction) => interaction.memberId === member.id)
        .map((interaction) => [`${interaction.targetType}:${interaction.targetId}`, interaction]),
    );
    const seenSamples: number[] = [];
    const seenTargets = interactionTargets.reduce((sum, target) => {
      const interaction = memberInteractions.get(`${target.targetType}:${target.targetId}`);
      if (!interaction) return sum;
      const hours = hoursBetween(target.createdAt, interaction.seenAt);
      if (hours !== null) seenSamples.push(hours);
      return sum + 1;
    }, 0);
    const avgSeenHours =
      seenSamples.length > 0
        ? seenSamples.reduce((sum, value) => sum + value, 0) / seenSamples.length
        : null;

    return {
      member,
      assignedTasks: assignedTasks.length,
      submitted,
      approved,
      rejected,
      pending,
      reviewed,
      rejectionRate,
      baseCompleted,
      baseApproved,
      baseRejected,
      completed: approvedTasks.length,
      taskPoints,
      basePoints,
      bonusPoints,
      bonusCount: memberBonusGrades.length,
      meetingPoints,
      points: Math.round((basePoints + bonusPoints + taskPoints + meetingPoints) * 100) / 100,
      privateTasks,
      avgHours,
      avgFastHours,
      technicalTimingScore: technicalTimingScoreValue,
      responseRate,
      approvalRate,
      attendedMeetings,
      accountableMeetings: accountableMeetings.length,
      meetingAttendanceRate,
      avgMeetingLateMinutes,
      seenTargets,
      expectedSeenTargets: interactionTargets.length,
      avgSeenHours,
      submissionScore: 0,
      completionScore: 0,
      qualityScore: 0,
      timingScore: 0,
      interactionScore: 0,
      meetingScore: 0,
      effortScore: 0,
    };
  });
  const visibleRawStats = rawMemberStats.filter((item) => !item.member.hidden);
  const maxSubmitted = Math.max(0, ...visibleRawStats.map((item) => item.submitted));
  const avgFastHourValues = visibleRawStats
    .map((item) => item.avgFastHours)
    .filter((value): value is number => value !== null);
  const minAvgFastHours = avgFastHourValues.length > 0 ? Math.min(...avgFastHourValues) : null;
  const maxAvgFastHours = avgFastHourValues.length > 0 ? Math.max(...avgFastHourValues) : null;
  const seenHourValues = visibleRawStats
    .map((item) => item.avgSeenHours)
    .filter((value): value is number => value !== null);
  const minSeenHours = seenHourValues.length > 0 ? Math.min(...seenHourValues) : null;
  const maxSeenHours = seenHourValues.length > 0 ? Math.max(...seenHourValues) : null;
  const memberStats = rawMemberStats.map((item) => {
    const submissionScore = maxSubmitted > 0 ? (item.submitted / maxSubmitted) * 100 : 0;
    const completionScore = item.responseRate;
    const qualityScore = clampScore(item.approvalRate - item.rejectionRate * 0.7);
    const fastTimingScore = normalizedInverseScore(item.avgFastHours, minAvgFastHours, maxAvgFastHours);
    const timingParts = [
      item.technicalTimingScore,
      item.avgFastHours === null ? null : fastTimingScore,
    ].filter((value): value is number => value !== null);
    const timingScore =
      timingParts.length > 0
        ? timingParts.reduce((sum, value) => sum + value, 0) / timingParts.length
        : 75;
    const seenRate =
      item.expectedSeenTargets > 0 ? (item.seenTargets / item.expectedSeenTargets) * 100 : 100;
    const seenSpeedScore = normalizedInverseScore(item.avgSeenHours, minSeenHours, maxSeenHours);
    const interactionScore =
      item.expectedSeenTargets > 0 ? seenRate * 0.65 + seenSpeedScore * 0.35 : 100;
    const punctualityScore =
      item.avgMeetingLateMinutes === null ? 100 : clampScore(100 - (item.avgMeetingLateMinutes / 60) * 100);
    const meetingScore =
      item.accountableMeetings > 0 ? item.meetingAttendanceRate * 0.75 + punctualityScore * 0.25 : 100;
    const effortScore = clampScore(
      submissionScore * 0.35 +
        completionScore * 0.2 +
        qualityScore * 0.2 +
        timingScore * 0.1 +
        interactionScore * 0.1 +
        meetingScore * 0.05,
    );

    return {
      ...item,
      submissionScore,
      completionScore,
      qualityScore,
      timingScore,
      interactionScore,
      meetingScore,
      effortScore,
    };
  });
  const visibleStats = memberStats.filter((item) => !item.member.hidden);
  const rankedMembers = [...visibleStats].sort((a, b) => {
    if (b.effortScore !== a.effortScore) return b.effortScore - a.effortScore;
    if (b.submitted !== a.submitted) return b.submitted - a.submitted;
    if (b.responseRate !== a.responseRate) return b.responseRate - a.responseRate;
    if (a.rejectionRate !== b.rejectionRate) return a.rejectionRate - b.rejectionRate;
    if (b.approvalRate !== a.approvalRate) return b.approvalRate - a.approvalRate;
    if (b.timingScore !== a.timingScore) {
      return b.timingScore - a.timingScore;
    }
    if (b.meetingAttendanceRate !== a.meetingAttendanceRate) {
      return b.meetingAttendanceRate - a.meetingAttendanceRate;
    }
    if (a.avgMeetingLateMinutes !== b.avgMeetingLateMinutes) {
      if (a.avgMeetingLateMinutes === null) return 1;
      if (b.avgMeetingLateMinutes === null) return -1;
      return a.avgMeetingLateMinutes - b.avgMeetingLateMinutes;
    }
    if (b.interactionScore !== a.interactionScore) return b.interactionScore - a.interactionScore;
    if (b.meetingScore !== a.meetingScore) return b.meetingScore - a.meetingScore;
    if (b.completed !== a.completed) return b.completed - a.completed;
    if (b.points !== a.points) return b.points - a.points;
    if (b.assignedTasks !== a.assignedTasks) return b.assignedTasks - a.assignedTasks;
    return (memberOrder.get(a.member.id) ?? 0) - (memberOrder.get(b.member.id) ?? 0);
  });
  const taskMetrics = activeTasks.map((task) => {
    const visibleMemberIds = new Set(
      data.members
        .filter(
          (member) =>
            !member.hidden && taskIsForMember(task, member.id) && !isTaskSkipped(data, task.id, member.id),
        )
        .map((member) => member.id),
    );
    const expected = visibleMemberIds.size;
    const responses = Object.values(data.responses[task.id] ?? {}).filter((response) =>
      visibleMemberIds.has(response.memberId),
    );
    const progressUpdates = (data.progressUpdates?.[task.id] ?? []).filter((update) =>
      visibleMemberIds.has(update.memberId),
    );
    return {
      task,
      expected,
      received: responses.length,
      approved: responses.filter((response) => response.status === "approved").length,
      rejected: responses.reduce((sum, response) => sum + rejectionCount(response), 0),
      submitted: responses.filter((response) => response.status === "submitted").length,
      progressUpdates: progressUpdates.length,
    };
  });
  const leader = rankedMembers[0];
  const worst = rankedMembers[rankedMembers.length - 1];
  const approvedTotal = visibleStats.reduce((sum, item) => sum + item.completed, 0);
  const pointsTotal = visibleStats.reduce((sum, item) => sum + item.points, 0);
  const meetingMetrics: MeetingMetric[] = activeMeetings.map((meeting) => {
    const attendance = Object.values(data.meetingAttendance?.[meeting.id] ?? {}).filter((item) =>
      data.members.some((member) => !member.hidden && member.id === item.memberId),
    );
    return {
      meeting,
      attended: attendance.length,
      expected: data.members.filter((member) => !member.hidden).length,
      totalScore: Math.round(attendance.reduce((sum, item) => sum + item.score, 0) * 100) / 100,
    };
  });
  const pendingTotal = Object.values(data.responses).reduce(
    (sum, taskResponses) =>
      sum +
      Object.values(taskResponses).filter((response) => response.status === "submitted").length,
    0,
  );

  return {
    allMemberStats: memberStats,
    memberStats: rankedMembers,
    taskMetrics,
    meetingMetrics,
    activeTasks,
    archivedTasks: data.tasks.filter((task) => taskStatus(task) === "archived"),
    activeMeetings,
    archivedMeetings: (data.meetings ?? []).filter((meeting) => meetingStatus(meeting) === "archived"),
    leader,
    worst,
    approvedTotal,
    pointsTotal,
    pendingTotal,
  };
}

function rankingBadgeClass(index: number) {
  return index === 0 ? "bg-yellow-100" : "bg-white";
}

function Logo({ size = "size-24" }: { size?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}hivo.png`}
      alt="Hivo Studio logo"
      className={`mx-auto rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm ${size}`}
    />
  );
}

function SectionTitle({ title, help }: { title: string; help: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold">
        <span className="highlight-yellow">{title}</span>
      </h2>
      <p className="mt-1 text-sm leading-6 text-foreground/60">{help}</p>
    </div>
  );
}

function LoginScreen({
  data,
  onMemberLogin,
  onAdminLogin,
  onStatsLogin,
}: {
  data: StudioData;
  onMemberLogin: (member: Member, displayName: string) => void;
  onAdminLogin: (password: string) => void;
  onStatsLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const settings = data.settings ?? DEFAULT_SETTINGS;
  const isPasswordEntry = /^\d+$/.test(name.trim());

  function submitName() {
    const displayName = name.trim();
    if (!displayName) return;

    if (displayName === settings.adminPassword) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.localStorage.setItem(ADMIN_AUTH_KEY, displayName);
      window.localStorage.removeItem(STATS_SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onAdminLogin(displayName);
      return;
    }

    if (displayName === settings.statsPassword || isStatsLoginName(displayName)) {
      window.localStorage.setItem(STATS_SESSION_KEY, "true");
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onStatsLogin();
      return;
    }

    const member = findMemberByName(displayName, data.members);
    if (!member) {
      setError("الاسم مش واضح عندي. اكتبه عربي أو إنجليزي زي اسمك في التيم.");
      return;
    }

    window.localStorage.setItem(ACTIVE_MEMBER_KEY, member.id);
    window.localStorage.setItem(ACTIVE_DISPLAY_NAME_KEY, displayName);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.localStorage.removeItem(STATS_SESSION_KEY);
    onMemberLogin(member, displayName);
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-12">
        <section
          className="w-full border-[2.5px] border-ink bg-card p-6 text-center doodle-shadow"
          style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
        >
          <Logo size="size-28" />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto mb-5 max-w-sm text-lg text-foreground/75">اكتب اسمك</p>
          <div className="flex flex-col gap-3">
            <Input
              type={isPasswordEntry ? "password" : "text"}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitName();
              }}
              placeholder="هنا..."
              className="h-12 border-[2px] border-ink bg-paper text-center text-lg"
              autoFocus
            />
            <Button
              type="button"
              onClick={submitName}
              className="h-11 border-[2px] border-ink doodle-shadow-sm"
            >
              دخول
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>
      </main>
    </div>
  );
}

function MemberDetails({ item }: { item: MemberScore }) {
  return (
    <div className="mt-3 grid gap-2 border-t-[2px] border-ink/30 pt-3 text-sm sm:grid-cols-3">
      <span>المطلوب: {item.assignedTasks}</span>
      <span>مسلم: {item.submitted}</span>
      <span>مستني مراجعة: {item.pending}</span>
      <span>مقبول: {item.approved}</span>
      <span>نقاط: {item.points}</span>
      <span>تاسكات محسوبة: {item.completed}</span>
      <span>نسبة التسليم: {formatPercent(item.responseRate)}</span>
      <span>نسبة القبول: {formatPercent(item.approvalRate)}</span>
      <span>التوقيت: {formatPercent(item.timingScore)}</span>
      <span>سرعة التسليم السريع: {formatHours(item.avgFastHours)}</span>
      <span>تسكات خاصة: {item.privateTasks}</span>
      <span>درجات يدوية: {item.basePoints}</span>
      <span>بونص: {item.bonusPoints} ({item.bonusCount})</span>
      <span>Effort: {formatPercent(item.effortScore)}</span>
      <span>Seen: {item.seenTargets}/{item.expectedSeenTargets}</span>
      <span>Interaction: {formatPercent(item.interactionScore)}</span>
    </div>
  );
}

function StatsMemberDetails({ item }: { item: MemberScore }) {
  return (
    <div className="mt-3 grid gap-2 border-t border-ink/20 pt-3 text-sm sm:grid-cols-3">
      <span>Assigned: {item.assignedTasks}</span>
      <span>Submitted: {item.submitted}</span>
      <span>Pending review: {item.pending}</span>
      <span>Approved: {item.approved}</span>
      <span>Points: {item.points}</span>
      <span>Counted tasks: {item.completed}</span>
      <span>Submission rate: {formatPercent(item.responseRate)}</span>
      <span>Approval rate: {formatPercent(item.approvalRate)}</span>
      <span>Timing: {formatPercent(item.timingScore)}</span>
      <span>Fast-task speed: {formatHours(item.avgFastHours)}</span>
      <span>Private tasks: {item.privateTasks}</span>
      <span>Manual grades: {item.basePoints}</span>
      <span>Bonus: {item.bonusPoints} ({item.bonusCount})</span>
      <span>Effort: {formatPercent(item.effortScore)}</span>
      <span>Seen: {item.seenTargets}/{item.expectedSeenTargets}</span>
      <span>Interaction: {formatPercent(item.interactionScore)}</span>
    </div>
  );
}

function leadershipReason(leader: MemberScore, runner?: MemberScore) {
  if (!runner) {
    if (leader.submitted > 0) {
      return `سلم ${leader.submitted} مرة وقبوله ${formatPercent(leader.approvalRate)}`;
    }
    return "أعلى نشاط متاح حاليا";
  }
  if (leader.submitted > runner.submitted) {
    return `سلم أكتر (${leader.submitted} مقابل ${runner.submitted})`;
  }
  if (leader.responseRate > runner.responseRate) {
    return `التزامه أعلى (${formatPercent(leader.responseRate)})`;
  }
  if (leader.approvalRate > runner.approvalRate) {
    return `قبوله أعلى (${formatPercent(leader.approvalRate)})`;
  }
  if (leader.timingScore > runner.timingScore) {
    if (leader.avgFastHours !== null && (runner.avgFastHours === null || leader.avgFastHours < runner.avgFastHours)) {
      return `بيسلم أسرع في المشاكل والتاسكات السريعة (${formatHours(leader.avgFastHours)})`;
    }
    return `تقييم التوقيت عنده أقوى (${formatPercent(leader.timingScore)})`;
  }
  if (leader.interactionScore > runner.interactionScore) {
    return `تفاعله أسرع (${formatPercent(leader.interactionScore)})`;
  }
  if (leader.meetingScore > runner.meetingScore) {
    return `حضوره أقوى (${formatPercent(leader.meetingScore)})`;
  }
  return `مجهوده الإجمالي أعلى (${formatPercent(leader.effortScore)})`;
}

function leaderboardLeaderHeadline(scores: MemberScore[]) {
  const leader = scores[0];
  if (!leader) return "لسه مفيش نشاط كفاية للترتيب";
  return `${memberArabicName(leader.member)} في الصدارة: ${leadershipReason(leader, scores[1])}`;
}

function LeaderboardStatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "min-w-0 rounded-md border-[1.5px] border-ink bg-white/90 px-2 py-1.5 text-center shadow-[1px_1px_0_0_var(--ink)]",
        className,
      )}
    >
      <span className="block text-base font-bold leading-none">{value}</span>
      {label && (
        <span className="mt-1 block text-[10px] font-semibold leading-none text-foreground/55">
          {label}
        </span>
      )}
    </span>
  );
}

function memberArabicName(member: Member) {
  const aliases = Array.isArray(member.aliases) ? member.aliases : [];
  const arabicAlias = aliases.find((alias) => /[\u0600-\u06FF]/.test(alias));
  return arabicAlias?.trim() || member.name;
}

function podiumMemberName(member: Member) {
  const name = memberArabicName(member);
  if (/يوسف|yossef|youssef|yousef/i.test(name)) return "يوسف";
  if (/grir|grier|جري/i.test(name)) return "أبو جرير";
  return name;
}

function textDirection(value: string) {
  return /[\u0600-\u06FF]/.test(value) ? "rtl" : "ltr";
}

function textAlignClass(value: string) {
  return textDirection(value) === "rtl" ? "text-right" : "text-left";
}

function formatTaskPointsLabel(points: number) {
  if (points === 1) return "درجة";
  if (points === 2) return "درجتين";
  if (points >= 3 && points <= 10) return `${points} درجات`;
  return `${points} درجة`;
}

function Leaderboard({ scores }: { scores: MemberScore[] }) {
  const [openMemberId, setOpenMemberId] = useState("");
  const leader = scores[0];
  const podiumSideMembers = scores.slice(1, 3);
  const remainingMembers = scores.slice(3);
  const worstRemainingId = remainingMembers[remainingMembers.length - 1]?.member.id;

  function renderExpandedDetails(item: MemberScore, isOpen: boolean) {
    if (!isOpen) return null;
    return (
      <div className="relative z-10">
        <MemberDetails item={item} />
      </div>
    );
  }

  function renderPodiumCard(
    item: MemberScore,
    rank: number,
    options: { featured?: boolean; side?: "left" | "right" } = {},
  ) {
    const isOpen = openMemberId === item.member.id;

    return (
      <button
        key={item.member.id}
        type="button"
        onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
        className={cn(
          "leaderboard-podium-card group relative text-right transition",
          options.featured ? "leaderboard-podium-card-featured" : "leaderboard-podium-card-side",
          !options.featured ? "leaderboard-podium-card-rank-float" : "",
          options.side === "left" ? "leaderboard-podium-card-left" : "",
          options.side === "right" ? "leaderboard-podium-card-right" : "",
        )}
        style={{
          borderRadius: options.featured
            ? "18px 22px 16px 24px / 22px 16px 24px 18px"
            : "16px 18px 14px 20px / 18px 14px 20px 16px",
        }}
      >
        <div className="relative z-10 grid gap-3">
          <div className={cn("leaderboard-podium-head", options.featured ? "leaderboard-podium-head-featured" : "")}>
            {options.featured && (
              <span className="leaderboard-crown-mark" aria-hidden="true">
                <Crown className="size-5" />
              </span>
            )}
            <span
              className={cn(
                options.featured
                  ? "inline-flex items-center justify-center gap-2"
                  : "leaderboard-side-name-wrap",
              )}
            >
              {!options.featured && (
                <span
                  className={cn(
                    "leaderboard-badge leaderboard-side-rank-badge grid shrink-0 place-items-center rounded-full border-[2px] border-ink font-bold",
                    rankingBadgeClass(rank - 1),
                  )}
                >
                  {rank}
                </span>
              )}
              {options.featured && (
                <span
                  className={cn(
                    "leaderboard-badge grid size-10 shrink-0 place-items-center rounded-full border-[2px] border-ink text-lg font-bold",
                    rankingBadgeClass(rank - 1),
                  )}
                >
                  {rank}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 break-words text-center font-semibold leading-tight",
                  options.featured ? "text-lg sm:text-xl" : "leaderboard-side-member-name",
                )}
              >
                {podiumMemberName(item.member)}
              </span>
            </span>
            {options.featured && <span className="leaderboard-top-tag shrink-0">متصدر</span>}
          </div>

          <div className="grid justify-items-center gap-2 text-center">
            <span
              className={cn(
                "rounded-full border-[2px] border-ink bg-accent px-3 py-1 text-center font-bold shadow-[2px_2px_0_0_var(--ink)]",
                options.featured ? "text-lg" : "text-sm",
              )}
            >
              {item.points} نقطة
            </span>
            <span className="leaderboard-podium-review">
              <span>
                <strong>{formatPercent(item.approvalRate)}</strong>
              </span>
            </span>
          </div>
        </div>
        {renderExpandedDetails(item, isOpen)}
      </button>
    );
  }

  function renderListRow(item: MemberScore, rank: number) {
    const isOpen = openMemberId === item.member.id;
    const isWorst = item.member.id === worstRemainingId && remainingMembers.length > 0;
    const progressWidth =
      item.assignedTasks > 0 && item.completed > 0
        ? Math.max(8, Math.min(100, (item.completed / item.assignedTasks) * 100))
        : 0;

    return (
      <button
        key={item.member.id}
        type="button"
        onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
        className={cn(
          "leaderboard-list-row group relative overflow-hidden text-right transition",
          isWorst ? "leaderboard-list-row-worst" : "leaderboard-list-row-normal",
        )}
        style={{ borderRadius: "16px 18px 14px 20px / 18px 14px 20px 16px" }}
      >
        <div className="relative z-10 grid gap-3">
          <div className="flex items-center justify-between gap-3" dir="rtl">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "leaderboard-badge grid size-8 shrink-0 place-items-center rounded-full border-[2px] border-ink text-sm font-bold",
                  rankingBadgeClass(rank - 1),
                )}
              >
                {rank}
              </span>
              <span className="min-w-0 break-words text-right text-base font-semibold leading-tight">
                {memberArabicName(item.member)}
              </span>
            </span>
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {isWorst && <span className="leaderboard-warning-tag">يحتاج متابعة</span>}
              {item.member.publicFlag && (
                <span className="shrink-0 text-xs font-bold text-red-600">
                  {item.member.publicFlag}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3" dir="rtl">
            <span className="text-sm font-bold text-foreground/70">
              {item.points} نقطة
            </span>
            <span className="leaderboard-acceptance-rate">
              {formatPercent(item.approvalRate)}
            </span>
          </div>

          <span className="grid grid-cols-4 gap-2" dir="ltr">
            <LeaderboardStatPill label="درجات" value={item.points} />
            <LeaderboardStatPill label="مقبول" value={item.approved} className="bg-emerald-100/70" />
            <LeaderboardStatPill label="Assigned" value={item.assignedTasks} className="bg-sky-100/70" />
            <LeaderboardStatPill
              label=""
              value={formatPercent(item.approvalRate)}
              className="leaderboard-percent-pill bg-emerald-50"
            />
          </span>

          <span className="block h-2 overflow-hidden rounded-full border border-ink/80 bg-white/75" dir="ltr">
            <span
              className="leaderboard-progress block h-full rounded-full bg-emerald-400"
              style={{ width: `${progressWidth}%` }}
            />
          </span>
        </div>
        {renderExpandedDetails(item, isOpen)}
      </button>
    );
  }

  return (
    <div className="leaderboard-stage grid gap-4" dir="rtl">
      {scores.length > 0 && (
        <div className="leaderboard-podium-shell">
          <div className="leaderboard-podium-grid">
            {podiumSideMembers[0] ? renderPodiumCard(podiumSideMembers[0], 2, { side: "left" }) : <div />}
            {leader ? renderPodiumCard(leader, 1, { featured: true }) : <div />}
            {podiumSideMembers[1] ? renderPodiumCard(podiumSideMembers[1], 3, { side: "right" }) : <div />}
          </div>
        </div>
      )}

      {remainingMembers.length > 0 && (
        <div className="grid gap-3">
          {remainingMembers.map((item, index) => renderListRow(item, index + 4))}
        </div>
      )}
    </div>
  );
}

function MemberView({
  data,
  activeMember,
  stats,
  draftAnswers,
  sentState,
  refreshStatus,
  onDraftChange,
  isSubmitting,
  onSubmitFinal,
  onSubmitProgress,
  onRepoAttention,
  onDriveAttention,
  onProfileChangeRequest,
  onMarkInteraction,
  onLogout,
  onRefreshData,
}: {
  data: StudioData;
  activeMember: ActiveMember;
  stats: ReturnType<typeof createStats>;
  draftAnswers: Record<string, string>;
  sentState: Record<string, string>;
  refreshStatus: string;
  onDraftChange: (key: string, value: string) => void;
  isSubmitting: boolean;
  onSubmitFinal: (task: StudioTask) => boolean | Promise<boolean>;
  onSubmitProgress: (task: StudioTask) => boolean | Promise<boolean>;
  onRepoAttention: (task: StudioTask) => boolean | Promise<boolean>;
  onDriveAttention: (task: StudioTask) => boolean | Promise<boolean>;
  onProfileChangeRequest: (item: MemberProfileRequestInput) => boolean | Promise<boolean>;
  onMarkInteraction: (item: InteractionInput) => boolean | Promise<boolean>;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [repoDraft, setRepoDraft] = useState(activeMember.member.repoUrl ?? "");
  const [driveDraft, setDriveDraft] = useState(activeMember.member.driveUrl ?? "");
  const [memberTab, setMemberTab] = useState<"tasks" | "log">("tasks");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedOnce, setRefreshedOnce] = useState(
    window.sessionStorage.getItem(REFRESHED_SESSION_KEY) === "true",
  );
  const [showNicknameHint, setShowNicknameHint] = useState(
    window.localStorage.getItem(NICKNAME_HINT_KEY) !== "seen",
  );
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});
  const [seenMeetingIds, setSeenMeetingIds] = useState(() =>
    readSeenMeetingIds(activeMember.member.id),
  );
  const [seenTaskUpdateIds, setSeenTaskUpdateIds] = useState(() =>
    readSeenTaskUpdateIds(activeMember.member.id),
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedTaskSectionIndex, setExpandedTaskSectionIndex] = useState(0);
  const [problemSolutionsTaskId, setProblemSolutionsTaskId] = useState<string | null>(null);
  const [pasteWarningTaskId, setPasteWarningTaskId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [nowTime, setNowTime] = useState(() => Date.now());
  const memberTasks = data.tasks.filter((task) => {
    if (!taskIsForMember(task, activeMember.member.id)) return false;
    if (isTaskSkipped(data, task.id, activeMember.member.id)) return false;
    return getResponse(data, task.id, activeMember.member.id)?.status !== "approved";
  });
  const memberLogTasks = data.tasks.filter((task) =>
    taskIsForMember(task, activeMember.member.id),
  );
  const nowDate = useMemo(() => new Date(nowTime), [nowTime]);
  const memberInteractionKeys = useMemo(
    () =>
      new Set(
        (data.interactions ?? [])
          .filter((interaction) => interaction.memberId === activeMember.member.id)
          .map((interaction) => `${interaction.targetType}:${interaction.targetId}`),
      ),
    [activeMember.member.id, data.interactions],
  );
  const visibleMeetingNotices = useMemo(() => {
    const seenIds = new Set(seenMeetingIds);
    return memberVisibleMeetings(data.meetings ?? [], nowDate).filter(
      (meeting) => !seenIds.has(meeting.id) && !memberInteractionKeys.has(`meeting:${meeting.id}`),
    );
  }, [data.meetings, memberInteractionKeys, nowDate, seenMeetingIds]);
  const visibleTaskUpdateNotices = useMemo(() => {
    const seenIds = new Set(seenTaskUpdateIds);
    return memberTasks
      .map((task) => ({
        task,
        updates: (data.taskUpdates?.[task.id] ?? []).filter(
          (update) => !seenIds.has(update.id) && !memberInteractionKeys.has(`taskUpdate:${update.id}`),
        ),
      }))
      .filter((item) => item.updates.length > 0);
  }, [data.taskUpdates, memberInteractionKeys, memberTasks, seenTaskUpdateIds]);
  const expandedTask = expandedTaskId ? memberTasks.find((task) => task.id === expandedTaskId) : undefined;
  const expandedTaskUpdates = expandedTask ? data.taskUpdates?.[expandedTask.id] ?? [] : [];
  const problemSolutionsTask = problemSolutionsTaskId
    ? memberTasks.find((task) => task.id === problemSolutionsTaskId)
    : undefined;
  const problemSolutions = problemSolutionsTask ? problemSolutionEntries(problemSolutionsTask) : [];
  const activeMemberScore = useMemo(
    () => stats.allMemberStats.find((item) => item.member.id === activeMember.member.id),
    [activeMember.member.id, stats.allMemberStats],
  );
  const hasProfileChange =
    repoDraft.trim() !== (activeMember.member.repoUrl ?? "") ||
    driveDraft.trim() !== (activeMember.member.driveUrl ?? "");
  const hasNicknameChange =
    nicknameDraft.trim().length > 0 && nicknameDraft.trim() !== activeMember.displayName.trim();
  const nicknameActionKey = `nickname:${activeMember.member.id}`;
  const profileActionKey = `profile:${activeMember.member.id}`;
  const nicknameFeedback = actionFeedback[nicknameActionKey];
  const profileFeedback = actionFeedback[profileActionKey];
  const loginAliases = useMemo(
    () =>
      [...new Set([activeMember.member.name, ...activeMember.member.aliases].map((alias) => alias.trim()))].filter(
        Boolean,
      ),
    [activeMember.member.aliases, activeMember.member.name],
  );
  function hasSeenTarget(targetType: InteractionTargetType, targetId: string) {
    return memberInteractionKeys.has(`${targetType}:${targetId}`);
  }

  useEffect(() => {
    if (!settingsOpen) return;
    setNicknameDraft("");
    setRepoDraft(activeMember.member.repoUrl ?? "");
    setDriveDraft(activeMember.member.driveUrl ?? "");
  }, [activeMember.member.driveUrl, activeMember.member.id, activeMember.member.repoUrl, settingsOpen]);

  useEffect(() => {
    setSeenMeetingIds(readSeenMeetingIds(activeMember.member.id));
    setSeenTaskUpdateIds(readSeenTaskUpdateIds(activeMember.member.id));
  }, [activeMember.member.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expandedTaskId && !problemSolutionsTaskId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expandedTaskId, problemSolutionsTaskId]);

  async function refreshMemberData() {
    setRefreshing(true);
    try {
      await onRefreshData();
      window.sessionStorage.setItem(REFRESHED_SESSION_KEY, "true");
      setRefreshedOnce(true);
    } finally {
      setRefreshing(false);
    }
  }

  function closeHint() {
    window.localStorage.setItem(NICKNAME_HINT_KEY, "seen");
    setShowNicknameHint(false);
  }

  function markMeetingSeen(meetingId: string) {
    setSeenMeetingIds((current) => {
      const next = uniqueText([...current, meetingId]);
      writeSeenMeetingIds(activeMember.member.id, next);
      return next;
    });
    void onMarkInteraction({
      memberId: activeMember.member.id,
      targetType: "meeting",
      targetId: meetingId,
    });
  }

  function markTaskSeen(taskId: string) {
    void onMarkInteraction({
      memberId: activeMember.member.id,
      targetType: "task",
      targetId: taskId,
      taskId,
    });
  }

  function markTaskUpdatesSeen(updateIds: string[], taskId?: string) {
    setSeenTaskUpdateIds((current) => {
      const next = uniqueText([...current, ...updateIds]);
      writeSeenTaskUpdateIds(activeMember.member.id, next);
      return next;
    });
    updateIds.forEach((updateId) => {
      void onMarkInteraction({
        memberId: activeMember.member.id,
        targetType: "taskUpdate",
        targetId: updateId,
        taskId,
      });
    });
  }

  function markVisiblePageSeen() {
    const meetingIds = visibleMeetingNotices.map((meeting) => meeting.id);
    const updateTargets = visibleTaskUpdateNotices.flatMap(({ task, updates }) =>
      updates.map((update) => ({ updateId: update.id, taskId: task.id })),
    );
    const taskIds = memberTasks
      .map((task) => task.id)
      .filter((taskId) => !hasSeenTarget("task", taskId));

    if (meetingIds.length > 0) {
      setSeenMeetingIds((current) => {
        const next = uniqueText([...current, ...meetingIds]);
        writeSeenMeetingIds(activeMember.member.id, next);
        return next;
      });
    }

    if (updateTargets.length > 0) {
      setSeenTaskUpdateIds((current) => {
        const next = uniqueText([...current, ...updateTargets.map((target) => target.updateId)]);
        writeSeenTaskUpdateIds(activeMember.member.id, next);
        return next;
      });
    }

    meetingIds.forEach((meetingId) => {
      void onMarkInteraction({
        memberId: activeMember.member.id,
        targetType: "meeting",
        targetId: meetingId,
      });
    });
    updateTargets.forEach((target) => {
      void onMarkInteraction({
        memberId: activeMember.member.id,
        targetType: "taskUpdate",
        targetId: target.updateId,
        taskId: target.taskId,
      });
    });
    taskIds.forEach((taskId) => {
      void onMarkInteraction({
        memberId: activeMember.member.id,
        targetType: "task",
        targetId: taskId,
        taskId,
      });
    });
  }

  function problemSolutionEntries(task: StudioTask) {
    return Object.values(data.responses[task.id] ?? {})
      .filter((response) => response.memberId !== activeMember.member.id)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }

  function problemSubmissionRank(task: StudioTask) {
    const now = Date.now();
    return (
      Object.values(data.responses[task.id] ?? {}).filter(
        (response) =>
          response.memberId !== activeMember.member.id &&
          new Date(response.submittedAt).getTime() <= now,
      ).length + 1
    );
  }

  function showProblemPasteWarning(taskId: string) {
    setPasteWarningTaskId(taskId);
    window.setTimeout(() => {
      setPasteWarningTaskId((current) => (current === taskId ? null : current));
    }, 3000);
  }

  function blockProblemPaste(event: ClipboardEvent<HTMLTextAreaElement>, taskId: string) {
    event.preventDefault();
    showProblemPasteWarning(taskId);
  }

  function blockProblemDrop(event: DragEvent<HTMLTextAreaElement>, taskId: string) {
    event.preventDefault();
    showProblemPasteWarning(taskId);
  }

  function blockProblemBeforeInput(event: FormEvent<HTMLTextAreaElement>, taskId: string) {
    const inputType = (event.nativeEvent as InputEvent).inputType ?? "";
    if (inputType.includes("Paste") || inputType === "insertFromDrop") {
      event.preventDefault();
      showProblemPasteWarning(taskId);
    }
  }

  function openTaskDetails(taskId: string, sectionIndex = 0) {
    setExpandedTaskSectionIndex(sectionIndex);
    setExpandedTaskId(taskId);
    setCopyFeedback("");
  }

  async function copyExpandedTaskText() {
    if (!expandedTask) return;
    await copyTextToClipboard(buildTaskCopyText(expandedTask, expandedTaskUpdates));
    setCopyFeedback("Copied.");
    window.setTimeout(() => setCopyFeedback(""), 2000);
  }

  function setMemberFeedback(key: string, feedback: ActionFeedback) {
    setActionFeedback((current) => ({ ...current, [key]: feedback }));
    clearFeedbackAfterSuccess(key, feedback, setActionFeedback);
  }

  function blockMemberAction(key: string, fields: string[]) {
    setMemberFeedback(key, { tone: "error", message: missingFieldsMessage(fields) });
  }

  async function runMemberAction(
    key: string,
    action: () => boolean | Promise<boolean>,
    successMessage: string,
    failureMessage: string,
  ) {
    setMemberFeedback(key, { tone: "pending", message: "Submitting..." });
    const ok = await action();
    setMemberFeedback(key, {
      tone: ok ? "success" : "error",
      message: ok ? successMessage : failureMessage,
    });
    return ok;
  }

  function renderMemberTaskLog() {
    const logAssigned = activeMemberScore?.assignedTasks ?? memberTasks.length;
    const logSubmitted = activeMemberScore?.submitted ?? memberLogTasks.filter((task) =>
      Boolean(getResponse(data, task.id, activeMember.member.id)),
    ).length;
    const logApproved = activeMemberScore?.approved ?? 0;
    const logApprovalRate = activeMemberScore?.approvalRate ?? 0;

    return (
      <section className="mb-7 grid gap-3">
        <div className="grid grid-cols-4 gap-2">
          <CompactMetric label="Assigned" value={logAssigned} />
          <CompactMetric label="Done" value={logSubmitted} />
          <CompactMetric label="Accepted" value={logApproved} />
          <CompactMetric label="قبول" value={formatPercent(logApprovalRate)} />
        </div>
        {memberLogTasks.length === 0 ? (
          <div
            className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
            style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
          >
            <p className="text-xl font-bold">No task history yet.</p>
          </div>
        ) : (
          memberLogTasks.map((task) => {
            const response = getResponse(data, task.id, activeMember.member.id);
            const skipped = getTaskSkip(data, task.id, activeMember.member.id);
            const progress = (data.progressUpdates?.[task.id] ?? []).filter(
              (update) => update.memberId === activeMember.member.id,
            );
            const rejects = rejectionCount(response);
            const awarded = responseAwardedPoints(task, response);
            const late = responseIsLate(task, response);
            const note = latestReviewNote(response);

            return (
              <article
                key={task.id}
                className="border-[2.5px] border-ink bg-card p-4 doodle-shadow-sm"
                style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{task.title}</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {taskStatus(task)} | deadline {taskDeadlineLabel(task)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`border-[2px] px-3 py-1 text-sm font-bold ${statusTone(response?.status)}`}>
                      {skipped ? "skipped" : response?.status ?? "missing"}
                    </span>
                    {late && (
                      <span className="border-[2px] border-yellow-700 bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-900">
                        Late - half score
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-foreground/65">
                  <span>Points: {awarded}/{sanitizePositiveNumber(task.points, 1)}</span>
                  <span>Rejected: {rejects}</span>
                  {skipped && <span>Skipped: no score impact</span>}
                  {response?.submittedAt && <span>Submitted: {formatDateTime(response.submittedAt)}</span>}
                  {response?.reviewedAt && <span>Reviewed: {formatDateTime(response.reviewedAt)}</span>}
                </div>
                {note && (
                  <p className="mt-3 border-[2px] border-ink bg-paper p-3 text-sm leading-6">
                    <strong>Admin note: </strong>
                    {note}
                  </p>
                )}
                {response?.answer && (
                  <StructuredTextBlock
                    text={response.answer}
                    className="mt-3 border-t-[2px] border-ink/15 pt-3"
                  />
                )}
                {progress.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {progress.map((update) => (
                      <div key={update.id} className="border-[2px] border-ink bg-yellow-50 p-3 text-sm">
                        <StructuredTextBlock text={update.note} compact />
                        <p className="mt-1 text-xs text-foreground/55">{formatDateTime(update.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    );
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      {showNicknameHint && (
        <div className="fixed left-4 top-20 z-30 max-w-xs border-[2px] border-ink bg-card p-3 text-sm doodle-shadow-sm">
          <p>ممكن تضيف nickname تسجل بيه دايمًا لو اسمك مش عاجبك.</p>
          <Button
            type="button"
            size="sm"
            onClick={closeHint}
            className="mt-2 border-[2px] border-ink"
          >
            تمام
          </Button>
        </div>
      )}

      {expandedTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4 py-6">
          <section
            data-testid="task-details-modal"
            className="scrollbar-none max-h-[88vh] w-full max-w-2xl overflow-y-auto overscroll-contain border-[2.5px] border-ink bg-card p-4 doodle-shadow"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
                  Task details
                </p>
                <h2
                  className={cn("mt-1 break-words text-2xl font-bold", textAlignClass(expandedTask.title))}
                  dir={textDirection(expandedTask.title)}
                >
                  {expandedTask.title}
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setExpandedTaskId(null)}
                className="shrink-0 border-[2px] border-ink bg-white"
                aria-label="Close task details"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div
              className={cn(
                "rounded-xl border-[2px] border-ink/20 bg-paper p-3",
                textAlignClass(expandedTask.question),
              )}
              dir={textDirection(expandedTask.question)}
            >
              <StructuredTextBlock
                text={expandedTask.question}
                memberFacing
                defaultOpenIndex={expandedTaskSectionIndex}
              />
            </div>
            {expandedTaskUpdates.length > 0 && (
              <div className="mt-4 grid gap-2">
                <h3 className="font-bold">Task updates</h3>
                {expandedTaskUpdates.map((update) => (
                  <div
                    key={update.id}
                    className={cn(
                      "rounded-lg border border-sky-200 bg-sky-50 p-3",
                      textAlignClass(update.message),
                    )}
                    dir={textDirection(update.message)}
                  >
                    <StructuredTextBlock text={update.message} compact memberFacing />
                    <p className="mt-1 text-xs font-bold text-sky-900/55">
                      {formatDateTime(update.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void copyExpandedTaskText()}
                className="border-[2px] border-ink doodle-shadow-sm"
              >
                <Copy data-icon="inline-start" />
                Copy task text
              </Button>
              {copyFeedback && <span className="text-sm font-bold text-emerald-700">{copyFeedback}</span>}
            </div>
          </section>
        </div>
      )}

      {problemSolutionsTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4 py-6">
          <section
            data-testid="problem-solutions-modal"
            className="scrollbar-none max-h-[88vh] w-full max-w-2xl overflow-y-auto overscroll-contain border-[2.5px] border-ink bg-card p-4 doodle-shadow"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                  Problem submissions
                </p>
                <h2
                  className={cn("mt-1 break-words text-2xl font-bold", textAlignClass(problemSolutionsTask.title))}
                  dir={textDirection(problemSolutionsTask.title)}
                >
                  {problemSolutionsTask.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-foreground/60">
                  الحلول دي اتسلمت قبلك. اقرأها عشان ما تكررش نفس الفكرة.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setProblemSolutionsTaskId(null)}
                className="shrink-0 border-[2px] border-ink bg-white"
                aria-label="Close problem submissions"
              >
                <X className="size-4" />
              </Button>
            </div>

            {problemSolutions.length === 0 ? (
              <div className="rounded-xl border-[2px] border-dashed border-ink/25 bg-paper p-5 text-center font-bold text-foreground/55">
                لسه مفيش حد سلّم حل قبلك.
              </div>
            ) : (
              <div className="grid gap-3">
                {problemSolutions.map((response, index) => {
                  const member = data.members.find((item) => item.id === response.memberId);
                  const statusLabel =
                    response.status === "approved"
                      ? "مقبول"
                      : response.status === "rejected"
                        ? "مرفوض"
                        : "مستني مراجعة";
                  return (
                    <article
                      key={`${response.memberId}:${response.submittedAt}`}
                      className="rounded-xl border-[2px] border-ink/20 bg-paper p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <strong>
                          #{index + 1} {member ? memberArabicName(member) : response.memberName}
                        </strong>
                        <span className="rounded-full border border-ink/20 bg-white px-2 py-0.5 text-xs font-bold">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mb-2 text-xs font-bold text-foreground/50">
                        {formatDateTime(response.submittedAt)}
                      </p>
                      <div className={cn("text-sm", textAlignClass(response.answer))} dir={textDirection(response.answer)}>
                        <StructuredTextBlock text={response.answer} compact memberFacing />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <div className="mb-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="grid size-11 place-items-center rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
            aria-label="settings"
            title="الإعدادات"
          >
            <Settings className="size-5" />
          </button>
          <button
            type="button"
            onClick={refreshMemberData}
            disabled={refreshing}
            className={`grid size-11 place-items-center rounded-full border-[2px] border-ink doodle-shadow-sm transition ${
              refreshedOnce ? "bg-card" : "bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.35)]"
            }`}
            aria-label={refreshing ? "refreshing" : "refresh"}
            title={refreshing ? "جاري التحديث" : "تحديث"}
          >
            <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="grid size-11 place-items-center rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
            aria-label="logout"
            title="تسجيل خروج"
          >
            <LogOut className="size-5" />
          </button>
        </div>

        <header className="relative mb-10 text-center">
          <Logo />
          <h1 className="mb-3 mt-4 text-5xl font-bold leading-tight md:text-6xl">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto max-w-xl text-xl leading-relaxed text-foreground/80">
            أهلا {memberArabicName(activeMember.member)}.
          </p>
          <div className="mt-4 font-bold">
            <span className="highlight-blue">
              درجاتك: {activeMemberScore?.points ?? 0} | التاسكات عليك: {memberTasks.length} | تاسكات محسوبة:{" "}
              {activeMemberScore?.completed ?? 0}
            </span>
          </div>
          {refreshStatus && <p className="mt-3 text-sm text-foreground/65">{refreshStatus}</p>}
        </header>

        {(!activeMember.member.repoUrl || !activeMember.member.driveUrl) && (
          <section
            className="mb-7 border-[2.5px] border-yellow-700 bg-yellow-50 p-4 text-sm font-bold text-yellow-900 doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            <div className="grid gap-2">
              {!activeMember.member.repoUrl && (
                <p>حط لينك ال repo من الاعدادات</p>
              )}
              {!activeMember.member.driveUrl && (
                <p>حط لينك ال drive من الاعدادات</p>
              )}
            </div>
          </section>
        )}

        {visibleMeetingNotices.length > 0 && (
          <section
            className="mb-7 grid gap-3 border-[2.5px] border-sky-700 bg-sky-50 p-4 text-sky-950 doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
            dir="ltr"
          >
            {visibleMeetingNotices.map((meeting) => {
              const phase = meetingPhase(meeting, nowDate);
              const timeWindow = meetingWindow(meeting);
              return (
                <div key={meeting.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border-[2px] border-sky-700 bg-white">
                      <CalendarClock className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                        {meetingPhaseLabel(phase)} meeting for all users
                      </p>
                      <h2 className="mt-1 break-words text-2xl font-bold">{meeting.title}</h2>
                      <p className="mt-1 text-sm font-bold leading-6 text-sky-900/75">
                        Starts {formatDateTime(meeting.startsAt)}
                        {` | ${meeting.points} points`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markVisiblePageSeen}
                    className="shrink-0 border border-sky-300 bg-white text-sky-900"
                  >
                    <Eye data-icon="inline-start" />
                    Seen
                  </Button>
                </div>
              );
            })}
          </section>
        )}

        {visibleTaskUpdateNotices.length > 0 && (
          <section
            className="mb-7 grid gap-3 border-[2.5px] border-yellow-700 bg-yellow-50 p-4 text-yellow-950 doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            {visibleTaskUpdateNotices.map(({ task, updates }) => {
              return (
                <div key={task.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">
                      تحديث جديد على التاسك
                    </p>
                    <h2
                      className={cn("mt-1 break-words text-xl font-bold", textAlignClass(task.title))}
                      dir={textDirection(task.title)}
                    >
                      {task.title}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-yellow-900/75">
                      فيه تحديث جديد. افتح التاسك وشوف التفاصيل.
                    </p>
                    {false && updates.length > 1 && (
                      <p className="mt-1 text-xs font-bold text-yellow-900/60">
                        +{updates.length - 1} تحديث كمان
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markVisiblePageSeen}
                    className="shrink-0 border border-yellow-700 bg-white text-yellow-950"
                  >
                    <Eye data-icon="inline-start" />
                    Seen
                  </Button>
                </div>
              );
            })}
          </section>
        )}

        {activeMember.member.publicFlag?.trim() && (
          <section
            className="mb-7 border-[2.5px] border-red-700 bg-red-50 p-4 text-lg font-bold text-red-700 doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            {activeMember.member.name}: {activeMember.member.publicFlag}
          </section>
        )}

        {activeMember.member.adminNote?.trim() && (
          <section
            className="mb-7 border-[2.5px] border-ink bg-paper p-4 text-lg leading-[1.8] doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            <strong>رسالة الأدمن: </strong>
            {activeMember.member.adminNote}
          </section>
        )}

        <div className="mb-7 flex rounded-lg border-[2px] border-ink bg-paper p-1">
          <button
            type="button"
            onClick={() => setMemberTab("tasks")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${memberTab === "tasks" ? "bg-ink text-white" : ""}`}
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setMemberTab("log")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${memberTab === "log" ? "bg-ink text-white" : ""}`}
          >
            Log
          </button>
        </div>

        {memberTab === "log" ? renderMemberTaskLog() : (
        <section className="mb-7 flex flex-col gap-5">
          {memberTasks.length === 0 ? (
            <div
              className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
              style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
            >
              <p className="text-2xl font-bold">
                <span className="highlight-yellow">لسه مفيش تاسكات ليك</span>
              </p>
              <p className="mt-2 text-foreground/70">
                أول ما الأدمن ينزل تاسك عام أو تاسك باسمك هيظهر هنا.
              </p>
            </div>
          ) : (
            memberTasks.map((task) => {
              const existing = getResponse(data, task.id, activeMember.member.id);
              const key = responseKey(task.id, activeMember.member.id);
              const taskProgressKey = progressKey(task.id, activeMember.member.id);
              const finalSent = sentState[key];
              const finalFeedback = actionFeedback[key];
              const progressFeedback = actionFeedback[taskProgressKey];
              const sharedDraft = draftAnswers[key] ?? draftAnswers[taskProgressKey] ?? existing?.answer ?? "";
              const officialProgress = (data.progressUpdates?.[task.id] ?? []).filter(
                (update) => update.memberId === activeMember.member.id,
              );
              const canAnswer = !existing || existing.status === "rejected";
              const taskTitleDir = textDirection(task.title);
              const taskQuestionDir = textDirection(task.question);
              const taskQuestionLooksLight =
                task.question.trim().length <= 90 && task.question.trim().split(/\s+/).length <= 12;
              const taskQuestionIsLong =
                task.question.trim().length > 180 || task.question.trim().split(/\n/).length > 3;
              const taskQuestionHasSections = splitMemberTextSections(task.question).length > 1;
              const taskUpdates = data.taskUpdates?.[task.id] ?? [];
              const unseenTaskUpdates = taskUpdates.filter(
                (update) =>
                  !seenTaskUpdateIds.includes(update.id) &&
                  !hasSeenTarget("taskUpdate", update.id),
              );
              const taskPoints = sanitizePositiveNumber(task.points, 1);
              const taskAudienceLabel = task.scope === "all" ? "تاسك عام لكل التيم" : "تاسك مخصص ليك";
              const taskPointsLabel = formatTaskPointsLabel(taskPoints);
              const problemTask = isProblemTask(task);
              const taskSeen = hasSeenTarget("task", task.id);

              return (
                <article
                  key={task.id}
                  className={`border-[2.5px] border-ink p-4 doodle-shadow ${
                    existing?.status === "approved"
                      ? "bg-emerald-50"
                      : existing?.status === "submitted" || finalSent
                        ? "bg-yellow-50"
                        : existing?.status === "rejected"
                          ? "bg-red-50"
                          : "bg-card"
                  }`}
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-center">
                      <p className="mb-1 text-center text-sm font-bold text-foreground/60">
                        <span>{taskAudienceLabel}</span>
                        <span className="mx-1.5">•</span>
                        <span className="text-red-600">{taskPointsLabel}</span>
                        {problemTask && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="rounded-full border border-red-700 bg-red-50 px-2 py-0.5 text-red-700">
                              Problem
                            </span>
                          </>
                        )}
                      </p>
                      <div className="mb-2 flex w-full flex-wrap items-center justify-center gap-2 text-xs font-bold" dir="ltr">
                        <span className="rounded-full border-[2px] border-ink bg-white px-2.5 py-1">
                          deadline: {taskDeadlineLabel(task)}
                        </span>
                      </div>
                      <h2
                        className={cn("text-lg font-bold leading-tight sm:text-xl", textAlignClass(task.title), "text-center")}
                        dir={taskTitleDir}
                      >
                        {task.title}
                      </h2>
                    </div>
                    {existing && (
                      <span className="border-[2px] border-ink bg-paper px-3 py-1 text-sm font-bold doodle-shadow-sm">
                        {existing.status === "approved"
                          ? "تم القبول"
                          : existing.status === "rejected"
                            ? "اترفض - جاوب تاني"
                            : "مستني المراجعة"}
                      </span>
                    )}
                    {!existing && finalSent && (
                      <span className="border-[2px] border-ink bg-yellow-100 px-3 py-1 text-sm font-bold doodle-shadow-sm">
                        مستني مراجعة الأدمن
                      </span>
                    )}
                    {!taskSeen && !existing && !finalSent && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={markVisiblePageSeen}
                        className="border-[2px] border-ink bg-white"
                      >
                        <Eye data-icon="inline-start" />
                        Seen
                      </Button>
                    )}
                  </div>
                  <div
                    data-testid={`task-text-preview-${task.id}`}
                    className={cn(
                      "mb-4 w-full rounded-xl text-start leading-7 transition",
                      taskQuestionIsLong || taskQuestionHasSections
                        ? "border-[2px] border-ink/20 bg-paper/70 p-3 hover:border-ink/45 hover:bg-white"
                        : "border-0 bg-transparent p-0",
                      taskQuestionLooksLight ? "text-lg font-semibold leading-8" : "text-base",
                      textAlignClass(task.question),
                    )}
                    dir={taskQuestionDir}
                  >
                    <StructuredTextPreviewList
                      text={task.question}
                      onOpenSection={(sectionIndex) => openTaskDetails(task.id, sectionIndex)}
                    />
                    {false && (
                      <>
                    <StructuredTextBlock text={task.question} compact memberFacing />
                    {(taskQuestionIsLong || taskQuestionHasSections) && (
                      <button
                        type="button"
                      onClick={() => {
                            openTaskDetails(task.id, 0);
                          }}
                        className="mt-2 inline-flex rounded-full border border-ink/20 bg-white px-3 py-1 text-xs font-bold text-foreground/60"
                      >
                        افتح الكلام كله
                      </button>
                    )}
                    {taskUpdates.length > 0 && (
                      <span className="mt-2 block text-xs font-bold text-sky-700">
                        فيه {taskUpdates.length} تحديث إضافي
                      </span>
                    )}
                      </>
                    )}
                  </div>
                  {problemTask && (
                    <div className="mb-4 rounded-xl border-[2px] border-red-200 bg-red-50 p-3 text-red-950">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong>Problem mode</strong>
                          <p className="mt-1 text-xs font-bold text-red-900/65">
                            شوف اللي اتسلم قبلك عشان ما تكررش نفس الحل.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setProblemSolutionsTaskId(task.id)}
                          className="border-[2px] border-red-700 bg-white text-red-950"
                        >
                          <Eye data-icon="inline-start" />
                          شوف الحلول اللي قبلك
                        </Button>
                      </div>
                    </div>
                  )}
                  {taskUpdates.length > 0 && (
                    <div className="mb-4 rounded-xl border-[2px] border-sky-200 bg-sky-50 p-3 text-sky-950">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-base">Latest updates</strong>
                          {unseenTaskUpdates.length > 0 && (
                            <span className="rounded-full border border-yellow-700 bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-900">
                              New
                            </span>
                          )}
                        </div>
                        {unseenTaskUpdates.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={markVisiblePageSeen}
                            className="border border-sky-300 bg-white text-sky-950"
                          >
                            <Eye data-icon="inline-start" />
                            Seen
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2">
                        {taskUpdates.slice(0, 2).map((update) => (
                          <div
                            key={update.id}
                            className={cn("rounded-lg bg-white/75 p-2", textAlignClass(update.message))}
                            dir={textDirection(update.message)}
                          >
                            <StructuredTextBlock text={update.message} compact memberFacing />
                            <p className="mt-1 text-xs font-bold text-sky-900/55">
                              {formatDateTime(update.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                      {taskUpdates.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTaskId(task.id);
                            setCopyFeedback("");
                          }}
                          className="mt-2 text-xs font-bold text-sky-700 underline underline-offset-4"
                        >
                          Show all updates
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-base">اكتب الرد أو التحديث</strong>
                  </div>
                  <Textarea
                    value={sharedDraft}
                    onChange={(event) => {
                      onDraftChange(key, event.target.value);
                      onDraftChange(taskProgressKey, event.target.value);
                    }}
                    onPaste={problemTask ? (event) => blockProblemPaste(event, task.id) : undefined}
                    onDrop={problemTask ? (event) => blockProblemDrop(event, task.id) : undefined}
                    onBeforeInput={problemTask ? (event) => blockProblemBeforeInput(event, task.id) : undefined}
                    onContextMenu={problemTask ? (event) => event.preventDefault() : undefined}
                    placeholder="اكتب هنا الرد النهائي أو تحديث المتابعة..."
                    className={cn(
                      "min-h-20 border-[2px] border-ink bg-paper px-3 py-2 text-sm leading-6 sm:min-h-[88px]",
                      problemTask && "problem-answer-input",
                    )}
                  />
                  {pasteWarningTaskId === task.id && (
                    <div className="problem-paste-alert mt-2">
                      الباست محظور في problem. اكتب الحل بإيدك.
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      data-testid={`submit-final-${task.id}`}
                      onClick={() => {
                        if (!sharedDraft.trim()) {
                          blockMemberAction(key, ["answer"]);
                          return;
                        }
                        markTaskSeen(task.id);
                        void runMemberAction(
                          key,
                          () => onSubmitFinal(task),
                          problemTask
                            ? `تم التسليم. أنت رقم ${problemSubmissionRank(task)} في التسليم.`
                            : "Submitted. Waiting for admin review.",
                          "Submission failed. Try again.",
                        );
                      }}
                      disabled={!canAnswer || isSubmitting}
                      className={actionButtonClass(
                        "border-[2px] border-ink doodle-shadow-sm",
                        finalFeedback,
                      )}
                    >
                      <Save data-icon="inline-start" />
                      تسليم للمراجعة
                    </Button>
                    <Button
                      type="button"
                      data-testid={`submit-progress-${task.id}`}
                      onClick={() => {
                        if (!sharedDraft.trim()) {
                          blockMemberAction(taskProgressKey, ["progress note"]);
                          return;
                        }
                        markTaskSeen(task.id);
                        void runMemberAction(
                          taskProgressKey,
                          () => onSubmitProgress(task),
                          "Progress update sent.",
                          "Progress update failed. Try again.",
                        );
                      }}
                      disabled={isSubmitting}
                      variant="outline"
                      className={actionButtonClass(
                        "border-[2px] border-ink bg-yellow-200 text-yellow-950 hover:bg-yellow-300 doodle-shadow-sm",
                        progressFeedback,
                      )}
                    >
                      <Save data-icon="inline-start" />
                      إرسال متابعة
                    </Button>
                  </div>
                  <ActionFeedbackLine feedback={finalFeedback} />
                  <ActionFeedbackLine feedback={progressFeedback} />

                  {officialProgress.length > 0 && (
                    <div className="mt-4 border-t-[2px] border-ink/20 pt-3">
                      <div className="mb-2 grid gap-2">
                        {officialProgress.map((update) => (
                          <div key={update.id} className="border-[2px] border-ink bg-yellow-50 p-3">
                            <StructuredTextBlock text={update.note} compact />
                            <p className="mt-1 text-xs text-foreground/55">
                              محفوظ رسميًا: {new Date(update.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
        )}

        {memberTab === "tasks" && (
          <section
            className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
            style={{
              borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px",
              transform: "rotate(-0.3deg)",
            }}
          >
            <div className="mb-4 grid justify-items-center gap-2 text-center">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Caveat, cursive" }}>
                <span className="highlight-yellow">الترتيب</span>
              </h2>
              <div className="min-w-0 text-base font-bold leading-7 md:text-lg">
                <span className="highlight-blue">
                  {leaderboardLeaderHeadline(stats.memberStats)}
                </span>
              </div>
            </div>
            <Leaderboard scores={stats.memberStats} />
          </section>
        )}
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4 py-4">
          <section
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto border-[2.5px] border-ink bg-card p-3 doodle-shadow scrollbar-none"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold">
                <span className="highlight-yellow">Settings</span>
              </h2>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSettingsOpen(false)}
                className="size-9 shrink-0 border-[2px] border-ink bg-paper doodle-shadow-sm"
                aria-label="Close settings"
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="mb-2 text-sm text-foreground/65">الأسماء المتاحة للدخول:</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {loginAliases.map((alias) => (
                <span key={alias} className="border-[1.5px] border-ink bg-paper px-2 py-0.5 text-xs">
                  {alias}
                </span>
              ))}
            </div>

            <div className="mt-2 border-[2px] border-ink bg-paper p-3 text-sm leading-5">
              <label className="block font-bold" htmlFor="member-nickname">
                Nickname
              </label>
              <Input
                id="member-nickname"
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder="اكتب nickname جديد..."
                className="mt-1 border-[2px] border-ink bg-white"
              />
              <Button
                type="button"
                data-testid="nickname-request-submit"
                disabled={isSubmitting || !hasNicknameChange}
                onClick={() => {
                  if (!hasNicknameChange) {
                    blockMemberAction(nicknameActionKey, ["new nickname"]);
                    return;
                  }
                  void runMemberAction(
                    nicknameActionKey,
                    () =>
                      onProfileChangeRequest({
                        memberId: activeMember.member.id,
                        nickname: nicknameDraft.trim(),
                      }),
                    "Nickname request sent to admin.",
                    "Could not send nickname request.",
                  ).then((ok) => {
                    if (ok) setNicknameDraft("");
                  });
                }}
                className={actionButtonClass(
                  "mt-2 border-[2px] border-ink doodle-shadow-sm",
                  nicknameFeedback,
                )}
              >
                إرسال الاسم للأدمن
              </Button>
              <p className="mt-1 text-xs font-bold text-foreground/55">
                الاسم الجديد مش هيتضاف للدخول غير بعد موافقة الأدمن.
              </p>
              <ActionFeedbackLine feedback={nicknameFeedback} />

              <label className="mt-3 block border-t-[2px] border-ink/15 pt-2 font-bold" htmlFor="member-repo">
                GitHub repo
              </label>
              <Input
                id="member-repo"
                dir="ltr"
                value={repoDraft}
                onChange={(event) => setRepoDraft(event.target.value)}
                placeholder="https://github.com/user/repo"
                className="mt-1 border-[2px] border-ink bg-white text-left"
              />
              <label className="mt-3 block font-bold" htmlFor="member-drive">
                Drive link
              </label>
              <Input
                id="member-drive"
                dir="ltr"
                value={driveDraft}
                onChange={(event) => setDriveDraft(event.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1 border-[2px] border-ink bg-white text-left"
              />
              <p className="mt-1 text-xs text-foreground/55">
                Use this for designs, PDFs, videos, and non-code uploads.
              </p>
              <Button
                type="button"
                data-testid="profile-request-submit"
                disabled={isSubmitting}
                onClick={() => {
                  if (!hasProfileChange) {
                    blockMemberAction(profileActionKey, ["GitHub repo or Drive link change"]);
                    return;
                  }
                  void runMemberAction(
                    profileActionKey,
                    () =>
                      onProfileChangeRequest({
                        memberId: activeMember.member.id,
                        repoUrl: repoDraft.trim(),
                        driveUrl: driveDraft.trim(),
                      }),
                    "Links sent to admin.",
                    "Could not send links. Try again.",
                  );
                }}
                className={actionButtonClass(
                  "mt-3 border-[2px] border-ink doodle-shadow-sm",
                  profileFeedback,
                )}
              >
                <Bell data-icon="inline-start" />
                إرسال الروابط للأدمن
              </Button>
              <ActionFeedbackLine feedback={profileFeedback} />
              {activeMember.member.repoUrl ? (
                <Button
                  type="button"
                  onClick={() =>
                    window.open(activeMember.member.repoUrl, "_blank", "noopener,noreferrer")
                  }
                  className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                >
                  <ExternalLink data-icon="inline-start" />
                  فتح الريبو بتاعي
                </Button>
              ) : null}
              {activeMember.member.driveUrl ? (
                <Button
                  type="button"
                  onClick={() =>
                    window.open(activeMember.member.driveUrl, "_blank", "noopener,noreferrer")
                  }
                  className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                >
                  <FolderOpen data-icon="inline-start" />
                  Open my Drive
                </Button>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="mt-3 w-full border-[2px] border-ink bg-paper py-2 doodle-shadow-sm"
            >
              رجوع
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

type AdminSection =
  | "repo-updates"
  | "tasks"
  | "problems"
  | "meetings"
  | "members"
  | "hidden"
  | "logs"
  | "archive"
  | "settings";

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

const TEXT_SPLIT_DELIMITER = /\*{5,}/g;
const STRUCTURED_TEXT_CHAR_LIMIT = 260;
const STRUCTURED_TEXT_LINE_LIMIT = 5;

function splitMemberTextSections(text: string) {
  const sections = text
    .replace(/\r\n/g, "\n")
    .split(TEXT_SPLIT_DELIMITER)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.length > 0 ? sections : [text.trim()].filter(Boolean);
}

function cleanTextForMember(text: string) {
  return splitMemberTextSections(text).join("\n\n").trim();
}

function textNeedsCollapse(text: string) {
  const normalized = text.trim().replace(/\r\n/g, "\n");
  return (
    normalized.length > STRUCTURED_TEXT_CHAR_LIMIT ||
    normalized.split("\n").length > STRUCTURED_TEXT_LINE_LIMIT
  );
}

function structuredTextTitle(text: string, index: number) {
  const firstLine = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return `جزء ${index + 1}`;
  return firstLine.length > 58 ? `${firstLine.slice(0, 55)}...` : firstLine;
}

function buildTaskCopyText(task: StudioTask, updates: TaskAnnouncement[]) {
  const parts = [
    `Task: ${task.title}`,
    `Deadline: ${taskDeadlineLabel(task)}`,
    `Points: ${sanitizePositiveNumber(task.points, 1)}`,
    "",
    cleanTextForMember(task.question),
  ];

  if (updates.length > 0) {
    parts.push(
      "",
      "Task updates:",
      ...updates.map((update) => `${formatDateTime(update.createdAt)}\n${cleanTextForMember(update.message)}`),
    );
  }

  return parts.join("\n").trim();
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function TaskMessageBody({ text, compact = false }: { text: string; compact?: boolean }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className={cn("grid", compact ? "gap-1.5" : "gap-2.5")}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`${index}-space`} className={compact ? "h-1" : "h-2"} />;
        if (/^-{3,}$/.test(trimmed)) {
          return <div key={`${index}-rule`} className="my-2 border-t-[2px] border-ink/15" />;
        }

        const isNumbered = /^\d+[\).]\s+/.test(trimmed);
        const isBullet = /^[-*•]\s+/.test(trimmed);
        const isHeading =
          !isNumbered &&
          !isBullet &&
          trimmed.length <= 72 &&
          !/[.!?؟،,;:]$/.test(trimmed);
        const direction = textDirection(trimmed);

        return (
          <p
            key={`${index}-${trimmed.slice(0, 16)}`}
            dir={direction}
            className={cn(
              "break-words",
              textAlignClass(trimmed),
              isHeading
                ? compact
                  ? "text-base font-bold text-foreground"
                  : "mt-1 text-lg font-bold text-foreground"
                : compact
                  ? "text-sm leading-6 text-foreground/85"
                  : "text-base leading-8 text-foreground/90",
              isNumbered && "font-bold",
              isBullet && (direction === "rtl" ? "pe-3" : "ps-3"),
            )}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function StructuredTextBlock({
  text,
  compact = false,
  memberFacing = false,
  forceCollapse = false,
  defaultOpenIndex,
  className,
}: {
  text: string;
  compact?: boolean;
  memberFacing?: boolean;
  forceCollapse?: boolean;
  defaultOpenIndex?: number;
  className?: string;
}) {
  const rawText = text.trim();
  if (!rawText) return null;

  const sections = memberFacing ? splitMemberTextSections(rawText) : [rawText];
  const shouldRenderSections = memberFacing && sections.length > 1;

  if (!shouldRenderSections && !forceCollapse && !textNeedsCollapse(sections[0] ?? "")) {
    const content = sections[0] ?? rawText;
    return (
      <div className={cn("structured-text-inline", className)} dir={textDirection(content)}>
        <TaskMessageBody text={content} compact={compact} />
      </div>
    );
  }

  return (
    <div className={cn("structured-text-stack", className)}>
      {sections.map((section, index) => {
        const title = shouldRenderSections ? structuredTextTitle(section, index) : "عرض النص";
        const previewSource = section.replace(/\s+/g, " ").trim();
        const preview = previewSource.slice(0, 150);
        const previewIsTrimmed = previewSource.length > preview.length;

        return (
          <details
            key={`${index}-${section.slice(0, 24)}`}
            className="structured-text-details"
            dir={textDirection(section)}
            open={defaultOpenIndex === index}
          >
            <summary className="structured-text-summary">
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", textAlignClass(title))}>{title}</span>
                {preview && preview !== title && (
                  <span className={cn("structured-text-summary-preview", textAlignClass(section))}>
                    {preview}
                    {previewIsTrimmed ? "..." : ""}
                  </span>
                )}
              </span>
              <ChevronDown className="structured-text-chevron size-4" />
            </summary>
            <div className="structured-text-body">
              <TaskMessageBody text={section} compact={compact} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

function StructuredTextPreviewList({
  text,
  onOpenSection,
}: {
  text: string;
  onOpenSection: (sectionIndex: number) => void;
}) {
  const sections = splitMemberTextSections(text);

  return (
    <div className="grid gap-2">
      {sections.map((section, index) => {
        const title = sections.length > 1 ? structuredTextTitle(section, index) : "عرض النص";
        const previewSource = section.replace(/\s+/g, " ").trim();
        const preview = previewSource.slice(0, 150);
        const previewIsTrimmed = previewSource.length > preview.length;

        return (
          <button
            key={`${index}-${section.slice(0, 24)}`}
            type="button"
            onClick={() => onOpenSection(index)}
            className="structured-text-preview-button"
            dir={textDirection(section)}
          >
            <span className={cn("block truncate text-sm font-bold", textAlignClass(title))}>{title}</span>
            {preview && preview !== title && (
              <span className={cn("structured-text-summary-preview", textAlignClass(section))}>
                {preview}
                {previewIsTrimmed ? "..." : ""}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function toDateTimeInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function DateTimeField({
  label,
  value,
  onChange,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help: string;
  tone?: "neutral" | "deadline";
}) {
  return (
    <label
      className={`min-w-0 overflow-hidden rounded-xl border p-3 ${
        tone === "deadline"
          ? "border-yellow-200 bg-yellow-50"
          : "border-sky-100 bg-sky-50/70"
      }`}
    >
      <span className="mb-2 flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        <CalendarClock className="size-4" />
        {label}
      </span>
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block h-11 min-w-0 max-w-full border border-ink/20 bg-white px-3 text-left font-mono text-sm"
        dir="ltr"
      />
      <span className="mt-2 block max-w-full text-wrap break-words text-xs leading-5 text-foreground/55">{help}</span>
    </label>
  );
}

function calculateMeetingAttendance(meeting: Meeting, checkedAt = new Date().toISOString()) {
  const startTime = new Date(meeting.startsAt).getTime();
  const checkTime = new Date(checkedAt).getTime();
  const duration = Math.max(1, sanitizeNumber(meeting.durationMinutes) || 60);
  const lateMinutes =
    Number.isFinite(startTime) && Number.isFinite(checkTime)
      ? Math.max(0, Math.round((checkTime - startTime) / 60000))
      : 0;
  const billableLateMinutes = Math.max(0, lateMinutes - 10);
  const penaltyRate = Math.min(1, billableLateMinutes / duration);
  const score = Math.max(0, sanitizePositiveNumber(meeting.points, 1) * (1 - penaltyRate));

  return {
    lateMinutes,
    score: Math.round(score * 100) / 100,
  };
}

function containsGitHubSignal(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[ـ_\-.]+/g, " ")
    .trim();
  const compact = normalized.replace(/\s+/g, "");
  return (
    /\bgithub\b/.test(normalized) ||
    /\bgit\b/.test(normalized) ||
    compact.includes("جيتهاب") ||
    compact.includes("جيتهب") ||
    compact.includes("جتهاب") ||
    /\bجيت\b/u.test(normalized) ||
    /\bجت\b/u.test(normalized)
  );
}

function createRepoUpdateFromText({
  memberId,
  taskId,
  source,
  text,
}: {
  memberId: string;
  taskId?: string;
  source: RepoUpdate["source"];
  text: string;
}): RepoUpdate | null {
  if (!containsGitHubSignal(text)) return null;
  return {
    id: `repo-${source}-${memberId}-${taskId ?? "general"}-${Date.now()}`,
    memberId,
    taskId,
    source,
    excerpt: text.trim().slice(0, 140),
    createdAt: new Date().toISOString(),
    seen: false,
  };
}

function createAttentionUpdate({
  memberId,
  taskId,
  source,
  text,
}: {
  memberId: string;
  taskId?: string;
  source: RepoUpdate["source"];
  text: string;
}): RepoUpdate {
  return {
    id: `repo-${source}-${memberId}-${taskId ?? "general"}-${Date.now()}`,
    memberId,
    taskId,
    source,
    excerpt: text.trim().slice(0, 140),
    createdAt: new Date().toISOString(),
    seen: false,
  };
}

function appendRepoUpdateIfMissing(data: StudioData, update: RepoUpdate | null) {
  if (!update) return data;
  const exists = (data.repoUpdates ?? []).some(
    (item) =>
      item.memberId === update.memberId &&
      item.taskId === update.taskId &&
      item.source === update.source &&
      item.excerpt === update.excerpt,
  );
  if (exists) return data;
  return sanitizeData({ ...data, repoUpdates: [update, ...(data.repoUpdates ?? [])] });
}

function statusTone(status?: TaskResponse["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-950 border-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700 border-red-700";
  if (status === "submitted") return "bg-yellow-50 text-yellow-800 border-yellow-700";
  return "bg-zinc-50 text-foreground/65 border-ink/30";
}

type ActionFeedback = {
  tone: "error" | "pending" | "success";
  message: string;
};

type ActionResult = boolean | void | Promise<boolean | void>;

const ACTION_SUCCESS_CLASS =
  "border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.22)]";
const ACTION_SUCCESS_FLASH_MS = 2500;

function missingFieldsMessage(fields: string[]) {
  return `Missing: ${fields.join(", ")}. Fill ${fields.length === 1 ? "it" : "them"} and press again.`;
}

function actionButtonClass(baseClassName: string, feedback?: ActionFeedback, forceSuccess = false) {
  return cn(baseClassName, (forceSuccess || feedback?.tone === "success") && ACTION_SUCCESS_CLASS);
}

function ActionFeedbackLine({ feedback }: { feedback?: ActionFeedback }) {
  if (!feedback) return null;

  return (
    <p
      className={cn(
        "mt-2 rounded-md border px-3 py-2 text-xs font-bold",
        feedback.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        feedback.tone === "error" && "border-red-200 bg-red-50 text-red-700",
        feedback.tone === "pending" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {feedback.message}
    </p>
  );
}

function clearFeedbackAfterSuccess(
  key: string,
  feedback: ActionFeedback,
  setFeedback: Dispatch<SetStateAction<Record<string, ActionFeedback>>>,
) {
  if (feedback.tone !== "success" || typeof window === "undefined") return;
  window.setTimeout(() => {
    setFeedback((current) => {
      const active = current[key];
      if (active?.tone !== "success" || active.message !== feedback.message) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, ACTION_SUCCESS_FLASH_MS);
}

function CompactMetric({
  label,
  value,
  horizontal = false,
}: {
  label: string;
  value: string | number;
  horizontal?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-ink/10 bg-white px-4 py-3",
        horizontal ? "flex min-h-[84px] items-center justify-between gap-3 text-right" : "text-center",
      )}
    >
      <div className={cn("text-2xl font-bold leading-none", horizontal ? "shrink-0 text-3xl" : "mx-auto")}>{value}</div>
      <div
        className={cn(
          "text-xs font-medium text-foreground/55",
          horizontal ? "max-w-[9rem] text-sm leading-5 text-foreground/75" : "mt-1 text-center",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function AdminView({
  data,
  stats,
  saveStatus,
  isDirty,
  isSaving,
  adminQueue,
  queueStatus,
  tokenDialogOpen,
  tokenDraft,
  onLogout,
  onAddTask,
  onUpdateTask,
  onAddTaskUpdate,
  onAddMeeting,
  onUpdateMeeting,
  onRecordMeetingAttendance,
  onSetMeetingAttendanceScore,
  onRecalculateMeetingAttendanceScores,
  onRemoveMeeting,
  onRemoveTask,
  onManualApprove,
  onSkipTaskMember,
  onUnskipTaskMember,
  onApproveQueuedSubmission,
  onRejectQueuedSubmission,
  onSaveQueuedProgress,
  onDismissQueuedProgress,
  onAddProgressUpdate,
  onReviewAnswer,
  onAddBonusGrade,
  onUpdateMember,
  onUpdateSettings,
  onMarkRepoUpdateSeen,
  onReviewProfileRequest,
  onRefreshAdminQueue,
  onTokenDraftChange,
  onCloseTokenDialog,
  onConfirmTokenAndSave,
  onSaveToGithub,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  adminQueue: AdminQueue;
  queueStatus: string;
  tokenDialogOpen: boolean;
  tokenDraft: string;
  onLogout: () => void;
  onAddTask: (task: Omit<StudioTask, "id" | "createdAt">) => ActionResult;
  onUpdateTask: (taskId: string, updates: Partial<StudioTask>) => ActionResult;
  onAddTaskUpdate: (taskId: string, message: string) => ActionResult;
  onAddMeeting: (meeting: Omit<Meeting, "id" | "createdAt">) => ActionResult;
  onUpdateMeeting: (meetingId: string, updates: Partial<Meeting>) => ActionResult;
  onRecordMeetingAttendance: (meeting: Meeting, member: Member) => ActionResult;
  onSetMeetingAttendanceScore: (meeting: Meeting, member: Member, score: number) => ActionResult;
  onRecalculateMeetingAttendanceScores: (meeting: Meeting) => ActionResult;
  onRemoveMeeting: (meetingId: string) => ActionResult;
  onRemoveTask: (taskId: string) => ActionResult;
  onManualApprove: (task: StudioTask, memberId: string, awardedPoints?: number) => ActionResult;
  onSkipTaskMember: (task: StudioTask, memberId: string, note?: string) => ActionResult;
  onUnskipTaskMember: (task: StudioTask, memberId: string) => ActionResult;
  onApproveQueuedSubmission: (item: QueuedSubmission) => ActionResult;
  onRejectQueuedSubmission: (item: QueuedSubmission) => ActionResult;
  onSaveQueuedProgress: (item: QueuedProgressUpdate) => ActionResult;
  onDismissQueuedProgress: (id: string) => void;
  onAddProgressUpdate: (task: StudioTask, memberId: string, note: string) => ActionResult;
  onReviewAnswer: (
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note?: string,
    awardedPoints?: number,
    overrideLocked?: boolean,
  ) => ActionResult;
  onAddBonusGrade: (memberId: string, points: number, note: string) => ActionResult;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onMarkRepoUpdateSeen: (updateId: string) => ActionResult;
  onReviewProfileRequest: (requestId: string, status: "approved" | "rejected") => ActionResult;
  onRefreshAdminQueue: () => ActionResult;
  onTokenDraftChange: (value: string) => void;
  onCloseTokenDialog: () => void;
  onConfirmTokenAndSave: () => ActionResult;
  onSaveToGithub: () => ActionResult;
}) {
  const [section, setSection] = useState<AdminSection>("repo-updates");
  const [navOpen, setNavOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberIds, setTaskMemberIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<TaskType>("technical");
  const [taskStatusDraft, setTaskStatusDraft] = useState<"active" | "hidden">("active");
  const [taskStartAt, setTaskStartAt] = useState("");
  const [taskDeadlineAt, setTaskDeadlineAt] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingStartsAt, setMeetingStartsAt] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [meetingPoints, setMeetingPoints] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(data.members[0]?.id ?? "");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});
  const [manualApproveScores, setManualApproveScores] = useState<Record<string, string>>({});
  const [progressMembers, setProgressMembers] = useState<Record<string, string>>({});
  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const [bonusPointsDrafts, setBonusPointsDrafts] = useState<Record<string, string>>({});
  const [bonusNoteDrafts, setBonusNoteDrafts] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewScores, setReviewScores] = useState<Record<string, string>>({});
  const [meetingScoreDrafts, setMeetingScoreDrafts] = useState<Record<string, string>>({});
  const [skipNotes, setSkipNotes] = useState<Record<string, string>>({});
  const [taskEditDrafts, setTaskEditDrafts] = useState<
    Record<string, { title: string; question: string; points: string; taskType: TaskType; status: "active" | "hidden" | "archived"; scope: "all" | "member"; memberIds: string[] }>
  >({});
  const [taskUpdateDrafts, setTaskUpdateDrafts] = useState<Record<string, string>>({});
  const [logMode, setLogMode] = useState<"task" | "member">("task");
  const [query, setQuery] = useState("");
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});
  const [adminNowTime, setAdminNowTime] = useState(() => Date.now());
  const refreshAdminKey = "admin:refresh-data";
  const saveGithubKey = "admin:save-github";

  const activeTasks = data.tasks.filter(isActiveTask);
  const hiddenTasks = data.tasks.filter(isHiddenTask);
  const archivedTasks = data.tasks.filter((task) => taskStatus(task) === "archived");
  const problemTasks = data.tasks.filter((task) => isProblemTask(task) && !isHiddenTask(task));
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const archivedMeetings = (data.meetings ?? []).filter((meeting) => meetingStatus(meeting) === "archived");
  const visibleArchive = archivedTasks.filter((task) =>
    `${task.title} ${task.question}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedTask =
    data.tasks.find((task) => task.id === selectedTaskId) ?? activeTasks[0] ?? archivedTasks[0];
  const selectedProblemTask =
    (selectedTask && isProblemTask(selectedTask) && !isHiddenTask(selectedTask) ? selectedTask : undefined) ??
    problemTasks[0];
  const selectedMeeting =
    (data.meetings ?? []).find((meeting) => meeting.id === selectedMeetingId) ??
    activeMeetings[0] ??
    archivedMeetings[0];
  const selectedMember =
    data.members.find((member) => member.id === selectedMemberId) ?? data.members[0];
  const adminNowDate = useMemo(() => new Date(adminNowTime), [adminNowTime]);
  const pendingSubmissions = data.tasks.flatMap((task) =>
    isHiddenTask(task)
      ? []
      : Object.values(data.responses[task.id] ?? {})
      .filter((response) => response.status === "submitted")
      .map((response) => ({
        id: `${task.id}:${response.memberId}`,
        taskId: task.id,
        memberId: response.memberId,
        memberName: response.memberName,
        answer: response.answer,
        submittedAt: response.submittedAt,
      })),
  );
  const queuedProgress = adminQueue.progressUpdates;
  const unseenUpdates =
    data.repoUpdates?.filter((update) => {
      if (update.seen) return false;
      if (!update.taskId) return true;
      const task = data.tasks.find((item) => item.id === update.taskId);
      return !task || !isHiddenTask(task);
    }) ?? [];
  const pendingProfileRequests = (data.profileRequests ?? []).filter(
    (request) => request.status === "pending",
  );

  useEffect(() => {
    setSection((current) => {
      return current;
    });
  }, [pendingProfileRequests.length, pendingSubmissions.length, unseenUpdates.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setAdminNowTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  function go(nextSection: AdminSection) {
    setSection(nextSection);
    setNavOpen(false);
  }

  function openAdminEntity(type: "task" | "problem" | "meeting", id: string) {
    if (type === "meeting") {
      const meeting = (data.meetings ?? []).find((item) => item.id === id);
      if (!meeting) return;
      setSelectedMeetingId(id);
      setSection(meetingStatus(meeting) === "archived" ? "archive" : "meetings");
      setNavOpen(false);
      return;
    }

    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;
    setSelectedTaskId(id);
    if (isHiddenTask(task)) {
      setSection("hidden");
    } else if (taskStatus(task) === "archived") {
      setSection("archive");
    } else if (isProblemTask(task) || type === "problem") {
      setSection("problems");
    } else {
      setSection("tasks");
    }
    setNavOpen(false);
  }

  function renderMemberLinkButtons(member?: Member) {
    if (!member?.repoUrl && !member?.driveUrl) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {member.repoUrl && (
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              window.open(member.repoUrl, "_blank", "noopener,noreferrer");
            }}
            className="bg-sky-500 text-white hover:bg-sky-600"
          >
            <ExternalLink data-icon="inline-start" />
            Repo
          </Button>
        )}
        {member.driveUrl && (
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              window.open(member.driveUrl, "_blank", "noopener,noreferrer");
            }}
            className="bg-sky-500 text-white hover:bg-sky-600"
          >
            <FolderOpen data-icon="inline-start" />
            Drive
          </Button>
        )}
      </div>
    );
  }

  function setAdminFeedback(key: string, feedback: ActionFeedback) {
    setActionFeedback((current) => ({ ...current, [key]: feedback }));
    clearFeedbackAfterSuccess(key, feedback, setActionFeedback);
  }

  function blockAdminAction(key: string, fields: string[]) {
    setAdminFeedback(key, { tone: "error", message: missingFieldsMessage(fields) });
  }

  async function runAdminAction(
    key: string,
    action: () => ActionResult,
    successMessage = "Done.",
    failureMessage = "Action failed. Try again.",
  ) {
    setAdminFeedback(key, { tone: "pending", message: "Submitting..." });
    const result = await action();
    const ok = result !== false;
    setAdminFeedback(key, {
      tone: ok ? "success" : "error",
      message: ok ? successMessage : failureMessage,
    });
    return ok;
  }

  async function submitTask() {
    const cleanMemberIds = uniqueText(taskMemberIds).filter((memberId) =>
      data.members.some((member) => member.id === memberId),
    );
    const allSelected = areAllMembersSelected(cleanMemberIds);
    const effectiveScope = allSelected ? "all" : "member";
    const missing = [
      !taskTitle.trim() ? "task title" : "",
      !taskQuestion.trim() ? "question or instructions" : "",
      effectiveScope === "member" && cleanMemberIds.length === 0 ? "at least one member" : "",
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      blockAdminAction("admin:add-task", missing);
      return;
    }

    const ok = await runAdminAction(
      "admin:add-task",
        () =>
          onAddTask({
            title: taskTitle.trim(),
            question: taskQuestion.trim(),
            points: Math.max(1, Number.isFinite(taskPoints) ? taskPoints : 1),
            taskType,
            scope: effectiveScope,
            memberId: effectiveScope === "member" ? cleanMemberIds[0] : undefined,
            memberIds: effectiveScope === "member" ? cleanMemberIds : [],
            startAt: fromDateTimeInputValue(taskStartAt) || new Date().toISOString(),
            deadlineAt: taskType === "technical" ? "" : fromDateTimeInputValue(taskDeadlineAt),
            status: taskStatusDraft,
          }),
      taskStatusDraft === "hidden" ? "Hidden item prepared." : "Task added.",
      "Task was not added. Try again.",
    );
    if (!ok) return;
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
    setTaskScope("all");
    setTaskMemberIds([]);
    setTaskType("technical");
    setTaskStatusDraft("active");
    setTaskStartAt("");
    setTaskDeadlineAt("");
  }

  async function submitMeeting() {
    if (!meetingTitle.trim()) {
      blockAdminAction("admin:add-meeting", ["meeting title"]);
      return;
    }
    const ok = await runAdminAction(
      "admin:add-meeting",
      () =>
        onAddMeeting({
          title: meetingTitle.trim(),
          startsAt: fromDateTimeInputValue(meetingStartsAt) || new Date().toISOString(),
          durationMinutes: sanitizeNumber(meetingDuration) || 60,
          points: sanitizePositiveNumber(meetingPoints, 1),
          status: "active",
        }),
      "Meeting added.",
      "Meeting was not added. Try again.",
    );
    if (!ok) return;
    setMeetingTitle("");
    setMeetingStartsAt("");
    setMeetingDuration(60);
    setMeetingPoints(1);
  }

  function prepareTaskForMember(member: Member) {
    setTaskScope("member");
    setTaskMemberIds([member.id]);
    setTaskTitle("");
    setTaskQuestion("");
    setSection("tasks");
    setNavOpen(false);
  }

  function prepareNewProblem() {
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
    setTaskScope("all");
    setTaskMemberIds([]);
    setTaskType("problem");
    setTaskStatusDraft("active");
    setTaskStartAt("");
    setTaskDeadlineAt("");
    setSection("tasks");
    setNavOpen(false);
  }

  function assignedMembers(task: StudioTask) {
    return data.members.filter((member) => taskIsForMember(task, member.id));
  }

  function effectiveAssignedMembers(task: StudioTask) {
    return assignedMembers(task).filter((member) => !isTaskSkipped(data, task.id, member.id));
  }

  function selectedMemberIdsForTask(task: StudioTask) {
    if (task.scope === "all") return data.members.map((member) => member.id);
    return uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []));
  }

  function allTaskMemberIds() {
    return data.members.map((member) => member.id);
  }

  function areAllMembersSelected(memberIds: string[]) {
    const allIds = allTaskMemberIds();
    return allIds.length > 0 && allIds.every((memberId) => memberIds.includes(memberId));
  }

  function taskAudienceLabel(task: StudioTask) {
    if (task.scope === "all") return "All team";
    const memberIds = selectedMemberIdsForTask(task);
    if (memberIds.length === 1) {
      return data.members.find((member) => member.id === memberIds[0])?.name ?? "One member";
    }
    return `${memberIds.length} members`;
  }

  function bonusGradesForMember(memberId: string) {
    return (data.bonusGrades ?? []).filter((bonus) => bonus.memberId === memberId);
  }

  async function submitBonusGrade(member: Member) {
    const points = sanitizeNumber(bonusPointsDrafts[member.id]);
    const note = (bonusNoteDrafts[member.id] ?? "").trim();
    const key = `admin:add-bonus:${member.id}`;
    const missing = [
      points === 0 ? "bonus points" : "",
      !note ? "bonus note" : "",
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      blockAdminAction(key, missing);
      return;
    }
    const ok = await runAdminAction(
      key,
      () => onAddBonusGrade(member.id, points, note),
      "Bonus saved.",
      "Bonus was not saved.",
    );
    if (!ok) return;
    setBonusPointsDrafts((current) => ({ ...current, [member.id]: "" }));
    setBonusNoteDrafts((current) => ({ ...current, [member.id]: "" }));
  }

  function toggleTaskMemberDraft(memberId: string) {
    setTaskScope("member");
    setTaskMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function toggleAllTaskMembers(checked: boolean) {
    setTaskScope(checked ? "all" : "member");
    setTaskMemberIds(checked ? allTaskMemberIds() : []);
  }

  function taskEditDraft(task: StudioTask) {
    return (
      taskEditDrafts[task.id] ?? {
        title: task.title,
        question: task.question,
        points: String(sanitizePositiveNumber(task.points, 1)),
        taskType: normalizedTaskType(task),
        status: taskStatus(task),
        scope: task.scope,
        memberIds: task.scope === "member" ? selectedMemberIdsForTask(task) : [],
      }
    );
  }

  function updateTaskEditDraft(
    task: StudioTask,
    updates: Partial<{ title: string; question: string; points: string; taskType: TaskType; status: "active" | "hidden" | "archived"; scope: "all" | "member"; memberIds: string[] }>,
  ) {
    setTaskEditDrafts((current) => ({
      ...current,
      [task.id]: { ...taskEditDraft(task), ...updates },
    }));
  }

  function resetTaskEditDraft(taskId: string) {
    setTaskEditDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }

  function toggleTaskEditMember(task: StudioTask, memberId: string) {
    const draft = taskEditDraft(task);
    const memberIds = draft.memberIds.includes(memberId)
      ? draft.memberIds.filter((id) => id !== memberId)
      : [...draft.memberIds, memberId];
    updateTaskEditDraft(task, {
      scope: areAllMembersSelected(memberIds) ? "all" : "member",
      memberIds,
    });
  }

  function toggleAllTaskEditMembers(task: StudioTask, checked: boolean) {
    updateTaskEditDraft(task, {
      scope: checked ? "all" : "member",
      memberIds: checked ? allTaskMemberIds() : [],
    });
  }

  function taskMetric(task: StudioTask) {
    const members = effectiveAssignedMembers(task);
    const memberIds = new Set(members.map((member) => member.id));
    const responses = Object.values(data.responses[task.id] ?? {}).filter((response) =>
      memberIds.has(response.memberId),
    );
    return {
      expected: members.filter((member) => !member.hidden).length,
      received: responses.length,
      approved: responses.filter((response) => response.status === "approved").length,
      rejected: responses.reduce((sum, response) => sum + rejectionCount(response), 0),
      pending: responses.filter((response) => response.status === "submitted").length,
    };
  }

  function renderTaskRows(tasks: StudioTask[]) {
    if (tasks.length === 0) {
      return <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">No tasks here yet.</p>;
    }

    return (
      <div className="grid gap-2">
        {tasks.map((task) => {
          const metric = taskMetric(task);
          const isSelected = selectedTask?.id === task.id;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTaskId(task.id)}
              className={`min-w-0 rounded-lg border p-3 text-start transition hover:border-ink/40 hover:bg-white ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-ink/10 bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-lg font-bold">{task.title}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {taskAudienceLabel(task)}{" "}
                    | {task.points || 1} pts | deadline {taskDeadlineLabel(task)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                  {metric.received}/{metric.expected}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/60">
                <span>Pending {metric.pending}</span>
                <span>Approved {metric.approved}</span>
                <span>Rejected {metric.rejected}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function responseStatusLabel(status?: TaskResponse["status"]) {
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    if (status === "submitted") return "Pending";
    return "Missing";
  }

  function problemSolutionsForTask(task: StudioTask) {
    return Object.values(data.responses[task.id] ?? {}).sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    );
  }

  function renderHiddenRows(tasks: StudioTask[]) {
    if (tasks.length === 0) {
      return <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">No hidden items prepared.</p>;
    }

    return (
      <div className="grid gap-2">
        {tasks.map((task) => {
          const metric = taskMetric(task);
          const isSelected = selectedTask?.id === task.id;
          const publishKey = `admin:publish-hidden:${task.id}`;
          const deleteKey = `admin:delete-hidden:${task.id}`;
          return (
            <div
              key={task.id}
              className={`min-w-0 rounded-lg border p-3 transition ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-ink/10 bg-white/70"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className="w-full text-start"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-lg font-bold">{task.title}</div>
                    <div className="mt-1 text-xs text-foreground/55">
                      {taskTypeLabel(task)} | {taskAudienceLabel(task)} | {task.points || 1} pts
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-600">
                    Hidden
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/60">
                  <span>Pending {metric.pending}</span>
                  <span>Approved {metric.approved}</span>
                  <span>Rejected {metric.rejected}</span>
                </div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void runAdminAction(
                      publishKey,
                      () => onUpdateTask(task.id, { status: "active" }),
                      "Published.",
                      "Publish failed.",
                    )
                  }
                  className={actionButtonClass("bg-emerald-600 text-white hover:bg-emerald-700", actionFeedback[publishKey])}
                >
                  <Eye data-icon="inline-start" />
                  Publish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!window.confirm("Delete this hidden item and all linked data?")) return;
                    void runAdminAction(deleteKey, () => onRemoveTask(task.id), "Deleted.", "Delete failed.");
                  }}
                  className={actionButtonClass("border border-red-200 bg-red-50 text-red-700", actionFeedback[deleteKey])}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderProblemRows(tasks: StudioTask[]) {
    if (tasks.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">
          No problems here yet.
        </p>
      );
    }

    return (
      <div className="grid gap-2">
        {tasks.map((task) => {
          const responses = problemSolutionsForTask(task);
          const pending = responses.filter((response) => response.status === "submitted").length;
          const approved = responses.filter((response) => response.status === "approved").length;
          const rejected = responses.filter((response) => response.status === "rejected").length;
          const isSelected = selectedProblemTask?.id === task.id;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTaskId(task.id)}
              className={cn(
                "min-w-0 rounded-lg border p-3 text-start transition hover:border-red-300 hover:bg-white",
                isSelected ? "border-red-400 bg-red-50 shadow-sm" : "border-ink/10 bg-white/70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-lg font-bold">{task.title}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {taskStatus(task)} | {assignedMembers(task).length} members | deadline{" "}
                    {taskDeadlineLabel(task)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700">
                  {responses.length} solutions
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/60">
                <span>Pending {pending}</span>
                <span>Approved {approved}</span>
                <span>Rejected {rejected}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderProblemDetail(task?: StudioTask) {
    if (!task) {
      return (
        <section className="rounded-xl border border-dashed border-ink/20 bg-white p-5 text-sm text-foreground/55">
          Pick a problem to inspect its submitted solutions.
        </section>
      );
    }

    const responses = problemSolutionsForTask(task);
    const members = assignedMembers(task);
    const archiveTaskKey = `admin:problem-archive:${task.id}`;
    const restoreTaskKey = `admin:problem-restore:${task.id}`;
    const deleteTaskKey = `admin:problem-delete:${task.id}`;

    return (
      <section className="min-w-0 rounded-xl border border-red-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-700 bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                Problem
              </span>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {taskStatus(task)}
              </span>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {members.length} assigned
              </span>
            </div>
            <h2 className="mt-2 break-words text-2xl font-bold">{task.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
              <span>Deadline {taskDeadlineLabel(task)}</span>
              <span>{sanitizePositiveNumber(task.points, 1)} points</span>
              <span>{responses.length} submitted solutions</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActiveTask(task) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAdminAction(
                    archiveTaskKey,
                    () => onUpdateTask(task.id, { status: "archived" }),
                    "Problem archived.",
                    "Archive failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20 bg-paper", actionFeedback[archiveTaskKey])}
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  void runAdminAction(
                    restoreTaskKey,
                    () => onUpdateTask(task.id, { status: "active" }),
                    isHiddenTask(task) ? "Problem published." : "Problem restored.",
                    isHiddenTask(task) ? "Publish failed. Try again." : "Restore failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20", actionFeedback[restoreTaskKey])}
              >
                {isHiddenTask(task) ? <Eye data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
                {isHiddenTask(task) ? "Publish" : "Restore"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                void runAdminAction(
                  deleteTaskKey,
                  () => onRemoveTask(task.id),
                  "Problem deleted with all linked data.",
                  "Delete failed. Try again.",
                )
              }
              className={actionButtonClass(
                "border border-red-200 bg-red-50 text-red-700",
                actionFeedback[deleteTaskKey],
              )}
              aria-label="Delete problem"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-ink/10 bg-paper p-3">
          <div className="mb-2 text-sm font-bold text-foreground/60">Problem text</div>
          <StructuredTextBlock text={task.question} compact forceCollapse className="text-sm" />
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold">Submitted solutions</h3>
            <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-bold">
              oldest first
            </span>
          </div>
          {responses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink/20 bg-paper p-4 text-sm text-foreground/55">
              No one submitted a solution yet.
            </p>
          ) : (
            responses.map((response, index) => {
              const member = data.members.find((item) => item.id === response.memberId);
              const reviewNoteKey = `${task.id}:${response.memberId}`;
              const reviewNote = reviewNotes[reviewNoteKey] ?? "";
              const scoreValue =
                reviewScores[reviewNoteKey] ??
                String(calculateAwardedPoints(task, response, "approved"));
              const approveKey = `admin:problem-approve:${task.id}:${response.memberId}`;
              const rejectKey = `admin:problem-reject:${task.id}:${response.memberId}`;

              return (
                <article
                  key={response.memberId}
                  className={cn(
                    "rounded-lg border p-3",
                    response.status === "approved"
                      ? "border-emerald-200 bg-emerald-50"
                      : response.status === "rejected"
                        ? "border-red-200 bg-red-50"
                        : "border-yellow-200 bg-yellow-50",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-ink/20 bg-white px-2 py-1 text-xs font-bold">
                          #{index + 1}
                        </span>
                        <strong>{member ? memberArabicName(member) : response.memberName}</strong>
                        <span className={cn("rounded-full border px-2 py-1 text-xs font-bold", statusTone(response.status))}>
                          {responseStatusLabel(response.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-foreground/50">
                        {formatDateTime(response.submittedAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-ink/10 bg-white px-2 py-1 text-xs font-bold">
                      {responseAwardedPoints(task, response)}/{sanitizePositiveNumber(task.points, 1)} pts
                    </span>
                  </div>

                  <StructuredTextBlock
                    text={response.answer}
                    compact
                    forceCollapse
                    className="mt-3 rounded-md border border-ink/10 bg-white p-2"
                  />

                  <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
                    <Input
                      value={reviewNote}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [reviewNoteKey]: event.target.value,
                        }))
                      }
                      placeholder="Review note"
                      className="border border-ink/20 bg-white"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={scoreValue}
                      onChange={(event) =>
                        setReviewScores((current) => ({
                          ...current,
                          [reviewNoteKey]: event.target.value,
                        }))
                      }
                      placeholder="Score"
                      className="border border-ink/20 bg-white text-center"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        void runAdminAction(
                          approveKey,
                          () =>
                            onReviewAnswer(
                              task.id,
                              response.memberId,
                              "approved",
                              reviewNote,
                              sanitizeScore(scoreValue, sanitizePositiveNumber(task.points, 1)),
                              true,
                            ),
                          "Solution approved.",
                          "Approve failed. Try again.",
                        )
                      }
                      className={actionButtonClass("", actionFeedback[approveKey])}
                    >
                      <Check data-icon="inline-start" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void runAdminAction(
                          rejectKey,
                          () => onReviewAnswer(task.id, response.memberId, "rejected", reviewNote),
                          "Solution rejected.",
                          "Reject failed. Try again.",
                        )
                      }
                      className={actionButtonClass(
                        "border border-red-200 bg-white text-red-700",
                        actionFeedback[rejectKey],
                      )}
                    >
                      <X data-icon="inline-start" />
                      Reject
                    </Button>
                  </div>
                  <ActionFeedbackLine feedback={actionFeedback[approveKey] ?? actionFeedback[rejectKey]} />
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  function renderTaskDetail(task?: StudioTask) {
    if (!task) return null;
    const members = assignedMembers(task);
    const responses = data.responses[task.id] ?? {};
    const selectedManualMember = manualApproveMembers[task.id] ?? "";
    const selectedManualScore = manualApproveScores[task.id] ?? String(sanitizePositiveNumber(task.points, 1));
    const selectedProgressMember = progressMembers[task.id] ?? "";
    const progressNote = progressNotes[task.id] ?? "";
    const manualApproveKey = `admin:manual-approve:${task.id}`;
    const addProgressKey = `admin:add-progress:${task.id}`;
    const saveTaskKey = `admin:save-task:${task.id}`;
    const archiveTaskKey = `admin:archive-task:${task.id}`;
    const restoreTaskKey = `admin:restore-task:${task.id}`;
    const deleteTaskKey = `admin:delete-task:${task.id}`;
    const taskUpdateKey = `admin:task-update:${task.id}`;
    const editDraft = taskEditDraft(task);
    const taskUpdateDraft = taskUpdateDrafts[task.id] ?? "";
    const taskUpdates = data.taskUpdates?.[task.id] ?? [];

    return (
      <section className="min-w-0 rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-2xl font-bold">{task.title}</h3>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {taskStatus(task)}
              </span>
            </div>
            <StructuredTextBlock
              text={task.question}
              compact
              forceCollapse
              className="mt-2 max-w-2xl text-foreground/75"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
              <span>Start: {formatDateTime(task.startAt)}</span>
              <span>Deadline: {taskDeadlineLabel(task)}</span>
              <span>{task.points || 1} points</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActiveTask(task) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAdminAction(
                    archiveTaskKey,
                    () => onUpdateTask(task.id, { status: "archived" }),
                    "Task archived.",
                    "Archive failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20 bg-paper", actionFeedback[archiveTaskKey])}
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  void runAdminAction(
                    restoreTaskKey,
                    () => onUpdateTask(task.id, { status: "active" }),
                    isHiddenTask(task) ? "Task published." : "Task restored.",
                    isHiddenTask(task) ? "Publish failed. Try again." : "Restore failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20", actionFeedback[restoreTaskKey])}
              >
                {isHiddenTask(task) ? <Eye data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
                {isHiddenTask(task) ? "Publish" : "Restore"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                void runAdminAction(
                  deleteTaskKey,
                  () => onRemoveTask(task.id),
                  "Task deleted.",
                  "Delete failed. Try again.",
                )
              }
              className={actionButtonClass(
                "border border-red-200 bg-red-50 text-red-700",
                actionFeedback[deleteTaskKey],
              )}
              aria-label="Delete task"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <DateTimeField
            label="Start"
            value={toDateTimeInputValue(task.startAt)}
            onChange={(value) => onUpdateTask(task.id, { startAt: fromDateTimeInputValue(value) })}
            help="Start controls when this assignment opens."
          />
          {isTechnicalTask(task) ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
              Technical task: no deadline, no late penalty, no hard lock.
            </div>
          ) : (
            <DateTimeField
              label="Deadline"
              value={toDateTimeInputValue(task.deadlineAt)}
              onChange={(value) => onUpdateTask(task.id, { deadlineAt: fromDateTimeInputValue(value) })}
              help="After deadline: default half score. After double time: locked unless overridden."
              tone="deadline"
            />
          )}
        </div>

        <div className="mt-4 rounded-lg border border-ink/10 bg-paper p-3">
          <div className="mb-3 flex items-center gap-2 font-bold">
            <ClipboardList className="size-4" />
            Edit task
          </div>
          <div className="grid gap-3">
            <Input
              value={editDraft.title}
              onChange={(event) => updateTaskEditDraft(task, { title: event.target.value })}
              placeholder="Task title"
              className="border border-ink/20 bg-white"
            />
            <Textarea
              value={editDraft.question}
              onChange={(event) => updateTaskEditDraft(task, { question: event.target.value })}
              placeholder="Question or instructions"
              className="min-h-24 border border-ink/20 bg-white"
            />
            <div className="flex rounded-lg border border-ink/20 bg-white p-1 text-sm font-bold">
              {(["technical", "nonTechnical", "problem"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateTaskEditDraft(task, { taskType: type })}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 transition",
                    editDraft.taskType === type ? "bg-ink text-white" : "text-foreground/65 hover:bg-paper",
                  )}
                >
                  {taskTypeOptionLabel(type)}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-ink/20 bg-white p-1 text-sm font-bold">
              {(["active", "hidden", "archived"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateTaskEditDraft(task, { status })}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 capitalize transition",
                    editDraft.status === status ? "bg-ink text-white" : "text-foreground/65 hover:bg-paper",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[140px_1fr]">
              <Input
                type="number"
                min={1}
                value={editDraft.points}
                onChange={(event) => updateTaskEditDraft(task, { points: event.target.value })}
                placeholder="Points"
                className="border border-ink/20 bg-white"
              />
              <div className="grid gap-2 rounded-md border border-ink/20 bg-white p-2 text-sm">
                        <label className="flex h-8 items-center gap-2 font-bold">
                          <input
                            type="checkbox"
                            checked={areAllMembersSelected(editDraft.memberIds)}
                            onChange={(event) => toggleAllTaskEditMembers(task, event.target.checked)}
                          />
                          All team
                        </label>
                        <div className="max-h-36 overflow-auto border-t border-ink/10 pt-2">
                          {data.members.map((member) => (
                            <label key={member.id} className="flex h-8 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editDraft.memberIds.includes(member.id)}
                                onChange={() => toggleTaskEditMember(task, member.id)}
                              />
                              <span className="truncate">{member.name}</span>
                            </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  const cleanMemberIds = uniqueText(editDraft.memberIds).filter((memberId) =>
                    data.members.some((member) => member.id === memberId),
                  );
                  const allSelected = areAllMembersSelected(cleanMemberIds);
                  const effectiveScope = allSelected ? "all" : "member";
                  const missing = [
                    !editDraft.title.trim() ? "task title" : "",
                    !editDraft.question.trim() ? "question or instructions" : "",
                    effectiveScope === "member" && cleanMemberIds.length === 0 ? "at least one member" : "",
                  ].filter((field): field is string => Boolean(field));
                  if (missing.length > 0) {
                    blockAdminAction(saveTaskKey, missing);
                    return;
                  }
                  void runAdminAction(
                    saveTaskKey,
                    () =>
                      onUpdateTask(task.id, {
                        title: editDraft.title.trim(),
                        question: editDraft.question.trim(),
                        points: sanitizePositiveNumber(editDraft.points, sanitizePositiveNumber(task.points, 1)),
                        taskType: editDraft.taskType,
                        deadlineAt: editDraft.taskType === "technical" ? "" : task.deadlineAt,
                        status: editDraft.status,
                        scope: effectiveScope,
                        memberId: effectiveScope === "member" ? cleanMemberIds[0] : undefined,
                        memberIds: effectiveScope === "member" ? cleanMemberIds : [],
                      }),
                    "Task updated.",
                    "Task update failed. Try again.",
                  ).then((ok) => {
                    if (ok) resetTaskEditDraft(task.id);
                  });
                }}
                className={actionButtonClass("", actionFeedback[saveTaskKey])}
              >
                <Save data-icon="inline-start" />
                Save task
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetTaskEditDraft(task.id)}
                className="border border-ink/20 bg-white"
              >
                Reset
              </Button>
            </div>
            <ActionFeedbackLine feedback={actionFeedback[saveTaskKey]} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3">
          <div className="mb-3 flex items-center gap-2 font-bold text-sky-950">
            <Bell className="size-4" />
            Send task update
          </div>
          <Textarea
            value={taskUpdateDraft}
            onChange={(event) =>
              setTaskUpdateDrafts((current) => ({
                ...current,
                [task.id]: event.target.value,
              }))
            }
            placeholder="اكتب تحديث جديد يظهر للناس فوق التاسك من غير ما تغير الوصف الأصلي..."
            className="min-h-20 border border-sky-200 bg-white"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              data-testid={`admin-add-task-update-${task.id}`}
              onClick={() => {
                if (!taskUpdateDraft.trim()) {
                  blockAdminAction(taskUpdateKey, ["task update message"]);
                  return;
                }
                void runAdminAction(
                  taskUpdateKey,
                  () => onAddTaskUpdate(task.id, taskUpdateDraft.trim()),
                  "Task update sent.",
                  "Task update failed. Try again.",
                ).then((ok) => {
                  if (ok) {
                    setTaskUpdateDrafts((current) => ({ ...current, [task.id]: "" }));
                  }
                });
              }}
              className={actionButtonClass("bg-sky-500 text-white hover:bg-sky-600", actionFeedback[taskUpdateKey])}
            >
              <Bell data-icon="inline-start" />
              Send update
            </Button>
            <span className="text-xs font-bold text-sky-900/65">
              ده إضافة جديدة للتاسك، مش تعديل على الكلام القديم.
            </span>
          </div>
          <ActionFeedbackLine feedback={actionFeedback[taskUpdateKey]} />
          {taskUpdates.length > 0 && (
            <div className="mt-3 grid gap-2 border-t border-sky-200 pt-3">
              {taskUpdates.map((update) => (
                <div key={update.id} className="rounded-md border border-sky-200 bg-white p-2 text-sm">
                  <StructuredTextBlock text={update.message} compact forceCollapse />
                  <p className="mt-1 text-xs font-bold text-foreground/45">
                    {formatDateTime(update.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-ink/10 bg-paper p-3">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <Star className="size-4" />
              Manual approval
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_140px_auto]">
              <select
                value={selectedManualMember}
                onChange={(event) =>
                  setManualApproveMembers((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              >
                <option value="">Choose member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={selectedManualScore}
                onChange={(event) =>
                  setManualApproveScores((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
                placeholder="Score"
                className="h-10 border border-ink/20 bg-white"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!selectedManualMember) {
                    blockAdminAction(manualApproveKey, ["member"]);
                    return;
                  }
                  void runAdminAction(
                    manualApproveKey,
                    () =>
                      onManualApprove(
                        task,
                        selectedManualMember,
                        sanitizeScore(selectedManualScore, sanitizePositiveNumber(task.points, 1)),
                      ),
                    "Manual approval saved.",
                    "Manual approval failed. Try again.",
                  );
                }}
                className={actionButtonClass("", actionFeedback[manualApproveKey])}
              >
                <Check data-icon="inline-start" />
                Approve
              </Button>
            </div>
            <ActionFeedbackLine feedback={actionFeedback[manualApproveKey]} />
          </div>

          <div className="rounded-lg border border-ink/10 bg-yellow-50 p-3">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <Bell className="size-4" />
              Progress update
            </div>
            <div className="grid gap-2">
              <select
                value={selectedProgressMember}
                onChange={(event) =>
                  setProgressMembers((current) => ({ ...current, [task.id]: event.target.value }))
                }
                className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              >
                <option value="">Choose member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={progressNote}
                  onChange={(event) =>
                    setProgressNotes((current) => ({ ...current, [task.id]: event.target.value }))
                  }
                  placeholder="Quick note"
                  className="border border-ink/20 bg-white"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const missing = [
                      !selectedProgressMember ? "member" : "",
                      !progressNote.trim() ? "quick note" : "",
                    ].filter((field): field is string => Boolean(field));
                    if (missing.length > 0) {
                      blockAdminAction(addProgressKey, missing);
                      return;
                    }
                    void runAdminAction(
                      addProgressKey,
                      () => onAddProgressUpdate(task, selectedProgressMember, progressNote),
                      "Progress update added.",
                      "Progress update failed. Try again.",
                    ).then((ok) => {
                      if (ok) setProgressNotes((current) => ({ ...current, [task.id]: "" }));
                    });
                  }}
                  className={actionButtonClass(
                    "bg-yellow-100 text-foreground hover:bg-yellow-200",
                    actionFeedback[addProgressKey],
                  )}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
              <ActionFeedbackLine feedback={actionFeedback[addProgressKey]} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {members.map((member) => {
            const response = responses[member.id];
            const reviewNoteKey = `${task.id}:${member.id}`;
            const reviewNote = reviewNotes[reviewNoteKey] ?? "";
            const manualScoreKey = `manual:${task.id}:${member.id}`;
            const manualScore =
              manualApproveScores[manualScoreKey] ?? String(sanitizePositiveNumber(task.points, 1));
            const scoreValue =
              reviewScores[reviewNoteKey] ??
              (response ? String(calculateAwardedPoints(task, response, "approved")) : "");
            const skipNote = skipNotes[reviewNoteKey] ?? "";
            const skipped = getTaskSkip(data, task.id, member.id);
            const progress = (data.progressUpdates?.[task.id] ?? []).filter(
              (update) => update.memberId === member.id,
            );
            const awarded = responseAwardedPoints(task, response);
            const late = responseIsLate(task, response);
            const hardLocked = response ? isHardLocked(task, response) : false;
            const rowManualKey = `admin:row-manual:${task.id}:${member.id}`;
            const skipKey = `admin:skip:${task.id}:${member.id}`;
            const restoreKey = `admin:restore:${task.id}:${member.id}`;
            const approveKey = `admin:approve:${task.id}:${member.id}`;
            const overrideKey = `admin:override:${task.id}:${member.id}`;
            const rejectKey = `admin:reject:${task.id}:${member.id}`;
            return (
              <details
                key={member.id}
                className={`rounded-lg border p-3 transition ${
                  skipped
                    ? "border-zinc-200 bg-zinc-50"
                    : response?.status === "approved"
                    ? "border-emerald-200 bg-emerald-50"
                    : response?.status === "submitted"
                      ? "border-yellow-200 bg-yellow-50"
                      : response?.status === "rejected"
                        ? "border-red-200 bg-red-50"
                        : "border-ink/10 bg-white"
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="truncate">{member.name}</strong>
                    <div className="text-xs text-foreground/55">
                      {skipped
                        ? `Skipped ${formatDateTime(skipped.skippedAt)}`
                        : response
                          ? `Submitted ${formatDateTime(response.submittedAt)}`
                          : "No final submission"}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${skipped ? "border-zinc-300 bg-zinc-100 text-zinc-600" : statusTone(response?.status)}`}>
                    {skipped ? "skipped" : response?.status ?? "missing"}
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white/70 p-3">
                  <Input
                    value={skipNote}
                    onChange={(event) =>
                      setSkipNotes((current) => ({
                        ...current,
                        [reviewNoteKey]: event.target.value,
                      }))
                    }
                    placeholder="Optional skip note"
                    className="border border-ink/20 bg-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    {!response && !skipped && (
                      <>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={manualScore}
                          onChange={(event) =>
                            setManualApproveScores((current) => ({
                              ...current,
                              [manualScoreKey]: event.target.value,
                            }))
                          }
                          placeholder="Manual score"
                          className="h-9 w-36 border border-ink/20 bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            void runAdminAction(
                              rowManualKey,
                              () =>
                                onManualApprove(
                                  task,
                                  member.id,
                                  sanitizeScore(manualScore, sanitizePositiveNumber(task.points, 1)),
                                ),
                              "Manual approval saved.",
                              "Manual approval failed. Try again.",
                            )
                          }
                          className={actionButtonClass(
                            "bg-emerald-600 text-white hover:bg-emerald-700",
                            actionFeedback[rowManualKey],
                          )}
                        >
                          <Check data-icon="inline-start" />
                          Manual approve
                        </Button>
                        <ActionFeedbackLine feedback={actionFeedback[rowManualKey]} />
                      </>
                    )}
                    {skipped ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void runAdminAction(
                            restoreKey,
                            () => onUnskipTaskMember(task, member.id),
                            "Assignment restored.",
                            "Could not restore assignment.",
                          )
                        }
                        className={actionButtonClass(
                          "border border-ink/20 bg-white",
                          actionFeedback[restoreKey],
                        )}
                      >
                        Restore assignment
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void runAdminAction(
                            skipKey,
                            () => onSkipTaskMember(task, member.id, skipNote),
                            "Member skipped.",
                            "Could not skip member.",
                          ).then((ok) => {
                            if (ok) setSkipNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass(
                          "border border-zinc-300 bg-zinc-100 text-zinc-700",
                          actionFeedback[skipKey],
                        )}
                      >
                        Skip member
                      </Button>
                    )}
                    <span className="text-xs leading-8 text-foreground/55">
                      Skip is a full exemption: no points, no penalties, no completion count.
                    </span>
                  </div>
                  <ActionFeedbackLine feedback={actionFeedback[restoreKey] ?? actionFeedback[skipKey]} />
                </div>
                {response && (
                  <div className="mt-3 rounded-md border border-ink/10 bg-paper p-3">
                    <StructuredTextBlock text={response.answer} forceCollapse />
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full border border-ink/10 bg-white px-2 py-1">
                        Score {awarded}/{sanitizePositiveNumber(task.points, 1)}
                      </span>
                      {late && (
                        <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2 py-1 text-yellow-900">
                          Late - half score
                        </span>
                      )}
                      {hardLocked && (
                        <span className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-red-700">
                          Locked - override required
                        </span>
                      )}
                      {rejectionCount(response) > 0 && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-700">
                          Rejections {rejectionCount(response)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={reviewNote}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [reviewNoteKey]: event.target.value,
                        }))
                      }
                      placeholder="Optional review note"
                      className="mt-3 border border-ink/20 bg-white"
                    />
                    <label className="mt-3 grid gap-1 text-xs font-bold text-foreground/70">
                      Awarded score
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={scoreValue}
                        onChange={(event) =>
                          setReviewScores((current) => ({
                            ...current,
                            [reviewNoteKey]: event.target.value,
                          }))
                        }
                        className="border border-ink/20 bg-white"
                      />
                      <span className="font-normal text-foreground/55">
                        You can award bonus above the task points. Default follows the deadline rule.
                      </span>
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (hardLocked) {
                            blockAdminAction(approveKey, ["override approval for locked submission"]);
                            return;
                          }
                          void runAdminAction(
                            approveKey,
                            () =>
                              onReviewAnswer(
                                task.id,
                                member.id,
                                "approved",
                                reviewNote,
                                sanitizeScore(scoreValue, calculateAwardedPoints(task, response, "approved")),
                                false,
                              ),
                            "Submission approved.",
                            "Approve failed. Try again.",
                          ).then((ok) => {
                            if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass("", actionFeedback[approveKey])}
                      >
                        <Check data-icon="inline-start" />
                        Approve
                      </Button>
                      {hardLocked && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            void runAdminAction(
                              overrideKey,
                              () =>
                                onReviewAnswer(
                                  task.id,
                                  member.id,
                                  "approved",
                                  reviewNote,
                                  sanitizeScore(scoreValue, 0),
                                  true,
                                ),
                              "Override approval saved.",
                              "Override approval failed.",
                            ).then((ok) => {
                              if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                            });
                          }}
                          className={actionButtonClass(
                            "bg-red-600 text-white hover:bg-red-700",
                            actionFeedback[overrideKey],
                          )}
                        >
                          Override approve
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void runAdminAction(
                            rejectKey,
                            () => onReviewAnswer(task.id, member.id, "rejected", reviewNote, 0, false),
                            "Submission rejected.",
                            "Reject failed. Try again.",
                          ).then((ok) => {
                            if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass(
                          "border border-ink/20 bg-white",
                          actionFeedback[rejectKey],
                        )}
                      >
                        <RotateCcw data-icon="inline-start" />
                        Reject
                      </Button>
                    </div>
                    <ActionFeedbackLine
                      feedback={
                        actionFeedback[approveKey] ??
                        actionFeedback[overrideKey] ??
                        actionFeedback[rejectKey]
                      }
                    />
                  </div>
                )}
                {progress.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {progress.map((update) => (
                      <div key={update.id} className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                        <StructuredTextBlock text={update.note} compact forceCollapse />
                        <p className="mt-1 text-xs text-foreground/50">{formatDateTime(update.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMeetingRows(meetings: Meeting[]) {
    if (meetings.length === 0) {
      return <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">No meetings here yet.</p>;
    }

    return (
      <div className="grid gap-2">
        {meetings.map((meeting) => {
          const attendance = Object.values(data.meetingAttendance?.[meeting.id] ?? {});
          const isSelected = selectedMeeting?.id === meeting.id;
          const phase = meetingPhase(meeting);
          return (
            <button
              key={meeting.id}
              type="button"
              onClick={() => setSelectedMeetingId(meeting.id)}
              className={`rounded-lg border p-3 text-start transition hover:border-ink/40 hover:bg-white ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-ink/10 bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">{meeting.title}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {formatDateTime(meeting.startsAt)} | {meeting.durationMinutes}m | {meeting.points} pts
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${meetingPhaseTone(phase)}`}>
                    {meetingPhaseLabel(phase)}
                  </span>
                  <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                    {attendance.length}/{data.members.filter((member) => !member.hidden).length}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderMeetingDetail(meeting?: Meeting) {
    if (!meeting) return null;
    const attendanceMap = data.meetingAttendance?.[meeting.id] ?? {};
    const totalScore = Object.values(attendanceMap).reduce((sum, item) => sum + item.score, 0);
    const archiveMeetingKey = `admin:archive-meeting:${meeting.id}`;
    const restoreMeetingKey = `admin:restore-meeting:${meeting.id}`;
    const deleteMeetingKey = `admin:delete-meeting:${meeting.id}`;
    const recalcMeetingKey = `admin:recalculate-meeting:${meeting.id}`;
    const phase = meetingPhase(meeting, adminNowDate);
    const attendanceOpen = canRecordMeetingAttendance(meeting, adminNowDate);
    const timeWindow = meetingWindow(meeting);

    return (
      <section className="min-w-0 rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-2xl font-bold">{meeting.title}</h3>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {meetingStatus(meeting)}
              </span>
              <span className={`rounded-full border px-2 py-1 text-xs font-bold ${meetingPhaseTone(phase)}`}>
                {meetingPhaseLabel(phase)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
              <span>Start: {formatDateTime(meeting.startsAt)}</span>
              {timeWindow && <span>Ends: {formatDateTime(new Date(timeWindow.endMs).toISOString())}</span>}
              <span>Duration: {meeting.durationMinutes}m</span>
              <span>Points: {meeting.points}</span>
              <span>Total score: {Math.round(totalScore * 100) / 100}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {isActiveMeeting(meeting) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAdminAction(
                    archiveMeetingKey,
                    () => onUpdateMeeting(meeting.id, { status: "archived" }),
                    "Meeting archived.",
                    "Archive failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20 bg-paper", actionFeedback[archiveMeetingKey])}
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  void runAdminAction(
                    restoreMeetingKey,
                    () => onUpdateMeeting(meeting.id, { status: "active" }),
                    "Meeting restored.",
                    "Restore failed. Try again.",
                  )
                }
                className={actionButtonClass("border border-ink/20", actionFeedback[restoreMeetingKey])}
              >
                <RotateCcw data-icon="inline-start" />
                Restore
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!window.confirm("Delete this meeting and all linked attendance/score data?")) return;
                void runAdminAction(
                  deleteMeetingKey,
                  () => onRemoveMeeting(meeting.id),
                  "Meeting deleted.",
                  "Delete failed. Try again.",
                );
              }}
              className={actionButtonClass(
                "border border-red-200 bg-red-50 text-red-700",
                actionFeedback[deleteMeetingKey],
              )}
              aria-label="Delete meeting"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <DateTimeField
            label="Start"
            value={toDateTimeInputValue(meeting.startsAt)}
            onChange={(value) => onUpdateMeeting(meeting.id, { startsAt: fromDateTimeInputValue(value) })}
            help="Used to calculate late minutes."
          />
          <label className="grid gap-1 text-sm font-bold">
            Duration minutes
            <Input
              type="number"
              min={1}
              value={meeting.durationMinutes}
              onChange={(event) =>
                onUpdateMeeting(meeting.id, { durationMinutes: sanitizeNumber(event.target.value) || 60 })
              }
              className="border border-ink/20 bg-paper"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Points
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={meeting.points}
              onChange={(event) =>
                onUpdateMeeting(meeting.id, { points: sanitizePositiveNumber(event.target.value, 1) })
              }
              className="border border-ink/20 bg-paper"
            />
          </label>
        </div>

        {!attendanceOpen && (
          <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-900">
            Attendance opens at {formatDateTime(meeting.startsAt)}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper p-3">
          <div className="text-sm font-bold text-foreground/65">
            Edit individual scores below. Changing meeting points will not rewrite old scores automatically.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void runAdminAction(
                recalcMeetingKey,
                () => onRecalculateMeetingAttendanceScores(meeting),
                "Scores recalculated.",
                "Recalculate failed.",
              )
            }
            className={actionButtonClass("border border-ink/20 bg-white", actionFeedback[recalcMeetingKey])}
          >
            <RefreshCw data-icon="inline-start" />
            Recalculate all
          </Button>
        </div>

        <div className="mt-5 grid gap-2">
          {data.members.map((member) => {
            const attendance = attendanceMap[member.id];
            const attendanceKey = `admin:meeting-attendance:${meeting.id}:${member.id}`;
            const scoreKey = `admin:meeting-score:${meeting.id}:${member.id}`;
            const draftKey = `${meeting.id}:${member.id}`;
            return (
              <div
                key={member.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition ${
                  attendance
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-ink/10 bg-white"
                }`}
              >
                <div>
                  <strong>{member.name}</strong>
                  {attendance ? (
                    <p className="text-xs text-foreground/60">
                      Checked {formatDateTime(attendance.checkedAt)} | late {attendance.lateMinutes}m | score{" "}
                      {attendance.score}
                    </p>
                  ) : (
                    <p className="text-xs text-foreground/50">Not checked yet</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Input
                    type="number"
                    step={0.1}
                    value={meetingScoreDrafts[draftKey] ?? String(attendance?.score ?? 0)}
                    onChange={(event) =>
                      setMeetingScoreDrafts((current) => ({ ...current, [draftKey]: event.target.value }))
                    }
                    className="h-10 w-24 border border-ink/20 bg-white text-center"
                    aria-label={`Score for ${member.name}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void runAdminAction(
                        scoreKey,
                        () =>
                          onSetMeetingAttendanceScore(
                            meeting,
                            member,
                            sanitizeNumber(meetingScoreDrafts[draftKey] ?? attendance?.score ?? 0),
                          ),
                        "Score saved.",
                        "Score failed.",
                      )
                    }
                    className={actionButtonClass("border border-ink/20 bg-white", actionFeedback[scoreKey])}
                  >
                    Save score
                  </Button>
                  <Button
                    type="button"
                    disabled={!attendanceOpen}
                    onClick={() =>
                      void runAdminAction(
                        attendanceKey,
                        () => onRecordMeetingAttendance(meeting, member),
                        "Attendance saved.",
                        "Attendance failed. Try again.",
                      )
                    }
                    className={actionButtonClass(
                      attendance
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : !attendanceOpen
                          ? "bg-zinc-100 text-zinc-500"
                          : "",
                      actionFeedback[attendanceKey],
                    )}
                  >
                    <Check data-icon="inline-start" />
                    {attendance ? "Checked" : attendanceOpen ? "Check" : "Not open"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMemberLog(member: Member) {
    const memberTasks = data.tasks.filter((task) => taskIsForMember(task, member.id));
    const memberScore = stats.allMemberStats.find((item) => item.member.id === member.id);
    return (
      <div className="grid gap-2">
        <div className="grid gap-2 sm:grid-cols-4">
          <CompactMetric label="Assigned" value={memberScore?.assignedTasks ?? 0} />
          <CompactMetric label="Submitted" value={memberScore?.submitted ?? 0} />
          <CompactMetric label="Accepted" value={memberScore?.approved ?? 0} />
          <CompactMetric label="Approval" value={formatPercent(memberScore?.approvalRate ?? 0)} />
        </div>
        {(data.meetings ?? []).length > 0 && (
          <div className="grid gap-2">
            {(data.meetings ?? []).map((meeting) => {
              const attendance = data.meetingAttendance?.[meeting.id]?.[member.id];
              return (
                <div key={meeting.id} className="rounded-lg border border-ink/10 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{meeting.title}</strong>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-bold ${
                          attendance
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                        }`}
                      >
                        {attendance ? `${attendance.score} pts` : "absent"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openAdminEntity("meeting", meeting.id)}
                        className="border border-ink/20 bg-white"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">
                    {meetingStatus(meeting)} | {formatDateTime(meeting.startsAt)}
                    {attendance ? ` | late ${attendance.lateMinutes}m` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {memberTasks.map((task) => {
          const response = getResponse(data, task.id, member.id);
          const skipped = getTaskSkip(data, task.id, member.id);
          const progress = (data.progressUpdates?.[task.id] ?? []).filter(
            (update) => update.memberId === member.id,
          );
          const awarded = responseAwardedPoints(task, response);
          const late = responseIsLate(task, response);
          const note = latestReviewNote(response);
          return (
            <div key={task.id} className="rounded-lg border border-ink/10 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>{task.title}</strong>
                  <div className="text-xs text-foreground/55">
                    {taskStatus(task)} | deadline {taskDeadlineLabel(task)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${skipped ? "border-zinc-300 bg-zinc-100 text-zinc-600" : statusTone(response?.status)}`}>
                    {skipped ? "skipped" : response?.status ?? "missing"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openAdminEntity(isProblemTask(task) ? "problem" : "task", task.id)}
                    className="border border-ink/20 bg-white"
                  >
                    Open
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                <span>Score {awarded}/{sanitizePositiveNumber(task.points, 1)}</span>
                <span>Rejections {rejectionCount(response)}</span>
                {skipped && <span>Skip exemption: no profile impact</span>}
                {late && <span className="text-yellow-800">Late - half score</span>}
              </div>
              {note && <p className="mt-2 rounded-md border border-ink/10 bg-paper p-2 text-sm">Note: {note}</p>}
              {response && (
                <StructuredTextBlock
                  text={response.answer}
                  compact
                  forceCollapse
                  className="mt-2 text-sm"
                />
              )}
              {progress.length > 0 && (
                <p className="mt-2 text-xs font-bold text-yellow-800">{progress.length} progress updates</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderAttentionReviewDetail(task?: StudioTask) {
    if (!task) return null;
    const pendingResponses = Object.values(data.responses[task.id] ?? {}).filter(
      (response) => response.status === "submitted",
    );

    return (
      <section className="min-w-0 rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-2xl font-bold">{task.title}</h2>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {taskTypeLabel(task)}
              </span>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                {pendingResponses.length} pending
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground/55">
              Review final submissions only. Editing stays in the Tasks or Problems tab.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {pendingResponses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink/20 bg-paper p-4 text-sm text-foreground/55">
              No pending submissions for this item.
            </p>
          ) : (
            pendingResponses.map((response) => {
              const member = data.members.find((item) => item.id === response.memberId);
              const memberDisplayName = member
                ? memberArabicName(member)
                : response.memberName || response.memberId;
              const reviewNoteKey = `${task.id}:${response.memberId}`;
              const reviewNote = reviewNotes[reviewNoteKey] ?? "";
              const scoreValue =
                reviewScores[reviewNoteKey] ??
                String(responseAwardedPoints(task, response) || sanitizePositiveNumber(task.points, 1));
              const approveKey = `attention:approve:${task.id}:${response.memberId}`;
              const rejectKey = `attention:reject:${task.id}:${response.memberId}`;
              const locked = isHardLocked(task, response);
              return (
                <article key={response.memberId} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="text-lg">{memberDisplayName}</strong>
                      <p className="mt-1 text-xs font-bold text-foreground/50">
                        Submitted by {memberDisplayName} • {formatDateTime(response.submittedAt)}
                      </p>
                    </div>
                    {renderMemberLinkButtons(member)}
                  </div>

                  <StructuredTextBlock text={response.answer} compact forceCollapse className="mt-3 text-sm" />

                  <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
                    <Input
                      value={reviewNote}
                      onChange={(event) =>
                        setReviewNotes((current) => ({ ...current, [reviewNoteKey]: event.target.value }))
                      }
                      placeholder="Review note"
                      className="border border-ink/20 bg-white"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={scoreValue}
                      onChange={(event) =>
                        setReviewScores((current) => ({ ...current, [reviewNoteKey]: event.target.value }))
                      }
                      placeholder="Score"
                      className="border border-ink/20 bg-white text-center"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        void runAdminAction(
                          approveKey,
                          () =>
                            onReviewAnswer(
                              task.id,
                              response.memberId,
                              "approved",
                              reviewNote,
                              sanitizeScore(scoreValue, sanitizePositiveNumber(task.points, 1)),
                              locked,
                            ),
                          "Submission approved.",
                          "Approve failed.",
                        )
                      }
                      className={actionButtonClass("", actionFeedback[approveKey])}
                    >
                      <Check data-icon="inline-start" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void runAdminAction(
                          rejectKey,
                          () => onReviewAnswer(task.id, response.memberId, "rejected", reviewNote),
                          "Submission rejected.",
                          "Reject failed.",
                        )
                      }
                      className={actionButtonClass(
                        "border border-red-200 bg-white text-red-700",
                        actionFeedback[rejectKey],
                      )}
                    >
                      <X data-icon="inline-start" />
                      Reject
                    </Button>
                  </div>
                  <ActionFeedbackLine feedback={actionFeedback[approveKey] ?? actionFeedback[rejectKey]} />
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof BarChart3 }> = [
    { id: "repo-updates", label: "Attention", icon: Bell },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "problems", label: "Problems", icon: Search },
    { id: "meetings", label: "Meetings", icon: CalendarClock },
    { id: "members", label: "Members", icon: Users },
    { id: "hidden", label: "Hidden", icon: EyeOff },
    { id: "logs", label: "Logs", icon: ListChecks },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const nav = (
    <nav className="flex h-full flex-col gap-1">
      <div className="mb-5 flex items-center gap-3 px-2">
        <Logo size="size-10" />
        <div>
          <div className="text-lg font-bold leading-none">Hivo Admin</div>
          <div className="mt-1 text-xs text-foreground/50">Team operations</div>
        </div>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-bold transition ${
              section === item.id ? "bg-ink text-white" : "text-foreground/70 hover:bg-ink/5"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
      <div className="mt-auto rounded-lg border border-ink/10 bg-white p-3 text-xs text-foreground/60">
        {isDirty ? "Unsaved changes" : "All changes saved"}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f0] text-foreground" dir="ltr">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink/10 bg-paper/95 p-4 backdrop-blur lg:block">
        {nav}
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-72 border-r border-ink/10 bg-paper p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="absolute left-3 top-3 rounded-full border border-ink/10 bg-white p-2"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-[#f7f6f0]/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setNavOpen(true)}
                className="border border-ink/20 bg-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{navItems.find((item) => item.id === section)?.label}</h1>
                <p className="hidden text-xs text-foreground/50 sm:block">
                  Active tasks stay visible. Archived tasks keep their full log.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAdminAction(
                    refreshAdminKey,
                    onRefreshAdminQueue,
                    "Data refreshed.",
                    "Refresh failed. Try again.",
                  )
                }
                className={actionButtonClass(
                  "hidden border border-ink/20 bg-white sm:inline-flex",
                  actionFeedback[refreshAdminKey],
                )}
              >
                <RefreshCw data-icon="inline-start" />
                Refresh
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void runAdminAction(
                    saveGithubKey,
                    onSaveToGithub,
                    "Saved to GitHub.",
                    "Save failed. Try again.",
                  )
                }
                disabled={isSaving}
                className={actionButtonClass("", actionFeedback[saveGithubKey])}
              >
                <Save data-icon="inline-start" />
                {isSaving ? "Saving" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="border border-ink/20 bg-white"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
          {(saveStatus || queueStatus) && (
            <p className="mx-auto mt-2 max-w-7xl text-xs font-bold text-foreground/55">
              {saveStatus || queueStatus}
            </p>
          )}
        </header>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-24">
          {section === "repo-updates" && (
            <section className="grid gap-5">
              {pendingProfileRequests.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Profile requests</h2>
                    <p className="mt-1 text-sm text-sky-900/70">
                      Members can request a nickname, GitHub repo, or Drive link change. Approve applies it; reject leaves the official profile unchanged.
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-300 bg-white px-3 py-1 text-sm font-bold text-sky-900">
                    {pendingProfileRequests.length} pending
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {pendingProfileRequests.map((request) => {
                      const member = data.members.find((item) => item.id === request.memberId);
                      const approveProfileKey = `admin:profile-approve:${request.id}`;
                      const rejectProfileKey = `admin:profile-reject:${request.id}`;
                      return (
                        <div key={request.id} className="rounded-lg border border-sky-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <strong>{member?.name ?? request.memberName}</strong>
                              <div className="mt-1 text-xs font-bold text-foreground/50">
                                Requested {formatDateTime(request.createdAt)}
                              </div>
                              <div className="mt-2 grid gap-1 text-sm text-foreground/75">
                                {request.nickname && (
                                  <span>
                                    Nickname: <strong>{request.nickname}</strong>
                                  </span>
                                )}
                                {request.repoUrl !== undefined && (
                                  <span className="break-all">
                                    Repo: <strong>{request.repoUrl || "Remove saved repo"}</strong>
                                  </span>
                                )}
                                {request.driveUrl !== undefined && (
                                  <span className="break-all">
                                    Drive: <strong>{request.driveUrl || "Remove saved Drive"}</strong>
                                  </span>
                                )}
                                {request.previousRepoUrl && (
                                  <span className="break-all text-xs text-foreground/45">
                                    Previous repo: {request.previousRepoUrl}
                                  </span>
                                )}
                                {request.previousDriveUrl && (
                                  <span className="break-all text-xs text-foreground/45">
                                    Previous Drive: {request.previousDriveUrl}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {request.repoUrl && (
                                <Button type="button" size="sm" onClick={() => window.open(request.repoUrl, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink data-icon="inline-start" />
                                  Open new repo
                                </Button>
                              )}
                              {request.driveUrl && (
                                <Button type="button" size="sm" onClick={() => window.open(request.driveUrl, "_blank", "noopener,noreferrer")}>
                                  <FolderOpen data-icon="inline-start" />
                                  Open new Drive
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  void runAdminAction(
                                    approveProfileKey,
                                    () => onReviewProfileRequest(request.id, "approved"),
                                    "Profile approved.",
                                    "Approve failed. Try again.",
                                  )
                                }
                                className={actionButtonClass("", actionFeedback[approveProfileKey])}
                              >
                                <Check data-icon="inline-start" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void runAdminAction(
                                    rejectProfileKey,
                                    () => onReviewProfileRequest(request.id, "rejected"),
                                    "Profile rejected.",
                                    "Reject failed. Try again.",
                                  )
                                }
                                className={actionButtonClass(
                                  "border border-ink/20 bg-white",
                                  actionFeedback[rejectProfileKey],
                                )}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Submissions waiting review</h2>
                    <p className="mt-1 text-sm text-amber-900/70">
                      Final answers that still need approve, override, or reject.
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-bold text-amber-900">
                    {pendingSubmissions.length} pending
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {pendingSubmissions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-amber-300 bg-white p-4 text-sm text-foreground/60">
                      No final submissions are waiting right now.
                    </p>
                  ) : (
                    pendingSubmissions.map((item) => {
                      const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                      const member = data.members.find((candidate) => candidate.id === item.memberId);
                      return (
                        <div
                          key={`attention-${item.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedTaskId(item.taskId);
                            setSection("repo-updates");
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setSelectedTaskId(item.taskId);
                            setSection("repo-updates");
                          }}
                          className="rounded-lg border border-amber-200 bg-white p-3 text-start transition hover:border-amber-400 hover:bg-amber-50"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong>{item.memberName}</strong>
                              <p className="mt-1 text-sm font-bold text-foreground/65">
                                {task?.title ?? item.taskId}
                              </p>
                              <p className="mt-1 text-xs text-foreground/50">
                                {formatDateTime(item.submittedAt)}
                              </p>
                            </div>
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                              Needs review
                            </span>
                            {renderMemberLinkButtons(member)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Updates need attention</h2>
                    <p className="mt-1 text-sm text-yellow-900/70">
                      These are progress notes, GitHub requests, and Drive requests that need admin attention.
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-sm font-bold text-yellow-900">
                    {unseenUpdates.length} unseen
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {unseenUpdates.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-yellow-300 bg-white p-4 text-sm text-foreground/60">
                      No updates are waiting. The admin flow will stay on submissions or tasks next.
                    </p>
                  ) : (
                    unseenUpdates.map((update) => {
                      const member = data.members.find((item) => item.id === update.memberId);
                      const task = update.taskId
                        ? data.tasks.find((item) => item.id === update.taskId)
                        : undefined;
                      const markSeenKey = `admin:mark-seen:${update.id}`;
                      return (
                        <div key={update.id} className="rounded-lg border border-yellow-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              {update.taskId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskId(update.taskId ?? "");
                                    setSection("repo-updates");
                                  }}
                                  className="text-left text-lg font-bold underline decoration-yellow-400 decoration-4 underline-offset-4"
                                >
                                  {member?.name ?? update.memberId}
                                </button>
                              ) : (
                                <strong>{member?.name ?? update.memberId}</strong>
                              )}
                              <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-foreground/50">
                                <span>{update.source ?? "manual"}</span>
                                {task && <span>Task: {task.title}</span>}
                                <span>{formatDateTime(update.createdAt)}</span>
                              </div>
                              {update.excerpt && (
                                <StructuredTextBlock
                                  text={update.excerpt}
                                  compact
                                  forceCollapse
                                  className="mt-2 max-w-3xl text-sm text-foreground/70"
                                />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {member?.repoUrl && update.source !== "drive" && (
                                <Button type="button" size="sm" onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink data-icon="inline-start" />
                                  Open repo
                                </Button>
                              )}
                              {member?.driveUrl && update.source === "drive" && (
                                <Button type="button" size="sm" onClick={() => window.open(member.driveUrl, "_blank", "noopener,noreferrer")}>
                                  <FolderOpen data-icon="inline-start" />
                                  Open Drive
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void runAdminAction(
                                    markSeenKey,
                                    () => onMarkRepoUpdateSeen(update.id),
                                    "Marked done.",
                                    "Could not mark done.",
                                  )
                                }
                                className={actionButtonClass(
                                  "border border-ink/20 bg-white",
                                  actionFeedback[markSeenKey],
                                )}
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <details className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Team links directory</h2>
                      <p className="mt-1 text-sm text-foreground/55">
                        Open member repositories and Drive folders quickly while checking updates.
                      </p>
                    </div>
                    <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-bold">
                      Open
                    </span>
                  </div>
                </summary>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper p-3">
                      <strong className="truncate">{member.name}</strong>
                      <div className="flex shrink-0 gap-2">
                        {member.repoUrl ? (
                          <Button type="button" size="sm" onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}>
                            Repo
                          </Button>
                        ) : (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-500">
                            No repo
                          </span>
                        )}
                        {member.driveUrl ? (
                          <Button type="button" size="sm" onClick={() => window.open(member.driveUrl, "_blank", "noopener,noreferrer")}>
                            Drive
                          </Button>
                        ) : (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-500">
                            No Drive
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>

              {(selectedTask || pendingSubmissions.length > 0) && (
                <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
                  {(() => {
                    const task =
                      selectedTask ??
                      data.tasks.find((candidate) =>
                        pendingSubmissions.some((item) => item.taskId === candidate.id),
                      );
                    if (!task) return null;
                    return renderAttentionReviewDetail(task);
                  })()}
                </div>
              )}
            </section>
          )}

          {section === "tasks" && (
            <section className="grid min-w-0 gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Create task</h2>
                      <p className="mt-1 text-sm text-foreground/55">
                        Choose who gets the task, then set scoring and timing rules.
                      </p>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                      Guided
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" className="h-11 border border-ink/20 bg-white" />
                    <Textarea value={taskQuestion} onChange={(event) => setTaskQuestion(event.target.value)} placeholder="Question or instructions" className="min-h-24 border border-ink/20 bg-white" />
                    <div className="flex rounded-lg border border-ink/20 bg-white p-1 text-sm font-bold">
                      {(["technical", "nonTechnical", "problem"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTaskType(type)}
                          className={cn(
                            "flex-1 rounded-md px-3 py-2 transition",
                            taskType === type ? "bg-ink text-white" : "text-foreground/65 hover:bg-paper",
                          )}
                        >
                          {taskTypeOptionLabel(type)}
                        </button>
                      ))}
                    </div>
                    <div className="flex rounded-lg border border-ink/20 bg-white p-1 text-sm font-bold">
                      {(["active", "hidden"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setTaskStatusDraft(status)}
                          className={cn(
                            "flex-1 rounded-md px-3 py-2 capitalize transition",
                            taskStatusDraft === status ? "bg-ink text-white" : "text-foreground/65 hover:bg-paper",
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3">
                      <label className="grid gap-1 text-xs font-bold text-foreground/65">
                        Base points
                        <Input type="number" min={1} value={taskPoints} onChange={(event) => setTaskPoints(Number(event.target.value))} placeholder="Points" className="h-11 border border-ink/20 bg-white" />
                        <span className="font-normal text-foreground/50">Admin can still award bonus when approving.</span>
                      </label>
                      <div className="grid gap-2 rounded-md border border-ink/20 bg-white p-2 text-sm">
                        <label className="flex h-8 items-center gap-2 font-bold">
                          <input
                            type="checkbox"
                            checked={areAllMembersSelected(taskMemberIds)}
                            onChange={(event) => toggleAllTaskMembers(event.target.checked)}
                          />
                          All team
                        </label>
                        <div className="max-h-32 overflow-auto border-t border-ink/10 pt-2">
                          {data.members.map((member) => (
                            <label key={member.id} className="flex h-8 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={taskMemberIds.includes(member.id)}
                                onChange={() => toggleTaskMemberDraft(member.id)}
                              />
                              <span className="truncate">{member.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <DateTimeField
                        label="Start"
                        value={taskStartAt}
                        onChange={setTaskStartAt}
                        help="Start controls when the task opens."
                      />
                      {taskType === "technical" ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
                          Technical tasks have no deadline. They stay open until you review or archive them.
                        </div>
                      ) : (
                        <DateTimeField
                          label="Deadline"
                          value={taskDeadlineAt}
                          onChange={setTaskDeadlineAt}
                          help="After deadline: default half score. After double time: locked unless overridden."
                          tone="deadline"
                        />
                      )}
                    </div>
                    {taskType === "technical" ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-900">
                        Technical tasks do not use deadlines, late penalties, or hard locks.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-900">
                        Deadline rule: late submissions default to half score. Submissions after double the task window require override approval.
                      </div>
                    )}
                    <Button
                      type="button"
                      data-testid="admin-add-task"
                      onClick={submitTask}
                      className={actionButtonClass(
                        "h-11 bg-sky-500 text-white hover:bg-sky-600",
                        actionFeedback["admin:add-task"],
                      )}
                    >
                      <Plus data-icon="inline-start" />
                      Add task
                    </Button>
                    <ActionFeedbackLine feedback={actionFeedback["admin:add-task"]} />
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Active tasks</h2>
                  {renderTaskRows(activeTasks)}
                </div>
              </div>
              {renderTaskDetail(selectedTask && isActiveTask(selectedTask) ? selectedTask : activeTasks[0])}
            </section>
          )}

          {section === "problems" && (
            <section className="grid min-w-0 gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Problems board</h2>
                      <p className="mt-1 text-sm text-foreground/55">
                        Inspect project problems and every proposed solution in one simple place.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                        {problemTasks.length} problems
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={prepareNewProblem}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        <Plus data-icon="inline-start" />
                        Add new problem
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <div className="rounded-lg border border-ink/10 bg-paper p-2">
                      <div className="text-lg text-foreground">{problemTasks.length}</div>
                      <div className="text-foreground/55">All</div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                      <div className="text-lg text-emerald-800">
                        {problemTasks.filter(isActiveTask).length}
                      </div>
                      <div className="text-emerald-800/65">Active</div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                      <div className="text-lg text-zinc-700">
                        {problemTasks.filter((task) => taskStatus(task) === "archived").length}
                      </div>
                      <div className="text-zinc-600">Archived</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">All problems</h2>
                  {renderProblemRows(problemTasks)}
                </div>
              </div>
              {renderProblemDetail(selectedProblemTask)}
            </section>
          )}

          {section === "meetings" && (
            <section className="grid min-w-0 gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold">Create meeting</h2>
                  <p className="mt-1 text-sm text-foreground/55">
                    Attendance points are calculated from check-in time and lateness.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={meetingTitle}
                      onChange={(event) => setMeetingTitle(event.target.value)}
                      placeholder="Meeting title"
                      className="h-11 border border-ink/20 bg-white"
                    />
                    <DateTimeField
                      label="Start time"
                      value={meetingStartsAt}
                      onChange={setMeetingStartsAt}
                      help="Start time is used to calculate late minutes."
                    />
                    <div className="grid gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={meetingDuration}
                        onChange={(event) => setMeetingDuration(Number(event.target.value))}
                        placeholder="Duration minutes"
                        className="h-11 border border-ink/20 bg-white"
                      />
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={meetingPoints}
                        onChange={(event) => setMeetingPoints(Number(event.target.value))}
                        placeholder="Points"
                        className="h-11 border border-ink/20 bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      data-testid="admin-add-meeting"
                      onClick={submitMeeting}
                      className={actionButtonClass(
                        "h-11 bg-emerald-600 text-white hover:bg-emerald-700",
                        actionFeedback["admin:add-meeting"],
                      )}
                    >
                      <Plus data-icon="inline-start" />
                      Add meeting
                    </Button>
                    <ActionFeedbackLine feedback={actionFeedback["admin:add-meeting"]} />
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Active meetings</h2>
                  {renderMeetingRows(activeMeetings)}
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Archived meetings</h2>
                  {renderMeetingRows(archivedMeetings)}
                </div>
              </div>
              {renderMeetingDetail(selectedMeeting)}
            </section>
          )}

          {section === "members" && (
            <section className="grid gap-4">
              {data.members.map((member) => {
                const memberScore = stats.allMemberStats.find((item) => item.member.id === member.id);
                return (
                  <details key={member.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xl">{member.name}</strong>
                          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${member.hidden ? "border-zinc-300 bg-zinc-100 text-zinc-600" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                            {member.hidden ? "Hidden" : "Visible"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                          <span>Submitted {memberScore?.submitted ?? 0}</span>
                          <span>Approved {memberScore?.approved ?? 0}</span>
                          <span>Approval {formatPercent(memberScore?.approvalRate ?? 0)}</span>
                          <span>Points {memberScore?.points ?? 0}</span>
                          <span>Private tasks {memberScore?.privateTasks ?? 0}</span>
                          <span>Bonus {memberScore?.bonusPoints ?? 0}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.preventDefault();
                          onUpdateMember(member.id, { hidden: !member.hidden });
                        }}
                        className="border border-ink/20 bg-paper"
                      >
                        {member.hidden ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
                        {member.hidden ? "Show" : "Hide"}
                      </Button>
                    </summary>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                      <div className="grid gap-3">
                        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                          <div className="font-bold">Individual assignment</div>
                          <p className="mt-1 text-sm text-foreground/55">
                            Create a task for this member only. Nobody else will see it.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => prepareTaskForMember(member)}
                            className="mt-3 bg-sky-500 text-white hover:bg-sky-600"
                          >
                            <Plus data-icon="inline-start" />
                            Create task for {member.name}
                          </Button>
                        </div>
                        <label className="grid gap-1 text-xs font-bold">
                          Manual grades
                          <Input
                            type="number"
                            value={member.basePoints ?? 0}
                            onChange={(event) =>
                              onUpdateMember(member.id, { basePoints: sanitizeNumber(event.target.value) })
                            }
                            className="max-w-xs border border-ink/20 bg-yellow-50 text-center"
                          />
                        </label>
                        <div className="grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                          <div className="font-bold">Bonus grades</div>
                          <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                            <Input
                              type="number"
                              step={0.5}
                              value={bonusPointsDrafts[member.id] ?? ""}
                              onChange={(event) =>
                                setBonusPointsDrafts((current) => ({
                                  ...current,
                                  [member.id]: event.target.value,
                                }))
                              }
                              placeholder="+ points"
                              className="border border-ink/20 bg-white text-center"
                            />
                            <Input
                              value={bonusNoteDrafts[member.id] ?? ""}
                              onChange={(event) =>
                                setBonusNoteDrafts((current) => ({
                                  ...current,
                                  [member.id]: event.target.value,
                                }))
                              }
                              placeholder="Bonus note"
                              className="border border-ink/20 bg-white"
                            />
                            <Button
                              type="button"
                              onClick={() => void submitBonusGrade(member)}
                              className={actionButtonClass(
                                "bg-emerald-600 text-white hover:bg-emerald-700",
                                actionFeedback[`admin:add-bonus:${member.id}`],
                              )}
                            >
                              <Plus data-icon="inline-start" />
                              Add
                            </Button>
                          </div>
                          <ActionFeedbackLine feedback={actionFeedback[`admin:add-bonus:${member.id}`]} />
                          {bonusGradesForMember(member.id).length > 0 && (
                            <div className="grid gap-1 text-xs font-bold text-foreground/65">
                              {bonusGradesForMember(member.id).slice(0, 4).map((bonus) => (
                                <div key={bonus.id} className="rounded-md border border-ink/10 bg-white px-2 py-1">
                                  <span className="text-emerald-700">{bonus.points > 0 ? "+" : ""}{bonus.points}</span>
                                  <span> - {bonus.note}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Input value={member.publicFlag ?? ""} onChange={(event) => onUpdateMember(member.id, { publicFlag: event.target.value })} placeholder="Public flag" className="border border-ink/20 bg-red-50" />
                        <Input value={member.adminNote ?? ""} onChange={(event) => onUpdateMember(member.id, { adminNote: event.target.value })} placeholder="Private admin note" className="border border-ink/20 bg-paper" />
                        <Input value={member.repoUrl ?? ""} onChange={(event) => onUpdateMember(member.id, { repoUrl: event.target.value })} placeholder="Repo URL" dir="ltr" className="border border-ink/20 bg-paper text-left" />
                        <Input value={member.driveUrl ?? ""} onChange={(event) => onUpdateMember(member.id, { driveUrl: event.target.value })} placeholder="Drive URL" dir="ltr" className="border border-ink/20 bg-paper text-left" />
                        <Input value={member.aliases.join(", ")} onChange={(event) => onUpdateMember(member.id, { aliases: uniqueText(event.target.value.split(",")) })} placeholder="Aliases" className="border border-ink/20 bg-paper" />
                      </div>
                      <div>
                        <h3 className="mb-3 text-lg font-bold">Member log</h3>
                        {renderMemberLog(member)}
                      </div>
                    </div>
                  </details>
                );
              })}
            </section>
          )}

          {section === "logs" && (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
                <div className="flex rounded-lg border border-ink/10 bg-paper p-1">
                  <button type="button" onClick={() => setLogMode("task")} className={`rounded-md px-3 py-2 text-sm font-bold ${logMode === "task" ? "bg-ink text-white" : ""}`}>By task</button>
                  <button type="button" onClick={() => setLogMode("member")} className={`rounded-md px-3 py-2 text-sm font-bold ${logMode === "member" ? "bg-ink text-white" : ""}`}>By member</button>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <Search className="size-4" />
                  Pick a task or member to inspect the full trail.
                </div>
              </div>
              {logMode === "task" ? (
                <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                  <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">{renderTaskRows(data.tasks)}</div>
                  {renderTaskDetail(selectedTask)}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <div className="grid gap-2 rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                    {data.members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`rounded-lg border p-3 text-start font-bold ${selectedMember?.id === member.id ? "border-ink bg-paper" : "border-ink/10 bg-white"}`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                  {selectedMember && (
                    <section className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                      <h2 className="mb-3 text-2xl font-bold">{selectedMember.name}</h2>
                      {renderMemberLog(selectedMember)}
                    </section>
                  )}
                </div>
              )}
            </section>
          )}

          {section === "hidden" && (
            <section className="grid min-w-0 gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Hidden drafts</h2>
                    <p className="mt-1 text-sm text-foreground/55">
                      Prepared tasks and problems stay invisible until you publish them.
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-bold text-zinc-700">
                    {hiddenTasks.length} hidden
                  </span>
                </div>
                <div className="mt-4">{renderHiddenRows(hiddenTasks)}</div>
              </div>
              {(() => {
                const hiddenTask = selectedTask && isHiddenTask(selectedTask) ? selectedTask : hiddenTasks[0];
                if (!hiddenTask) return null;
                return isProblemTask(hiddenTask) ? renderProblemDetail(hiddenTask) : renderTaskDetail(hiddenTask);
              })()}
            </section>
          )}

          {section === "archive" && (
            <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <label className="mb-3 flex items-center gap-2 rounded-lg border border-ink/10 bg-paper px-3 py-2">
                  <Search className="size-4 text-foreground/40" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archive" className="w-full bg-transparent text-sm outline-none" />
                </label>
                <div className="grid gap-3">
                  <details open className="rounded-lg border border-ink/10 bg-paper p-3">
                    <summary className="cursor-pointer text-sm font-bold">
                      Archived tasks ({visibleArchive.filter((task) => !isProblemTask(task)).length})
                    </summary>
                    <div className="mt-3">{renderTaskRows(visibleArchive.filter((task) => !isProblemTask(task)))}</div>
                  </details>
                  <details className="rounded-lg border border-ink/10 bg-paper p-3">
                    <summary className="cursor-pointer text-sm font-bold">
                      Archived problems ({visibleArchive.filter(isProblemTask).length})
                    </summary>
                    <div className="mt-3">{renderProblemRows(visibleArchive.filter(isProblemTask))}</div>
                  </details>
                  <details className="rounded-lg border border-ink/10 bg-paper p-3">
                    <summary className="cursor-pointer text-sm font-bold">
                      Archived meetings ({archivedMeetings.length})
                    </summary>
                    <div className="mt-3">{renderMeetingRows(archivedMeetings)}</div>
                  </details>
                </div>
              </div>
              {(() => {
                if (selectedMeetingId && archivedMeetings.some((meeting) => meeting.id === selectedMeetingId)) {
                  return renderMeetingDetail(selectedMeeting);
                }
                const task = selectedTask && taskStatus(selectedTask) === "archived" ? selectedTask : visibleArchive[0];
                if (!task) return archivedMeetings[0] ? renderMeetingDetail(archivedMeetings[0]) : null;
                return isProblemTask(task) ? renderProblemDetail(task) : renderTaskDetail(task);
              })()}
            </section>
          )}

          {section === "settings" && (
            <section className="grid gap-5">
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold">Access</h2>
                <div className="mt-3 grid gap-3">
                  <Input value={data.settings?.adminPassword ?? DEFAULT_ADMIN_PASSWORD} onChange={(event) => onUpdateSettings({ adminPassword: event.target.value })} placeholder="Admin password" className="border border-ink/20 bg-paper" />
                  <Input value={data.settings?.statsPassword ?? DEFAULT_STATS_PASSWORD} onChange={(event) => onUpdateSettings({ statsPassword: event.target.value })} placeholder="Stats password" className="border border-ink/20 bg-paper" />
                  <div className="rounded-lg border border-ink/10 bg-paper p-3 text-sm font-bold" dir="ltr">API: {HIVO_API_URL || "not configured"}</div>
                </div>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm lg:col-span-2">
                <h2 className="text-xl font-bold">Queued progress</h2>
                {queuedProgress.length === 0 ? (
                  <p className="mt-2 text-sm text-foreground/55">No queued progress updates.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {queuedProgress.map((item) => (
                      <div key={item.id} className="rounded-lg border border-ink/10 bg-yellow-50 p-3">
                        <strong>{item.memberName}</strong>
                        <StructuredTextBlock text={item.note} compact forceCollapse className="mt-1 text-sm" />
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              void runAdminAction(
                                `admin:save-queued-progress:${item.id}`,
                                () => onSaveQueuedProgress(item),
                                "Progress saved.",
                                "Progress save failed.",
                              )
                            }
                            className={actionButtonClass(
                              "",
                              actionFeedback[`admin:save-queued-progress:${item.id}`],
                            )}
                          >
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => onDismissQueuedProgress(item.id)} className="border border-ink/20 bg-white">Dismiss</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {tokenDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4">
          <section className="w-full max-w-md rounded-xl border border-ink/10 bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold">GitHub token required</h2>
            <p className="mt-1 text-sm text-foreground/55">Paste the token once to save changes.</p>
            <Input
              value={tokenDraft}
              onChange={(event) => onTokenDraftChange(event.target.value)}
              placeholder="ghp_..."
              className="mt-4 border border-ink/20 bg-paper"
              dir="ltr"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={onConfirmTokenAndSave}>Save</Button>
              <Button type="button" variant="outline" onClick={onCloseTokenDialog} className="border border-ink/20 bg-white">Cancel</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function LegacyAdminView({
  data,
  stats,
  saveStatus,
  isDirty,
  isSaving,
  adminQueue,
  queueStatus,
  tokenDialogOpen,
  tokenDraft,
  onLogout,
  onAddTask,
  onRemoveTask,
  onManualApprove,
  onApproveQueuedSubmission,
  onRejectQueuedSubmission,
  onSaveQueuedProgress,
  onDismissQueuedProgress,
  onAddProgressUpdate,
  onReviewAnswer,
  onUpdateMember,
  onUpdateSettings,
  onMarkRepoUpdateSeen,
  onRefreshAdminQueue,
  onTokenDraftChange,
  onCloseTokenDialog,
  onConfirmTokenAndSave,
  onSaveToGithub,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  adminQueue: AdminQueue;
  queueStatus: string;
  tokenDialogOpen: boolean;
  tokenDraft: string;
  onLogout: () => void;
  onAddTask: (task: Omit<StudioTask, "id" | "createdAt">) => void;
  onRemoveTask: (taskId: string) => void;
  onManualApprove: (task: StudioTask, memberId: string) => void;
  onApproveQueuedSubmission: (item: QueuedSubmission) => void;
  onRejectQueuedSubmission: (item: QueuedSubmission) => void;
  onSaveQueuedProgress: (item: QueuedProgressUpdate) => void;
  onDismissQueuedProgress: (id: string) => void;
  onAddProgressUpdate: (task: StudioTask, memberId: string, note: string) => void;
  onReviewAnswer: (
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note?: string,
    awardedPoints?: number,
    overrideLocked?: boolean,
  ) => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onMarkRepoUpdateSeen: (updateId: string) => void;
  onRefreshAdminQueue: () => void;
  onTokenDraftChange: (value: string) => void;
  onCloseTokenDialog: () => void;
  onConfirmTokenAndSave: () => void;
  onSaveToGithub: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});
  const [progressMembers, setProgressMembers] = useState<Record<string, string>>({});
  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const safeAdminQueue: AdminQueue = {
    submissions: data.tasks.flatMap((task) =>
      Object.values(data.responses[task.id] ?? {})
        .filter((response) => response.status === "submitted")
        .map((response) => ({
          id: `${task.id}:${response.memberId}`,
          taskId: task.id,
          memberId: response.memberId,
          memberName: response.memberName,
          answer: response.answer,
          submittedAt: response.submittedAt,
        })),
    ),
    progressUpdates: [],
  };
  const unseenUpdates = data.repoUpdates?.filter((update) => !update.seen) ?? [];

  function submitTask() {
    if (!taskTitle.trim() || !taskQuestion.trim()) return;
    if (taskScope === "member" && !taskMemberId) return;

    onAddTask({
      title: taskTitle.trim(),
      question: taskQuestion.trim(),
      points: Math.max(1, Number.isFinite(taskPoints) ? taskPoints : 1),
      scope: taskScope,
      memberId: taskScope === "member" ? taskMemberId : undefined,
    });
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto max-w-6xl px-5 pb-32 pt-10 md:pb-36 md:pt-14">
        <header className="mb-8 text-center">
          <Logo />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio Admin</span>
          </h1>
          <p className="text-lg text-foreground/75">
            إدارة التاسكات، متابعة الفريق، وحفظ التحديثات في GitHub.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-4 border-[2px] border-ink bg-paper doodle-shadow-sm"
          >
            <LogOut data-icon="inline-start" />
            تغيير الدخول
          </Button>
        </header>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {[
            ["التاسكات", data.tasks.length],
            ["إجابات مستنية", stats.pendingTotal],
            ["Repo updates", unseenUpdates.length],
            ["نقاط ظاهرة", stats.pointsTotal],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-[2.5px] border-ink bg-card p-4 text-center doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-foreground/65">{label}</div>
            </div>
          ))}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="مراجعات الموقع"
              help="تسليمات ومتابعات وصلت من أعضاء التيم من الويبسايت. القبول فقط يحسب نقاط."
            />
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshAdminQueue}
              className="border-[2px] border-ink bg-paper doodle-shadow-sm"
            >
              <RefreshCw data-icon="inline-start" />
              تحديث queue
            </Button>
          </div>
          {queueStatus && (
            <p className="mb-3 text-sm font-bold text-foreground/65">{queueStatus}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border-[2px] border-ink bg-paper p-3">
              <h3 className="mb-3 text-xl font-bold">تسليمات مستنية مراجعة</h3>
              {safeAdminQueue.submissions.length === 0 ? (
                <p className="text-sm text-foreground/60">مفيش تسليمات من الموقع حاليًا.</p>
              ) : (
                <div className="grid gap-3">
                  {safeAdminQueue.submissions.map((item) => {
                    const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                    return (
                      <div key={item.id} className="border-[2px] border-ink bg-card p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <strong>{item.memberName}</strong>
                          <span className="text-xs text-foreground/55">
                            {new Date(item.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground/65">
                          {task?.title ?? item.taskId}
                        </p>
                        <StructuredTextBlock text={item.answer} forceCollapse className="mt-2" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => onApproveQueuedSubmission(item)}
                            className="border-[2px] border-ink doodle-shadow-sm"
                          >
                            <Check data-icon="inline-start" />
                            قبول وحساب
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onRejectQueuedSubmission(item)}
                            className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                          >
                            <RotateCcw data-icon="inline-start" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-[2px] border-ink bg-yellow-50 p-3">
              <h3 className="mb-3 text-xl font-bold">متابعات بدون درجات</h3>
              {safeAdminQueue.progressUpdates.length === 0 ? (
                <p className="text-sm text-foreground/60">مفيش متابعات من الموقع حاليًا.</p>
              ) : (
                <div className="grid gap-3">
                  {safeAdminQueue.progressUpdates.map((item) => {
                    const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                    return (
                      <div key={item.id} className="border-[2px] border-ink bg-card p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <strong>{item.memberName}</strong>
                          <span className="text-xs text-foreground/55">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground/65">
                          {task?.title ?? item.taskId}
                        </p>
                        <StructuredTextBlock text={item.note} forceCollapse className="mt-2" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => onSaveQueuedProgress(item)}
                            className="border-[2px] border-ink bg-yellow-100 doodle-shadow-sm"
                          >
                            <Check data-icon="inline-start" />
                            حفظ كمتابعة
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onDismissQueuedProgress(item.id)}
                            className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                          >
                            تجاهل
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="Repo Links"
            help="أزرار مباشرة لفتح ريبوهات الأعضاء. لو العضو ملوش لينك محفوظ هتلاقيها واضحة هنا."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 border-[2px] border-ink bg-paper p-3"
              >
                <strong className="truncate">{member.name}</strong>
                {member.repoUrl ? (
                  <Button
                    type="button"
                    onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}
                    className="shrink-0 border-[2px] border-ink doodle-shadow-sm"
                  >
                    <ExternalLink data-icon="inline-start" />
                    فتح الريبو
                  </Button>
                ) : (
                  <span className="shrink-0 rounded-full border-[2px] border-ink bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    لا يوجد ريبو
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="تنبيهات الريبو"
            help="أي عضو يضغط Update GitHub Repo يظهر هنا، والضغط على اسمه يفتح الريبو بتاعه."
          />
          {unseenUpdates.length === 0 ? (
            <p className="text-sm text-foreground/60">مفيش تحديثات ريبو جديدة.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {unseenUpdates.map((update) => {
                const member = data.members.find((item) => item.id === update.memberId);
                return (
                  <div
                    key={update.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-[2px] border-ink bg-paper p-3"
                  >
                    <div>
                      <strong>{member?.name ?? update.memberId}</strong>
                      <p className="text-xs text-foreground/60">
                        {new Date(update.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member?.repoUrl && (
                        <Button
                          type="button"
                          onClick={() =>
                            window.open(member.repoUrl, "_blank", "noopener,noreferrer")
                          }
                          className="border-[2px] border-ink doodle-shadow-sm"
                        >
                          <ExternalLink data-icon="inline-start" />
                          فتح الريبو
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onMarkRepoUpdateSeen(update.id)}
                        className="border-[2px] border-ink bg-card"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إحصائيات التاسكات"
            help="متابعة سريعة: كام إجابة وصلت لكل تاسك من أصل المطلوب."
          />
          <div className="grid gap-2 md:grid-cols-2">
            {stats.taskMetrics.length === 0 ? (
              <p className="text-sm text-foreground/60">لسه مفيش تاسكات.</p>
            ) : (
              stats.taskMetrics.map((item) => (
                <div key={item.task.id} className="border-[2px] border-ink bg-paper p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{item.task.title}</strong>
                    <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-sm">
                      {item.received}/{item.expected}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/60">
                    pending {item.submitted} • accepted {item.approved} • rejected {item.rejected} •
                    progress {item.progressUpdates}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إدارة التاسكات"
            help="نزّل سؤال عام للتيم كله أو خصصه لشخص واحد، وحدد نقاطه."
          />
          <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr]">
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="عنوان التاسك"
              className="border-[2px] border-ink bg-paper"
            />
            <Input
              type="number"
              min={1}
              value={taskPoints}
              onChange={(event) => setTaskPoints(Number(event.target.value))}
              placeholder="Points"
              className="border-[2px] border-ink bg-paper"
            />
            <select
              value={taskScope === "all" ? "all" : taskMemberId}
              onChange={(event) => {
                if (event.target.value === "all") {
                  setTaskScope("all");
                  setTaskMemberId("");
                } else {
                  setTaskScope("member");
                  setTaskMemberId(event.target.value);
                }
              }}
              className="h-10 rounded-md border-[2px] border-ink bg-paper px-3 text-base"
            >
              <option value="all">تاسك عام لكل التيم</option>
              {data.members.map((member) => (
                <option key={member.id} value={member.id}>
                  تاسك لـ {member.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={taskQuestion}
            onChange={(event) => setTaskQuestion(event.target.value)}
            placeholder="اكتب السؤال أو المشكلة اللي محتاج لها أفكار..."
            className="mt-3 min-h-24 border-[2px] border-ink bg-paper"
          />
          <Button
            type="button"
            onClick={submitTask}
            className="mt-3 border-[2px] border-ink doodle-shadow-sm"
          >
            <Plus data-icon="inline-start" />
            إضافة تاسك
          </Button>
        </section>

        <section className="mb-7 flex flex-col gap-4">
          {data.tasks.length === 0 ? (
            <div
              className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
              style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
            >
              <p className="text-2xl font-bold">
                <span className="highlight-yellow">لسه مفيش تاسكات</span>
              </p>
            </div>
          ) : (
            data.tasks.map((task) => {
              const responses = Object.values(data.responses[task.id] ?? {});
              const selectedManualMember = manualApproveMembers[task.id] ?? "";
              const selectedProgressMember = progressMembers[task.id] ?? "";
              const progressNote = progressNotes[task.id] ?? "";
              const taskProgressUpdates = data.progressUpdates?.[task.id] ?? [];

              return (
                <article
                  key={task.id}
                  className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold">{task.title}</h3>
                      <p className="text-sm text-foreground/60">
                        {task.scope === "all"
                          ? "عام"
                          : `مخصص لـ ${data.members.find((member) => member.id === task.memberId)?.name}`}{" "}
                        • {task.points || 1} points
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveTask(task.id)}
                      className="border-[2px] border-ink bg-paper"
                      aria-label="حذف التاسك"
                    >
                      <Trash2 data-icon="inline-start" />
                    </Button>
                  </div>

                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>

                  <div className="mb-3 flex flex-wrap items-center gap-2 border-[2px] border-ink bg-paper p-3">
                    <Star data-icon="inline-start" />
                    <select
                      value={selectedManualMember}
                      onChange={(event) =>
                        setManualApproveMembers((current) => ({
                          ...current,
                          [task.id]: event.target.value,
                        }))
                      }
                      className="h-10 min-w-44 rounded-md border-[2px] border-ink bg-card px-3 text-base"
                    >
                      <option value="">اختار عضو للتسليم اليدوي</option>
                      {data.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => onManualApprove(task, selectedManualMember)}
                      className="border-[2px] border-ink doodle-shadow-sm"
                    >
                      <Check data-icon="inline-start" />
                      اعتماد يدوي
                    </Button>
                  </div>

                  <div className="mb-3 border-[2px] border-ink bg-yellow-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Bell data-icon="inline-start" />
                      <strong>متابعة بدون درجات</strong>
                      <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-xs font-bold">
                        لا تدخل في النقاط
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                      <select
                        value={selectedProgressMember}
                        onChange={(event) =>
                          setProgressMembers((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        className="h-10 min-w-44 rounded-md border-[2px] border-ink bg-card px-3 text-base"
                      >
                        <option value="">اختار عضو للمتابعة</option>
                        {data.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={progressNote}
                        onChange={(event) =>
                          setProgressNotes((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        placeholder="مثال: خلصت التصميم ولسه الربط"
                        className="border-[2px] border-ink bg-card"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          onAddProgressUpdate(task, selectedProgressMember, progressNote);
                          setProgressNotes((current) => ({ ...current, [task.id]: "" }));
                        }}
                        className="border-[2px] border-ink bg-yellow-100 doodle-shadow-sm"
                      >
                        <Plus data-icon="inline-start" />
                        تسجيل متابعة
                      </Button>
                    </div>
                    {taskProgressUpdates.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {taskProgressUpdates.map((update) => (
                          <div key={update.id} className="border-[2px] border-ink bg-card p-3">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <strong>{update.memberName}</strong>
                              <span className="text-xs text-foreground/55">
                                {new Date(update.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <StructuredTextBlock text={update.note} forceCollapse />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {responses.length === 0 ? (
                    <p className="text-sm text-foreground/60">لسه مفيش إجابات.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {responses.map((response) => (
                        <div
                          key={response.memberId}
                          className="border-[2px] border-ink bg-paper p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <strong>{response.memberName}</strong>
                            <span className="text-sm text-foreground/60">{response.status}</span>
                          </div>
                          <StructuredTextBlock text={response.answer} forceCollapse />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={() => onReviewAnswer(task.id, response.memberId, "approved")}
                              className="border-[2px] border-ink doodle-shadow-sm"
                            >
                              <Check data-icon="inline-start" />
                              قبول
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => onReviewAnswer(task.id, response.memberId, "rejected")}
                              className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                            >
                              <RotateCcw data-icon="inline-start" />
                              رفض وإعادة
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إدارة الفريق"
            help="الأرقام القديمة، الرسالة الحمراء، الريبو، والإخفاء المؤقت."
          />
          <div className="flex flex-col gap-4">
            {data.members.map((member) => {
              const memberScore = stats.allMemberStats.find((item) => item.member.id === member.id);

              return (
                <article
                  key={member.id}
                  className={`border-[2.5px] border-ink bg-paper p-4 transition hover:-translate-y-0.5 hover:bg-white ${
                    member.hidden ? "opacity-70" : ""
                  }`}
                  style={{ borderRadius: "18px 22px 14px 20px / 20px 14px 22px 18px" }}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-[2px] border-ink/20 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong
                          className={`text-2xl leading-none ${member.hidden ? "text-foreground/45" : ""}`}
                        >
                          {member.name}
                        </strong>
                        <span
                          className={`rounded-full border-[2px] border-ink px-2 py-1 text-xs font-bold ${
                            member.hidden
                              ? "bg-zinc-200 text-foreground/60"
                              : "bg-emerald-200 text-emerald-950"
                          }`}
                        >
                          {member.hidden ? "مخفي من المنافسة" : "ظاهر في الليدر بورد"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/65">
                        <span>مسلم: {memberScore?.submitted ?? 0}</span>
                        <span>مقبول: {memberScore?.approved ?? 0}</span>
                        <span>القبول: {formatPercent(memberScore?.approvalRate ?? 0)}</span>
                        <span>نقاط: {memberScore?.points ?? 0}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onUpdateMember(member.id, { hidden: !member.hidden })}
                      className={`border-[2px] border-ink doodle-shadow-sm ${
                        member.hidden ? "bg-emerald-100" : "bg-red-50"
                      }`}
                    >
                      {member.hidden ? (
                        <Eye data-icon="inline-start" />
                      ) : (
                        <EyeOff data-icon="inline-start" />
                      )}
                      {member.hidden ? "إظهار في الليدر بورد" : "إخفاء مؤقت"}
                    </Button>
                  </div>

                  <label className="mb-4 grid max-w-xs gap-1 text-sm font-bold">
                    درجات يدوية
                    <Input
                      type="number"
                      min={0}
                      value={member.basePoints ?? 0}
                      onChange={(event) =>
                        onUpdateMember(member.id, {
                          basePoints: sanitizeNumber(event.target.value),
                        })
                      }
                      className="border-[2px] border-ink bg-yellow-50 text-center text-lg"
                    />
                  </label>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <label className="grid gap-1 text-sm font-bold">
                      رسالة حمراء تظهر جنب الاسم لكل التيم
                      <Input
                        value={member.publicFlag ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { publicFlag: event.target.value })
                        }
                        placeholder="مثال: لسه ما سلمش / راجع الدفع"
                        className="border-[2px] border-ink bg-red-50"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      رسالة خاصة للعضو
                      <Input
                        value={member.adminNote ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { adminNote: event.target.value })
                        }
                        placeholder="رسالة تظهر للعضو لما يدخل باسمه"
                        className="border-[2px] border-ink bg-card"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      لينك الريبو
                      <Input
                        value={member.repoUrl ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { repoUrl: event.target.value })
                        }
                        placeholder="https://github.com/..."
                        className="border-[2px] border-ink bg-card ltr:text-left"
                        dir="ltr"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      الأسماء والـ nicknames
                      <Input
                        value={member.aliases.join(", ")}
                        onChange={(event) =>
                          onUpdateMember(member.id, {
                            aliases: uniqueText(event.target.value.split(",")),
                          })
                        }
                        placeholder="name, nickname, اسم عربي"
                        className="border-[2px] border-ink bg-card"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle title="Settings" help="تغيير باسورد الأدمن وباسورد شاشة الإحصائيات." />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={data.settings?.adminPassword ?? DEFAULT_ADMIN_PASSWORD}
              onChange={(event) => onUpdateSettings({ adminPassword: event.target.value })}
              placeholder="Admin password"
              className="border-[2px] border-ink bg-paper"
            />
            <Input
              value={data.settings?.statsPassword ?? DEFAULT_STATS_PASSWORD}
              onChange={(event) => onUpdateSettings({ statsPassword: event.target.value })}
              placeholder="Stats password"
              className="border-[2px] border-ink bg-paper"
            />
            <div className="rounded-md border-[2px] border-ink bg-paper px-3 py-2 text-sm font-bold md:col-span-2 ltr:text-left">
              API: {HIVO_API_URL || "not configured"}
            </div>
          </div>
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="Leaderboard"
            help="نفس الصورة اللي التيم بيشوفها، مع تفاصيل عند الضغط."
          />
          <Leaderboard scores={stats.memberStats} />
        </section>
      </div>

      <SaveBar
        saveStatus={saveStatus}
        isDirty={isDirty}
        isSaving={isSaving}
        onSaveToGithub={onSaveToGithub}
      />
    </div>
  );
}

function SaveBar({
  saveStatus,
  isDirty,
  isSaving,
  onSaveToGithub,
}: {
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  onSaveToGithub: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-ink bg-card/95 px-4 py-3 shadow-[0_-8px_0_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center text-sm font-bold text-foreground/75 sm:text-right">
          {saveStatus || (isDirty ? "Unsaved changes" : "All changes saved")}
        </div>
        <Button
          type="button"
          onClick={onSaveToGithub}
          disabled={isSaving}
          className="h-12 min-w-40 border-[2px] border-ink text-lg doodle-shadow-sm"
        >
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function StatsView({
  data,
  stats,
  onLogout,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  onLogout: () => void;
}) {
  const activeTasks = data.tasks.filter(isActiveTask);
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const visibleStats = stats.memberStats;
  const expectedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.expected, 0);
  const receivedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.received, 0);
  const completionRate = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;
  const approved = visibleStats.reduce((sum, item) => sum + item.approved, 0);
  const reviewed = visibleStats.reduce((sum, item) => sum + item.reviewed, 0);
  const teamApprovalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0;
  const totalPoints = Math.round(stats.pointsTotal * 100) / 100;
  const activeMemberCount = visibleStats.length;
  const topMember = stats.leader;
  const nextDeadlineTask = [...activeTasks]
    .filter((task) => task.deadlineAt && new Date(task.deadlineAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.deadlineAt ?? 0).getTime() - new Date(b.deadlineAt ?? 0).getTime())[0];
  const now = Date.now();

  function activeTaskMembers(task: StudioTask) {
    return data.members.filter(
      (member) =>
        !member.hidden &&
        taskIsForMember(task, member.id) &&
        !isTaskSkipped(data, task.id, member.id),
    );
  }

  function memberHasOverdueMissingTask(item: MemberScore) {
    return activeTasks.some((task) => {
      if (!task.deadlineAt || !taskIsForMember(task, item.member.id) || isTaskSkipped(data, task.id, item.member.id)) {
        return false;
      }
      const deadlineMs = new Date(task.deadlineAt).getTime();
      const response = getResponse(data, task.id, item.member.id);
      return Number.isFinite(deadlineMs) && deadlineMs < now && !response;
    });
  }

  function isStrictCriticalMember(item: MemberScore) {
    const enoughReviewedForQuality = item.reviewed >= 2;
    const enoughAssignmentsForDelivery = item.assignedTasks >= 2;
    return (
      (enoughReviewedForQuality && item.approvalRate < 50) ||
      (enoughAssignmentsForDelivery && item.responseRate < 50) ||
      memberHasOverdueMissingTask(item)
    );
  }

  function memberState(item: MemberScore) {
    if (item.assignedTasks === 0) return "No active assignments";
    if (isStrictCriticalMember(item)) return "Critical";
    return "Stable";
  }

  function memberTone(item: MemberScore) {
    const state = memberState(item);
    if (state === "Critical") return "border-red-300 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.16)]";
    if (state === "No active assignments") return "border-ink/10 bg-paper";
    return "border-emerald-200 bg-emerald-50";
  }

  function memberStateLabel(state: string) {
    if (state === "No active assignments") return "بدون تكليف";
    if (state === "Critical") return "حرج";
    return "مستقر";
  }

  function memberInsight(item: MemberScore) {
    if (isStrictCriticalMember(item)) {
      if (item.reviewed >= 2 && item.approvalRate < 50) return "قبوله أقل من المطلوب";
      if (item.assignedTasks >= 2 && item.responseRate < 50) return "تسليماته ناقصة بوضوح";
      return "عنده تكليف عدى موعده";
    }
    if (item.assignedTasks === 0) return "بدون تكليفات شغالة";
    if (item.assignedTasks > 0 && item.approved === item.assignedTasks) return "خلص كل التكليفات";
    if (item.pending > 0) return "فيه تسليمات قيد المراجعة";
    if (item.avgHours !== null && item.avgHours <= 24 && item.submitted > 0) return "سرعة التسليم ممتازة";
    return "الأداء مستقر";
  }

  function statusSegments(total: number, counts: { approved: number; pending: number; rejected: number }) {
    const safeTotal = Math.max(0, total);
    if (safeTotal === 0) {
      return [{ key: "none", label: "No assignments", count: 1, className: "bg-zinc-200" }];
    }
    const approvedCount = Math.max(0, counts.approved);
    const pendingCount = Math.max(0, counts.pending);
    const rejectedCount = Math.max(0, counts.rejected);
    const missingCount = Math.max(0, safeTotal - approvedCount - pendingCount - rejectedCount);
    return [
      { key: "approved", label: "Approved", count: approvedCount, className: "bg-emerald-500" },
      { key: "pending", label: "Pending", count: pendingCount, className: "bg-yellow-400" },
      { key: "rejected", label: "Rejected", count: rejectedCount, className: "bg-red-500" },
      { key: "missing", label: "Missing", count: missingCount, className: "bg-zinc-200" },
    ].filter((segment) => segment.count > 0);
  }

  function taskSegments(task: StudioTask) {
    const members = activeTaskMembers(task);
    const responses = data.responses[task.id] ?? {};
    return statusSegments(members.length, {
      approved: members.filter((member) => responses[member.id]?.status === "approved").length,
      pending: members.filter((member) => responses[member.id]?.status === "submitted").length,
      rejected: members.filter((member) => responses[member.id]?.status === "rejected").length,
    });
  }

  function teamSegments() {
    const counts = activeTasks.reduce(
      (sum, task) => {
        const responses = data.responses[task.id] ?? {};
        for (const member of activeTaskMembers(task)) {
          const status = responses[member.id]?.status;
          if (status === "approved") sum.approved += 1;
          if (status === "submitted") sum.pending += 1;
          if (status === "rejected") sum.rejected += 1;
        }
        return sum;
      },
      { approved: 0, pending: 0, rejected: 0 },
    );
    return statusSegments(expectedTotal, counts);
  }

  function memberSegments(memberId: string) {
    const assignedTasks = activeTasks.filter(
      (task) => taskIsForMember(task, memberId) && !isTaskSkipped(data, task.id, memberId),
    );
    return statusSegments(assignedTasks.length, {
      approved: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "approved").length,
      pending: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "submitted").length,
      rejected: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "rejected").length,
    });
  }

  function taskSubmissionDetails(task: StudioTask) {
    const members = activeTaskMembers(task);
    const responses = data.responses[task.id] ?? {};
    const receivedMembers = members.filter((member) => Boolean(responses[member.id]));
    const rejectedMembers = members.filter((member) => rejectionCount(responses[member.id]) > 0);
    return {
      singleSubmitter: receivedMembers.length === 1 ? memberArabicName(receivedMembers[0]) : "",
      rejectedNames: rejectedMembers.map((member) => memberArabicName(member)),
    };
  }

  function SegmentedStatusBar({ segments, total }: { segments: ReturnType<typeof statusSegments>; total: number }) {
    const safeTotal = Math.max(1, total);
    return (
      <div className="stats-segmented-bar">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.count}`}
            className={`stats-segment ${segment.className}`}
            style={{ width: `${total > 0 ? (segment.count / safeTotal) * 100 : 100}%` }}
          />
        ))}
      </div>
    );
  }

  const missingTotal = Math.max(0, expectedTotal - receivedTotal);
  const submissionHourSamples = activeTasks.flatMap((task) =>
    activeTaskMembers(task)
      .map((member) => {
        const response = getResponse(data, task.id, member.id);
        return response ? hoursBetween(task.createdAt, response.submittedAt) : null;
      })
      .filter((value): value is number => value !== null),
  );
  const teamAverageSubmissionHours =
    submissionHourSamples.length > 0
      ? submissionHourSamples.reduce((sum, value) => sum + value, 0) / submissionHourSamples.length
      : null;
  const lowestProgressMember =
    [...visibleStats]
      .filter((item) => item.assignedTasks > 0)
      .sort((a, b) => {
        if (a.responseRate !== b.responseRate) return a.responseRate - b.responseRate;
        if (a.approvalRate !== b.approvalRate) return a.approvalRate - b.approvalRate;
        return a.points - b.points;
      })[0] ?? stats.worst;
  const highestProgressMember =
    [...visibleStats]
      .filter((item) => item.assignedTasks > 0)
      .sort((a, b) => {
        if (b.responseRate !== a.responseRate) return b.responseRate - a.responseRate;
        if (b.approvalRate !== a.approvalRate) return b.approvalRate - a.approvalRate;
        return b.points - a.points;
      })[0] ?? stats.leader;
  const strictCriticalMembers = visibleStats.filter(isStrictCriticalMember);
  const hasCriticalState = strictCriticalMembers.length > 0;
  const teamHealthLabel = hasCriticalState ? "حالة حرجة" : "مستقر";
  const healthTone = hasCriticalState
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const meetingExpectedTotal = stats.meetingMetrics.reduce((sum, item) => sum + item.expected, 0);
  const meetingAttendedTotal = stats.meetingMetrics.reduce((sum, item) => sum + item.attended, 0);
  const meetingPulseRate =
    meetingExpectedTotal > 0 ? Math.round((meetingAttendedTotal / meetingExpectedTotal) * 100) : 0;
  const visibleMemberRows = visibleStats.slice(0, 8);

  function AnimatedProgressRing({
    value,
    label,
    caption,
  }: {
    value: number;
    label: string;
    caption: string;
  }) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    const radius = 48;
    const circumference = Math.round(2 * Math.PI * radius * 100) / 100;
    const offset = Math.round((circumference - (safeValue / 100) * circumference) * 100) / 100;

    return (
      <div className="stats-ring" aria-label={`${label} ${safeValue}%`}>
        <svg className="stats-ring-svg" viewBox="0 0 120 120" role="img">
          <circle className="stats-ring-track" cx="60" cy="60" r={radius} />
          <circle
            className="stats-ring-value"
            cx="60"
            cy="60"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="stats-ring-copy">
          <strong>{safeValue}%</strong>
          <span>{caption}</span>
        </div>
      </div>
    );
  }

  function VisualMetric({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="stats-visual-metric">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="stats-page min-h-screen text-foreground" dir="rtl">
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:py-8">
        <header className="stats-hero stats-appear">
          <div className="stats-hero-copy">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}hivo.png`}
                  alt="Hivo Studio logo"
                  className="size-16 shrink-0 rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground/55">Hivo Studio</div>
                  <h1 className="mt-1 text-4xl font-bold leading-tight md:text-5xl">
                    <span className="highlight-yellow">لوحة التيم</span>
                  </h1>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onLogout}
                className="size-11 shrink-0 rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
                aria-label="تسجيل خروج"
              >
                <LogOut className="size-5" />
              </Button>
            </div>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              متابعة سريعة وواضحة للتسليمات، القبول، والنقط من غير دخول الأدمن.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={`stats-health-pill ${healthTone}`}>{teamHealthLabel}</span>
              <span className="stats-soft-pill">
                <Users className="size-4" />
                {visibleStats.length} أعضاء
              </span>
              <span className="stats-soft-pill">
                <ListChecks className="size-4" />
                {activeTasks.length} تاسكات شغالة
              </span>
            </div>
          </div>

          <div className="stats-hero-panel">
            <AnimatedProgressRing value={completionRate} label="Team completion" caption="تسليمات التيم" />
            <div className="stats-hero-metrics">
              <VisualMetric label="تم تسليمها" value={`${receivedTotal}/${expectedTotal}`} />
              <VisualMetric label="نسبة القبول" value={`${teamApprovalRate}%`} />
              <VisualMetric label="نقط التيم" value={totalPoints} />
            </div>
          </div>
        </header>

        <section className="stats-attention-strip stats-appear" aria-label="What needs attention">
          <div className="stats-attention-heading">
            <Bell className="size-5" />
            <div>
              <h2>محتاجين نبص على إيه؟</h2>
              <p>أهم الحاجات اللي العميلة تفهمها في ثانية.</p>
            </div>
          </div>
          <div className="stats-attention-grid">
            <div className={cn("stats-attention-card", stats.pendingTotal > 0 ? "is-hot" : "is-calm")}>
              <span>مراجعات مستنية</span>
              <strong>{stats.pendingTotal}</strong>
            </div>
            <div className={cn("stats-attention-card", missingTotal > 0 ? "is-warn" : "is-calm")}>
              <span>تسليمات ناقصة</span>
              <strong>{missingTotal}</strong>
            </div>
            <div className="stats-attention-card is-soft">
              <span>أقل تقدم</span>
              <strong>{lowestProgressMember ? memberArabicName(lowestProgressMember.member) : "تمام"}</strong>
              <small>{lowestProgressMember ? formatPercent(lowestProgressMember.responseRate) : "0%"}</small>
            </div>
            <div className="stats-attention-card is-soft">
              <span>أقرب Deadline</span>
              <strong dir={nextDeadlineTask ? textDirection(nextDeadlineTask.title) : "rtl"}>
                {nextDeadlineTask?.title ?? "مفيش"}
              </strong>
              {nextDeadlineTask?.deadlineAt && <small>{formatDateTime(nextDeadlineTask.deadlineAt)}</small>}
            </div>
          </div>
        </section>

        <section className="stats-panel stats-appear">
          <div className="stats-section-head">
            <div>
              <h2>
                <span className="highlight-yellow">تقدم التاسكات</span>
              </h2>
              <p>كل صف بيوري التسليم، القبول، الناقص، والمراجعة من غير ما نفتح تفاصيل.</p>
            </div>
            <span className="stats-count-pill">
              <ListChecks className="size-4" />
              {activeTasks.length} تاسكات شغالة
            </span>
          </div>

          <div className="stats-task-board">
            {stats.taskMetrics.length === 0 ? (
              <p className="stats-empty-state">مفيش تاسكات شغالة دلوقتي.</p>
            ) : (
              stats.taskMetrics.map((metric, index) => {
                const segments = taskSegments(metric.task);
                const taskRate = metric.expected > 0 ? Math.round((metric.received / metric.expected) * 100) : 0;
                return (
                  <article
                    key={metric.task.id}
                    className="stats-task-card"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="stats-task-main">
                      <div className="min-w-0">
                        <h3 dir={textDirection(metric.task.title)} className={textAlignClass(metric.task.title)}>
                          {metric.task.title}
                        </h3>
                        <p>
                          الموعد النهائي: {taskDeadlineLabel(metric.task)} • {formatTaskPointsLabel(metric.task.points || 1)}
                        </p>
                      </div>
                      <div className="stats-task-score">
                        <strong>{metric.received}/{metric.expected}</strong>
                        <span>تسليم</span>
                      </div>
                    </div>
                    <div className="stats-task-progress-line">
                      <SegmentedStatusBar segments={segments} total={metric.expected} />
                      <span>{taskRate}%</span>
                    </div>
                    <div className="stats-task-meta">
                      <span className="is-approved">مقبول {metric.approved}</span>
                      <span className="is-pending">مراجعة {metric.submitted}</span>
                      <span className="is-rejected">مرفوض {metric.rejected}</span>
                      <span>متابعات {metric.progressUpdates}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="stats-legend">
            <span><i className="bg-emerald-500" /> مقبول</span>
            <span><i className="bg-yellow-400" /> مراجعة</span>
            <span><i className="bg-red-500" /> مرفوض</span>
            <span><i className="bg-zinc-200" /> ناقص</span>
          </div>
        </section>

        <section className="stats-performance-grid stats-appear">
          <div className="stats-spotlight-card is-best">
            <div className="stats-spotlight-icon">
              <Crown className="size-6" />
            </div>
            <span>الأعلى دلوقتي</span>
            <strong>{topMember ? memberArabicName(topMember.member) : "N/A"}</strong>
            <p>{topMember ? `${topMember.points} نقطة • قبول ${formatPercent(topMember.approvalRate)}` : "لسه مفيش بيانات"}</p>
          </div>
          <div className="stats-spotlight-card is-follow">
            <div className="stats-spotlight-icon">
              <Bell className="size-6" />
            </div>
            <span>حالة حرجة</span>
            <strong>{lowestProgressMember ? memberArabicName(lowestProgressMember.member) : "N/A"}</strong>
            <p>
              {lowestProgressMember
                ? `${formatPercent(lowestProgressMember.responseRate)} تسليم • ${lowestProgressMember.pending} مراجعة`
                : "مفيش حد متأخر"}
            </p>
          </div>

          <div className="stats-panel stats-members-panel">
            <div className="stats-section-head">
              <div>
                <h2>
                  <span className="highlight-yellow">أداء الأعضاء</span>
                </h2>
                <p>الصف الواحد يوري النقاط، التسليم، القبول، والحالة بسرعة.</p>
              </div>
              <span className="stats-count-pill">
                <BarChart3 className="size-4" />
                {teamApprovalRate}% قبول
              </span>
            </div>
            <div className="stats-member-list">
              {visibleMemberRows.map((item, index) => {
                const state = memberState(item);
                const insight = memberInsight(item);
                const segments = memberSegments(item.member.id);
                return (
                  <details
                    key={item.member.id}
                    className={cn("stats-member-row", memberTone(item))}
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="stats-member-summary">
                        <div className="stats-member-rank">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="stats-member-name-line">
                            <strong>{memberArabicName(item.member)}</strong>
                            <span>{memberStateLabel(state)}</span>
                          </div>
                          <div className="stats-member-insight">{insight}</div>
                        </div>
                        <div className="stats-member-numbers">
                          <strong>{item.points}</strong>
                          <span>نقطة</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <SegmentedStatusBar segments={segments} total={item.assignedTasks} />
                      </div>
                      <div className="stats-member-meta">
                        <span>{formatPercent(item.responseRate)} تسليم</span>
                        <span>{formatPercent(item.approvalRate)} قبول</span>
                        <span>{item.pending} مراجعة</span>
                        <span>{item.approved} مقبول</span>
                      </div>
                    </summary>
                    <StatsMemberDetails item={item} />
                  </details>
                );
              })}
            </div>
            {visibleStats.length > visibleMemberRows.length && (
              <p className="mt-3 text-center text-sm font-bold text-foreground/45">
                +{visibleStats.length - visibleMemberRows.length} أعضاء موجودين في الداتا.
              </p>
            )}
          </div>
        </section>

        {stats.meetingMetrics.length > 0 && (
          <section className="stats-panel stats-meetings-panel stats-appear">
            <div className="stats-section-head">
              <div>
                <h2>
                  <span className="highlight-yellow">نبض الاجتماعات</span>
                </h2>
                <p>حضور الميتينجز والنقط اللي دخلت منها للتيم.</p>
              </div>
              <span className="stats-count-pill">
                <CalendarClock className="size-4" />
                {meetingPulseRate}% حضور
              </span>
            </div>
            <div className="stats-meeting-summary">
              <AnimatedProgressRing value={meetingPulseRate} label="Meeting attendance" caption="حضور" />
              <div className="stats-meeting-lines">
                {stats.meetingMetrics.map((item) => {
                  const attendanceRate = item.expected > 0 ? Math.round((item.attended / item.expected) * 100) : 0;
                  return (
                    <div key={item.meeting.id} className="stats-meeting-row">
                      <div>
                        <strong dir={textDirection(item.meeting.title)}>{item.meeting.title}</strong>
                        <span>
                          {item.attended}/{item.expected} حضور • {item.totalScore} نقطة
                        </span>
                      </div>
                      <div className="stats-mini-meter" aria-label={`${attendanceRate}% attendance`}>
                        <span style={{ width: `${attendanceRate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function DeanStatsView({
  data,
  stats,
  onLogout,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  onLogout: () => void;
}) {
  const activeTasks = data.tasks.filter(isActiveTask);
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const visibleStats = stats.memberStats;
  const expectedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.expected, 0);
  const receivedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.received, 0);
  const completionRate = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;
  const approvedTotal = visibleStats.reduce((sum, item) => sum + item.approved, 0);
  const reviewedTotal = visibleStats.reduce((sum, item) => sum + item.reviewed, 0);
  const teamApprovalRate = reviewedTotal > 0 ? Math.round((approvedTotal / reviewedTotal) * 100) : 0;
  const totalPoints = Math.round(stats.pointsTotal * 100) / 100;
  const missingTotal = Math.max(0, expectedTotal - receivedTotal);
  const activeMemberCount = visibleStats.length;
  const now = Date.now();

  function activeTaskMembers(task: StudioTask) {
    return data.members.filter(
      (member) =>
        !member.hidden &&
        taskIsForMember(task, member.id) &&
        !isTaskSkipped(data, task.id, member.id),
    );
  }

  function statusSegments(total: number, counts: { approved: number; pending: number; rejected: number }) {
    const safeTotal = Math.max(0, total);
    if (safeTotal === 0) {
      return [{ key: "none", label: "No assignments", count: 1, className: "bg-zinc-200" }];
    }
    const approvedCount = Math.max(0, counts.approved);
    const pendingCount = Math.max(0, counts.pending);
    const rejectedCount = Math.max(0, counts.rejected);
    const missingCount = Math.max(0, safeTotal - approvedCount - pendingCount - rejectedCount);
    return [
      { key: "approved", label: "Approved", count: approvedCount, className: "bg-emerald-500" },
      { key: "pending", label: "Pending", count: pendingCount, className: "bg-yellow-400" },
      { key: "rejected", label: "Rejected", count: rejectedCount, className: "bg-red-500" },
      { key: "missing", label: "Missing", count: missingCount, className: "bg-zinc-200" },
    ].filter((segment) => segment.count > 0);
  }

  function taskSegments(task: StudioTask) {
    const members = activeTaskMembers(task);
    const responses = data.responses[task.id] ?? {};
    return statusSegments(members.length, {
      approved: members.filter((member) => responses[member.id]?.status === "approved").length,
      pending: members.filter((member) => responses[member.id]?.status === "submitted").length,
      rejected: members.filter((member) => rejectionCount(responses[member.id]) > 0).length,
    });
  }

  function memberSegments(memberId: string) {
    const assignedTasks = activeTasks.filter(
      (task) => taskIsForMember(task, memberId) && !isTaskSkipped(data, task.id, memberId),
    );
    return statusSegments(assignedTasks.length, {
      approved: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "approved").length,
      pending: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "submitted").length,
      rejected: assignedTasks.filter((task) => rejectionCount(getResponse(data, task.id, memberId)) > 0).length,
    });
  }

  function taskSubmissionDetails(task: StudioTask) {
    const members = activeTaskMembers(task);
    const responses = data.responses[task.id] ?? {};
    const receivedMembers = members.filter((member) => Boolean(responses[member.id]));
    const rejectedMembers = members.filter((member) => rejectionCount(responses[member.id]) > 0);
    return {
      singleSubmitter: receivedMembers.length === 1 ? memberArabicName(receivedMembers[0]) : "",
      rejectedNames: rejectedMembers.map((member) => memberArabicName(member)),
    };
  }

  function memberHasOverdueMissingTask(item: MemberScore) {
    return activeTasks.some((task) => {
      if (!task.deadlineAt || !taskIsForMember(task, item.member.id) || isTaskSkipped(data, task.id, item.member.id)) {
        return false;
      }
      const deadlineMs = new Date(task.deadlineAt).getTime();
      const response = getResponse(data, task.id, item.member.id);
      return Number.isFinite(deadlineMs) && deadlineMs + 24 * 36e5 < now && !response;
    });
  }

  function isStrictCriticalMember(item: MemberScore) {
    return (
      (item.reviewed >= 2 && item.approvalRate < 50) ||
      (item.assignedTasks >= 2 && item.responseRate < 50) ||
      memberHasOverdueMissingTask(item)
    );
  }

  function memberState(item: MemberScore) {
    if (item.assignedTasks === 0) return "بدون تكليف";
    if (isStrictCriticalMember(item)) return "حرج";
    return item.approvalRate >= 80 || item.responseRate >= 80 ? "تمام" : "مستقر";
  }

  function memberTone(item: MemberScore) {
    if (isStrictCriticalMember(item)) return "border-red-300 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.16)]";
    if (item.assignedTasks === 0) return "border-ink/10 bg-paper";
    return "border-emerald-200 bg-emerald-50";
  }

  function memberInsight(item: MemberScore) {
    if (isStrictCriticalMember(item)) {
      if (item.reviewed >= 2 && item.approvalRate < 50) return "نسبة القبول محتاجة تدخل";
      if (item.assignedTasks >= 2 && item.responseRate < 50) return "التسليمات ناقصة بشكل واضح";
      return "فيه تكليف عدى موعده بوضوح";
    }
    if (item.assignedTasks === 0) return "مفيش تكليفات شغالة عليه";
    if (item.approved === item.assignedTasks) return "خلص كل التكليفات";
    if (item.pending > 0) return "فيه تسليمات قيد المراجعة";
    return "الأداء مستقر";
  }

  function SegmentedStatusBar({ segments, total }: { segments: ReturnType<typeof statusSegments>; total: number }) {
    const safeTotal = Math.max(1, total);
    return (
      <div className="stats-segmented-bar">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.count}`}
            className={`stats-segment ${segment.className}`}
            style={{ width: `${total > 0 ? (segment.count / safeTotal) * 100 : 100}%` }}
          />
        ))}
      </div>
    );
  }

  function AnimatedProgressRing({
    value,
    label,
    caption,
  }: {
    value: number;
    label: string;
    caption: string;
  }) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    const radius = 48;
    const circumference = Math.round(2 * Math.PI * radius * 100) / 100;
    const offset = Math.round((circumference - (safeValue / 100) * circumference) * 100) / 100;

    return (
      <div className="stats-ring" aria-label={`${label} ${safeValue}%`}>
        <svg className="stats-ring-svg" viewBox="0 0 120 120" role="img">
          <circle className="stats-ring-track" cx="60" cy="60" r={radius} />
          <circle
            className="stats-ring-value"
            cx="60"
            cy="60"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="stats-ring-copy">
          <strong>{safeValue}%</strong>
          <span>{caption}</span>
        </div>
      </div>
    );
  }

  function VisualMetric({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="stats-visual-metric">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    );
  }

  const submissionHourSamples = activeTasks.flatMap((task) =>
    activeTaskMembers(task)
      .map((member) => {
        const response = getResponse(data, task.id, member.id);
        return response ? hoursBetween(task.createdAt, response.submittedAt) : null;
      })
      .filter((value): value is number => value !== null),
  );
  const teamAverageSubmissionHours =
    submissionHourSamples.length > 0
      ? submissionHourSamples.reduce((sum, value) => sum + value, 0) / submissionHourSamples.length
      : null;
  const highestProgressMember =
    [...visibleStats]
      .filter((item) => item.assignedTasks > 0)
      .sort((a, b) => {
        if (b.responseRate !== a.responseRate) return b.responseRate - a.responseRate;
        if (b.approvalRate !== a.approvalRate) return b.approvalRate - a.approvalRate;
        return b.points - a.points;
      })[0] ?? stats.leader;
  const lowestProgressMember =
    [...visibleStats]
      .filter((item) => item.assignedTasks > 0)
      .sort((a, b) => {
        if (a.responseRate !== b.responseRate) return a.responseRate - b.responseRate;
        if (a.approvalRate !== b.approvalRate) return a.approvalRate - b.approvalRate;
        return a.points - b.points;
      })[0] ?? stats.worst;
  const strictCriticalMembers = visibleStats.filter(isStrictCriticalMember);
  const hasCriticalState = strictCriticalMembers.length > 0;
  const teamHealthLabel = hasCriticalState ? "حالة حرجة" : "مستقر";
  const healthTone = hasCriticalState
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const meetingExpectedTotal = stats.meetingMetrics.reduce((sum, item) => sum + item.expected, 0);
  const meetingAttendedTotal = stats.meetingMetrics.reduce((sum, item) => sum + item.attended, 0);
  const meetingPulseRate =
    meetingExpectedTotal > 0 ? Math.round((meetingAttendedTotal / meetingExpectedTotal) * 100) : 0;
  const visibleMemberRows = visibleStats.slice(0, 8);

  return (
    <div className="stats-page min-h-screen text-foreground" dir="rtl">
      <main className="stats-shell mx-auto grid gap-4 px-3 py-4">
        <header className="stats-hero stats-appear">
          <div className="stats-hero-copy">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}hivo.png`}
                  alt="Hivo Studio logo"
                  className="size-16 shrink-0 rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground/55">Hivo Studio</div>
                  <h1 className="mt-1 text-4xl font-bold leading-tight">
                    <span className="highlight-yellow">لوحة التيم</span>
                  </h1>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onLogout}
                className="size-11 shrink-0 rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
                aria-label="تسجيل خروج"
              >
                <LogOut className="size-5" />
              </Button>
            </div>
            <p className="mt-4 text-lg leading-8 text-foreground/70">
              حضرتك هنا شايفة أداء التيم بسرعة: التسليمات، القبول، السرعة، والدرجات.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className={`stats-health-pill ${healthTone}`}>{teamHealthLabel}</span>
              <span className="stats-soft-pill">
                <Users className="size-4" />
                {activeMemberCount} أعضاء شغالين حاليا
              </span>
              <span className="stats-soft-pill">
                <ListChecks className="size-4" />
                {activeTasks.length} تاسكات شغالة
              </span>
            </div>
          </div>

          <div className="stats-hero-panel">
            <AnimatedProgressRing value={completionRate} label="Team completion" caption="تسليمات التيم" />
            <div className="stats-hero-metrics">
              <VisualMetric label="أعضاء شغالين" value={activeMemberCount} />
              <VisualMetric label="تاسكات شغالة" value={activeTasks.length} />
              <VisualMetric label="التسليمات" value={`${receivedTotal}/${expectedTotal}`} />
              <VisualMetric label="القبول / الدرجات" value={`${teamApprovalRate}% / ${totalPoints}`} />
            </div>
          </div>
        </header>

        <section className="stats-attention-strip stats-appear" aria-label="Important dean attention points">
          <div className="stats-attention-heading">
            <Bell className="size-5" />
            <div>
              <h2>اللي حضرتك محتاج تبص عليه</h2>
              <p>أربع مؤشرات مختصرة لأداء التيم ككل.</p>
            </div>
          </div>
          <div className="stats-attention-grid">
            <div className="stats-attention-card is-calm">
              <span>أعلى تقدم</span>
              <strong>{highestProgressMember ? memberArabicName(highestProgressMember.member) : "مفيش"}</strong>
              <small>{highestProgressMember ? formatPercent(highestProgressMember.responseRate) : "0%"}</small>
            </div>
            <div className={cn("stats-attention-card", missingTotal > 0 ? "is-warn" : "is-calm")}>
              <span>تسليمات ناقصة</span>
              <strong>{missingTotal}</strong>
            </div>
            <div className="stats-attention-card is-soft">
              <span>أقل تقدم</span>
              <strong>{lowestProgressMember ? memberArabicName(lowestProgressMember.member) : "تمام"}</strong>
              <small>{lowestProgressMember ? formatPercent(lowestProgressMember.responseRate) : "0%"}</small>
            </div>
            <div className="stats-attention-card is-soft">
              <span>متوسط سرعة التسليم</span>
              <strong>{teamAverageSubmissionHours === null ? "لسه" : formatHours(teamAverageSubmissionHours)}</strong>
              <small>على مستوى التيم</small>
            </div>
          </div>
        </section>

        {stats.meetingMetrics.length > 0 && (
          <section className="stats-panel stats-meetings-panel stats-appear">
            <div className="stats-section-head">
              <div>
                <h2>
                  <span className="highlight-yellow">نبض الاجتماعات</span>
                </h2>
                <p>عدد الميتينج الشغالة ونسبة حضور التيم.</p>
              </div>
              <span className="stats-count-pill">
                <CalendarClock className="size-4" />
                {activeMeetings.length} ميتينج
              </span>
            </div>
            <div className="stats-meeting-summary">
              <AnimatedProgressRing value={meetingPulseRate} label="Meeting attendance" caption="حضور" />
              <div className="stats-meeting-lines">
                <div className="stats-meeting-row is-summary">
                  <div>
                    <strong>{meetingPulseRate}% حضور عام</strong>
                    <span>
                      {meetingAttendedTotal}/{meetingExpectedTotal} حضور مسجل
                    </span>
                  </div>
                  <div className="stats-mini-meter" aria-label={`${meetingPulseRate}% attendance`}>
                    <span style={{ width: `${meetingPulseRate}%` }} />
                  </div>
                </div>
                {stats.meetingMetrics.map((item) => {
                  const attendanceRate = item.expected > 0 ? Math.round((item.attended / item.expected) * 100) : 0;
                  return (
                    <div key={item.meeting.id} className="stats-meeting-row">
                      <div>
                        <strong dir={textDirection(item.meeting.title)}>{item.meeting.title}</strong>
                        <span>
                          {item.attended}/{item.expected} حضور • {item.totalScore} درجات
                        </span>
                      </div>
                      <div className="stats-mini-meter" aria-label={`${attendanceRate}% attendance`}>
                        <span style={{ width: `${attendanceRate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="stats-panel stats-appear">
          <div className="stats-section-head">
            <div>
              <h2>
                <span className="highlight-yellow">تقدم التاسكات</span>
              </h2>
              <p>كل تاسك ظاهر مع نسبة التسليم، القبول، الرفض، والناقص.</p>
            </div>
            <span className="stats-count-pill">
              <ListChecks className="size-4" />
              {activeTasks.length} تاسكات شغالة
            </span>
          </div>

          <div className="stats-task-board">
            {stats.taskMetrics.length === 0 ? (
              <p className="stats-empty-state">مفيش تاسكات شغالة دلوقتي.</p>
            ) : (
              stats.taskMetrics.map((metric, index) => {
                const segments = taskSegments(metric.task);
                const taskRate = metric.expected > 0 ? Math.round((metric.received / metric.expected) * 100) : 0;
                const submissionDetails = taskSubmissionDetails(metric.task);
                return (
                  <article
                    key={metric.task.id}
                    className="stats-task-card"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="stats-task-main">
                      <div className="min-w-0">
                        <h3 dir={textDirection(metric.task.title)} className={textAlignClass(metric.task.title)}>
                          {metric.task.title}
                        </h3>
                        <p>
                          deadline: {taskDeadlineLabel(metric.task)} • {formatTaskPointsLabel(metric.task.points || 1)}
                        </p>
                      </div>
                      <div className="stats-task-score">
                        <strong>{metric.received}/{metric.expected}</strong>
                        <span>تسليم</span>
                      </div>
                    </div>
                    <div className="stats-task-progress-line">
                      <SegmentedStatusBar segments={segments} total={metric.expected} />
                      <span>{taskRate}%</span>
                    </div>
                    <div className="stats-task-meta">
                      <span className="is-approved">مقبول {metric.approved}</span>
                      <span className="is-pending">مراجعة {metric.submitted}</span>
                      {submissionDetails.rejectedNames.length > 0 ? (
                        <details className="stats-rejected-details">
                          <summary className="is-rejected">مرفوض {metric.rejected}</summary>
                          <div className="stats-rejected-list">{submissionDetails.rejectedNames.join("، ")}</div>
                        </details>
                      ) : (
                        <span className="is-rejected">مرفوض {metric.rejected}</span>
                      )}
                      <span>متابعات {metric.progressUpdates}</span>
                      {submissionDetails.singleSubmitter && (
                        <span className="is-single-submitter">سلّم: {submissionDetails.singleSubmitter}</span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="stats-legend">
            <span><i className="bg-emerald-500" /> مقبول</span>
            <span><i className="bg-yellow-400" /> مراجعة</span>
            <span><i className="bg-red-500" /> مرفوض</span>
            <span><i className="bg-zinc-200" /> ناقص</span>
          </div>
        </section>

        <section className="stats-panel stats-members-panel stats-appear">
          <div className="stats-section-head">
            <div>
              <h2>
                <span className="highlight-yellow">أداء الأعضاء</span>
              </h2>
              <p>كل صف يوضح الدرجات، نسبة التسليم، القبول، والحالة بشكل سريع.</p>
            </div>
            <span className="stats-count-pill">
              <BarChart3 className="size-4" />
              {teamApprovalRate}% قبول
            </span>
          </div>
          <div className="stats-member-list">
            {visibleMemberRows.map((item, index) => {
              const state = memberState(item);
              const insight = memberInsight(item);
              const segments = memberSegments(item.member.id);
              return (
                <details
                  key={item.member.id}
                  className={cn("stats-member-row", memberTone(item))}
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="stats-member-summary">
                      <div className="stats-member-rank">{index + 1}</div>
                      <div className="min-w-0">
                        <div className="stats-member-name-line">
                          <strong>{memberArabicName(item.member)}</strong>
                          <span>{state}</span>
                        </div>
                        <div className="stats-member-insight">{insight}</div>
                      </div>
                      <div className="stats-member-numbers">
                        <strong>{item.points}</strong>
                        <span>درجات</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SegmentedStatusBar segments={segments} total={item.assignedTasks} />
                    </div>
                    <div className="stats-member-meta">
                      <span>{formatPercent(item.responseRate)} تسليم</span>
                      <span>{formatPercent(item.approvalRate)} قبول</span>
                      <span>خلص {item.approved}/{item.assignedTasks}</span>
                      <span>{item.pending} مراجعة</span>
                    </div>
                  </summary>
                  <StatsMemberDetails item={item} />
                </details>
              );
            })}
          </div>
          {visibleStats.length > visibleMemberRows.length && (
            <p className="mt-3 text-center text-sm font-bold text-foreground/45">
              +{visibleStats.length - visibleMemberRows.length} أعضاء موجودين في الداتا.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function LegacyStatsView({
  data,
  stats,
  onLogout,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  onLogout: () => void;
}) {
  const visibleStats = stats.memberStats;
  const best = visibleStats[0];
  const worst = visibleStats[visibleStats.length - 1];
  const fastest = [...visibleStats]
    .filter((item) => item.avgHours !== null)
    .sort((a, b) => (a.avgHours ?? 0) - (b.avgHours ?? 0))[0];
  const slowest = [...visibleStats]
    .filter((item) => item.avgHours !== null)
    .sort((a, b) => (b.avgHours ?? 0) - (a.avgHours ?? 0))[0];
  const topPoints = [...visibleStats].sort((a, b) => b.points - a.points)[0];
  const lowestApprovalRate = [...visibleStats]
    .filter((item) => item.reviewed > 0)
    .sort((a, b) => a.approvalRate - b.approvalRate)[0];
  const mostPending = [...visibleStats].sort((a, b) => b.pending - a.pending)[0];
  const lowestResponseRate = [...visibleStats]
    .filter((item) => item.assignedTasks > 0)
    .sort((a, b) => a.responseRate - b.responseRate)[0];
  const totalSubmitted = visibleStats.reduce((sum, item) => sum + item.submitted, 0);
  const totalReviewed = visibleStats.reduce((sum, item) => sum + item.reviewed, 0);
  const totalApproved = visibleStats.reduce((sum, item) => sum + item.approved, 0);
  const totalApprovalRate = totalReviewed > 0 ? formatPercent((totalApproved / totalReviewed) * 100) : "0%";

  const insightCards = [
    {
      label: "أفضل أداء",
      value: best?.member.name ?? "N/A",
      detail: best ? `Points ${best.points} | Done ${best.completed}` : "لسه مفيش بيانات",
    },
    {
      label: "أعلى نقاط",
      value: topPoints?.member.name ?? "N/A",
      detail: topPoints ? `${topPoints.points} pts` : "لسه مفيش نقاط",
    },
    {
      label: "أسرع تسليم",
      value: fastest?.member.name ?? "N/A",
      detail: fastest ? formatHours(fastest.avgHours) : "مفيش تسليمات متوقتة",
    },
    {
      label: "أبطأ تسليم",
      value: slowest?.member.name ?? "N/A",
      detail: slowest ? formatHours(slowest.avgHours) : "مفيش تسليمات متوقتة",
    },
    {
      label: "أقل قبول",
      value: lowestApprovalRate?.member.name ?? "N/A",
      detail: lowestApprovalRate ? `${formatPercent(lowestApprovalRate.approvalRate)} approval` : "مفيش مراجعات",
    },
    {
      label: "أكثر Pending",
      value: mostPending?.member.name ?? "N/A",
      detail: mostPending ? `${mostPending.pending} pending` : "مفيش انتظار",
    },
    {
      label: "أقل تسليم",
      value: lowestResponseRate?.member.name ?? "N/A",
      detail: lowestResponseRate
        ? `${formatPercent(lowestResponseRate.responseRate)} submitted`
        : "مفيش تاسكات مفتوحة",
    },
    {
      label: "الأضعف في الليدر بورد",
      value: worst?.member.name ?? "N/A",
      detail: worst ? `Points ${worst.points} | Done ${worst.completed}` : "لسه مفيش بيانات",
    },
  ];

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <header className="mb-8 text-center">
          <Logo />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Statistics</span>
          </h1>
          <p className="text-lg text-foreground/75">
            شاشة قراءة فقط: مين شغال، مين سريع، ومين محتاج تدخل واضح.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-4 border-[2px] border-ink bg-paper doodle-shadow-sm"
          >
            <LogOut data-icon="inline-start" />
            خروج
          </Button>
        </header>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {[
            ["التاسكات", data.tasks.length],
            ["إجمالي التسليم", totalSubmitted],
            ["Pending", stats.pendingTotal],
            ["قبول", totalApprovalRate],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-[2.5px] border-ink bg-card p-4 text-center doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-foreground/65">{label}</div>
            </div>
          ))}
        </section>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {insightCards.map((card) => (
            <div
              key={card.label}
              className="border-[2.5px] border-ink bg-card p-4 doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-sm text-foreground/60">{card.label}</div>
              <strong className="mt-1 block text-lg">{card.value}</strong>
              <div className="mt-1 text-xs text-foreground/60">{card.detail}</div>
            </div>
          ))}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إحصائيات التاسكات"
            help="لكل تاسك: كام إجابة وصلت من أصل المطلوب، وكام اتقبل أو اترفض."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {stats.taskMetrics.length === 0 ? (
              <p className="text-sm text-foreground/60">لسه مفيش تاسكات.</p>
            ) : (
              stats.taskMetrics.map((item) => (
                <div key={item.task.id} className="border-[2px] border-ink bg-paper p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <strong>{item.task.title}</strong>
                    <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-sm font-bold">
                      {item.received}/{item.expected}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-4">
                    <span>Pending: {item.submitted}</span>
                    <span>Accepted: {item.approved}</span>
                    <span>Rejected: {item.rejected}</span>
                    <span>
                      Rate:{" "}
                      {formatPercent(item.expected > 0 ? (item.received / item.expected) * 100 : 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="كل الأشخاص"
            help="نقاط، تسليم، قبول، رفض، pending، نسبة التسليم، وسرعة كل عضو."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {stats.memberStats.map((item) => (
              <div
                key={item.member.id}
                className={`border-[2px] border-ink bg-paper p-3 ${
                  item.member.hidden ? "opacity-55" : ""
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{item.member.name}</strong>
                    {item.member.hidden && (
                      <span className="ms-2 text-xs text-foreground/55">hidden</span>
                    )}
                    {item.member.publicFlag && (
                      <div className="text-xs font-bold text-red-600">{item.member.publicFlag}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.member.repoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          window.open(item.member.repoUrl, "_blank", "noopener,noreferrer")
                        }
                        className="border-[2px] border-ink"
                      >
                        Repo
                      </Button>
                    )}
                  </div>
                </div>
                <MemberDetails item={item} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

async function fetchStudioData() {
  if (HIVO_API_URL) {
    const response = await fetch(`${HIVO_API_URL}/api/data?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Backend data is not available.");
    return sanitizeData((await response.json()) as StudioData);
  }

  const response = await fetch(`${import.meta.env.BASE_URL}team-data.json?ts=${Date.now()}`, {
    cache: "no-store",
  });
  return sanitizeData((await response.json()) as StudioData);
}

async function postApi<TResponse>(path: string, body: unknown, adminPassword?: string) {
  if (!HIVO_API_URL) {
    throw new Error("Backend is unavailable. Please try again.");
  }

  const response = await fetch(`${HIVO_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminPassword ? { "x-admin-password": adminPassword } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Backend rejected the save.");
  }

  return (await response.json()) as TResponse;
}

async function postSubmission(item: QueuedSubmission) {
  return sanitizeData(await postApi<StudioData>("/api/submissions", item));
}

async function postProgressUpdate(item: QueuedProgressUpdate) {
  return sanitizeData(await postApi<StudioData>("/api/progress-updates", item));
}

async function postRepoAttention(item: RepoAttentionRequest) {
  return sanitizeData(await postApi<StudioData>("/api/repo-attention", item));
}

async function postProfileChangeRequest(item: MemberProfileRequestInput) {
  return sanitizeData(await postApi<StudioData>("/api/profile-requests", item));
}

async function postInteraction(item: InteractionInput) {
  return sanitizeData(await postApi<StudioData>("/api/interactions", item));
}

async function postAdminMutation(
  adminPassword: string,
  action: string,
  payload: Record<string, unknown>,
) {
  return sanitizeData(await postApi<StudioData>("/api/admin/mutate", { action, payload }, adminPassword));
}

function normalizeBackendUrl(value?: string) {
  return (value ?? "").trim().replace(/\/+$/, "");
}

async function submitQueuedItem<TItem extends QueuedSubmission | QueuedProgressUpdate>(
  backendUrl: string | undefined,
  path: "submissions" | "progress-updates",
  item: TItem,
) {
  const baseUrl = normalizeBackendUrl(backendUrl);

  if (!baseUrl) {
    const queue = readLocalQueue();
    if (path === "submissions") {
      writeLocalQueue({ ...queue, submissions: [item as QueuedSubmission, ...queue.submissions] });
    } else {
      writeLocalQueue({
        ...queue,
        progressUpdates: [item as QueuedProgressUpdate, ...queue.progressUpdates],
      });
    }
    return "local";
  }

  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Backend rejected the submission.");
  return "backend";
}

async function fetchAdminQueue(backendUrl?: string) {
  const baseUrl = normalizeBackendUrl(backendUrl);
  if (!baseUrl) return readLocalQueue();

  const response = await fetch(`${baseUrl}/admin-queue?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Backend queue is not available.");
  const data = (await response.json()) as Partial<AdminQueue>;
  return {
    submissions: data.submissions ?? [],
    progressUpdates: data.progressUpdates ?? [],
  };
}

async function deleteQueuedItem(
  backendUrl: string | undefined,
  path: "submissions" | "progress-updates",
  id: string,
) {
  const baseUrl = normalizeBackendUrl(backendUrl);
  if (!baseUrl) return;

  await fetch(`${baseUrl}/${path}/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {
    // Some simple backends may clear items server-side during approval instead.
  });
}

function Index() {
  const [data, setData] = useState<StudioData>(DEFAULT_DATA);
  const [activeMember, setActiveMember] = useState<ActiveMember | null>(null);
  const [activeAdmin, setActiveAdmin] = useState(false);
  const [activeStats, setActiveStats] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(() =>
    readMemberDrafts(),
  );
  const [sentState, setSentState] = useState<Record<string, string>>(() => readMemberSentState());
  const [githubToken, setGithubToken] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [refreshStatus, setRefreshStatus] = useState("");
  const [queueStatus, setQueueStatus] = useState("");
  const [adminQueue, setAdminQueue] = useState<AdminQueue>(emptyQueue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const initialData = await fetchStudioData();

      if (!mounted) return;
      setData(initialData);
      setGithubToken(window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? "");

      const hasAdminSession = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
      if (hasAdminSession) {
        setAdminPassword(window.localStorage.getItem(ADMIN_AUTH_KEY) ?? "");
        setActiveAdmin(true);
        return;
      }

      const hasStatsSession = window.localStorage.getItem(STATS_SESSION_KEY) === "true";
      if (hasStatsSession) {
        setActiveStats(true);
        return;
      }

      const activeMemberId = window.localStorage.getItem(ACTIVE_MEMBER_KEY);
      const displayName = window.localStorage.getItem(ACTIVE_DISPLAY_NAME_KEY);
      const savedMember = initialData.members.find((member) => member.id === activeMemberId);
      if (savedMember)
        setActiveMember({ member: savedMember, displayName: displayName || savedMember.name });
    }

    loadData().catch(() => {
      if (mounted) setData(DEFAULT_DATA);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeMember) return;
    const freshMember = data.members.find((member) => member.id === activeMember.member.id);
    if (freshMember && freshMember !== activeMember.member) {
      setActiveMember((current) =>
        current ? { member: freshMember, displayName: current.displayName } : current,
      );
    }
  }, [activeMember, data.members]);

  const stats = useMemo(() => createStats(data), [data]);

  const refreshAdminQueue = useCallback(async () => {
    setQueueStatus("Syncing data...");
    try {
      const freshData = await fetchStudioData();
      setData(freshData);
      setIsDirty(false);
      setQueueStatus("Data refreshed from the shared backend.");
      return true;
    } catch (error) {
      setQueueStatus(error instanceof Error ? error.message : "Could not refresh shared data.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!activeAdmin) return;
    void refreshAdminQueue();
  }, [activeAdmin, refreshAdminQueue]);

  function updateData(updater: (current: StudioData) => StudioData) {
    setData((current) =>
      sanitizeData({ ...updater(current), meta: { updatedAt: new Date().toISOString() } }),
    );
    setIsDirty(true);
    setSaveStatus("في تغييرات غير محفوظة");
  }

  async function saveCurrentData() {
    if (!adminPassword) {
      setSaveStatus("سجل دخول الأدمن مرة تانية عشان نقدر نحفظ.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("جاري مزامنة البيانات...");
    try {
      const nextData = await postAdminMutation(adminPassword, "replaceData", { data });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("تم الحفظ على GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `فشل الحفظ: ${error.message}` : "فشل الحفظ، التغيير لم يتم اعتماده.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshData() {
    const freshData = await fetchStudioData();
    setData(freshData);
    setRefreshStatus("تم تحديث الداتا،");
  }

  async function markInteraction(item: InteractionInput) {
    const optimistic: MemberInteraction = {
      id: interactionKey(item.memberId, item.targetType, item.targetId),
      memberId: item.memberId,
      targetType: item.targetType,
      targetId: item.targetId,
      taskId: item.taskId,
      seenAt: new Date().toISOString(),
    };
    setData((current) =>
      sanitizeData({
        ...current,
        interactions: [optimistic, ...(current.interactions ?? [])],
      }),
    );

    try {
      const nextData = await postInteraction(item);
      setData(nextData);
      setIsDirty(false);
      return true;
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "Seen was saved locally only.");
      return false;
    }
  }

  function loginMember(member: Member, displayName: string) {
    setActiveAdmin(false);
    setActiveStats(false);
    setActiveMember({ member, displayName });
  }

  function loginAdmin(password: string) {
    setActiveMember(null);
    setActiveStats(false);
    setAdminPassword(password);
    setActiveAdmin(true);
  }

  function loginStats() {
    setActiveMember(null);
    setActiveAdmin(false);
    setActiveStats(true);
  }

  function logout() {
    window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
    window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.localStorage.removeItem(ADMIN_AUTH_KEY);
    window.localStorage.removeItem(STATS_SESSION_KEY);
    setAdminPassword("");
    setActiveMember(null);
    setActiveAdmin(false);
    setActiveStats(false);
  }

  async function addTask(task: Omit<StudioTask, "id" | "createdAt">) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving task to GitHub...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addTask", { task });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTask(taskId: string, updates: Partial<StudioTask>) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving task update...");
    try {
      const nextData = await postAdminMutation(adminPassword, "updateTask", { taskId, updates });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task update saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addTaskUpdate(taskId: string, message: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Sending task update...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addTaskUpdate", {
        taskId,
        message: message.trim(),
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task update sent.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addBonusGrade(memberId: string, points: number, note: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving bonus grade...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addBonusGrade", {
        memberId,
        points,
        note: note.trim(),
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Bonus grade saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addMeeting(meeting: Omit<Meeting, "id" | "createdAt">) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving meeting...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addMeeting", { meeting });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Meeting saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateMeeting(meetingId: string, updates: Partial<Meeting>) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving meeting update...");
    try {
      const nextData = await postAdminMutation(adminPassword, "updateMeeting", { meetingId, updates });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Meeting update saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function recordMeetingAttendance(meeting: Meeting, member: Member) {
    if (!canRecordMeetingAttendance(meeting)) {
      setSaveStatus(`Attendance opens at ${formatDateTime(meeting.startsAt)}.`);
      return false;
    }

    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving attendance...");
    try {
      const nextData = await postAdminMutation(adminPassword, "recordMeetingAttendance", {
        meetingId: meeting.id,
        memberId: member.id,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Attendance saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function setMeetingAttendanceScore(meeting: Meeting, member: Member, score: number) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving meeting score...");
    try {
      const nextData = await postAdminMutation(adminPassword, "setMeetingAttendanceScore", {
        meetingId: meeting.id,
        memberId: member.id,
        score,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Meeting score saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function recalculateMeetingAttendanceScores(meeting: Meeting) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Recalculating meeting scores...");
    try {
      const nextData = await postAdminMutation(adminPassword, "recalculateMeetingAttendanceScores", {
        meetingId: meeting.id,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Meeting scores recalculated.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMeeting(meetingId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Deleting meeting...");
    try {
      const nextData = await postAdminMutation(adminPassword, "removeMeeting", { meetingId });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Meeting deleted.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTask(taskId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Deleting task...");
    try {
      const nextData = await postAdminMutation(adminPassword, "removeTask", { taskId });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task deleted from GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function submitFinalSubmission(task: StudioTask) {
    if (!activeMember) return false;
    const key = responseKey(task.id, activeMember.member.id);
    const answer = (draftAnswers[key] ?? getResponse(data, task.id, activeMember.member.id)?.answer ?? "").trim();
    if (!answer) return false;

    const item: QueuedSubmission = {
      id: `submission-${Date.now()}`,
      taskId: task.id,
      memberId: activeMember.member.id,
      memberName: activeMember.displayName,
      answer,
      submittedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const nextData = await postSubmission(item);
      const repoUpdate = createRepoUpdateFromText({
        memberId: item.memberId,
        taskId: item.taskId,
        source: "submission",
        text: item.answer,
      });
      setData(appendRepoUpdateIfMissing(nextData, repoUpdate));
      setIsDirty(false);
      writeMemberDrafts({ ...readMemberDrafts(), [key]: answer });
      setSentState((current) => {
        const next = { ...current, [key]: "pending" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus("Submission saved centrally and is waiting for admin review.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Submission failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProgressUpdate(task: StudioTask) {
    if (!activeMember) return false;
    const key = progressKey(task.id, activeMember.member.id);
    const note = draftAnswers[key]?.trim();
    if (!note) return false;

    const item: QueuedProgressUpdate = {
      id: `progress-${Date.now()}`,
      taskId: task.id,
      memberId: activeMember.member.id,
      memberName: activeMember.displayName,
      note,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const nextData = await postProgressUpdate(item);
      const repoUpdate = createAttentionUpdate({
        memberId: item.memberId,
        taskId: item.taskId,
        source: "progress",
        text: item.note,
      });
      setData(appendRepoUpdateIfMissing(nextData, repoUpdate));
      setIsDirty(false);
      writeMemberDrafts({ ...readMemberDrafts(), [key]: note });
      setSentState((current) => {
        const next = { ...current, [key]: "sent" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus("Progress update saved centrally. It does not count as points.");
      return true;
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "Progress update failed.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendRepoAttention(task: StudioTask) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postRepoAttention({
        memberId: activeMember.member.id,
        taskId: task.id,
        excerpt: `GitHub attention requested for ${task.title}`,
      });
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Admin was notified about your GitHub update.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Could not notify admin about GitHub.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendDriveAttention(task: StudioTask) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postRepoAttention({
        memberId: activeMember.member.id,
        taskId: task.id,
        source: "drive",
        excerpt: `Drive attention requested for ${task.title}`,
      });
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Admin was notified about your Drive update.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Could not notify admin about Drive.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProfileChangeRequest(item: MemberProfileRequestInput) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postProfileChangeRequest(item);
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Profile change request sent to admin for approval.");
      return true;
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "Could not send profile request.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewAnswer(
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note = "",
    awardedPoints?: number,
    overrideLocked = false,
  ) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "reviewAnswer", {
        taskId,
        memberId,
        status,
        note: note.trim(),
        awardedPoints,
        overrideLocked,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function removeQueuedSubmission(id: string) {
    removeLocalSubmission(id);
    void deleteQueuedItem(data.settings?.backendUrl, "submissions", id);
    setAdminQueue((current) => ({
      ...current,
      submissions: current.submissions.filter((item) => item.id !== id),
    }));
  }

  function removeQueuedProgress(id: string) {
    removeLocalProgressUpdate(id);
    void deleteQueuedItem(data.settings?.backendUrl, "progress-updates", id);
    setAdminQueue((current) => ({
      ...current,
      progressUpdates: current.progressUpdates.filter((item) => item.id !== id),
    }));
  }

  async function approveQueuedSubmission(item: QueuedSubmission) {
    return reviewAnswer(item.taskId, item.memberId, "approved");
  }

  async function rejectQueuedSubmission(item: QueuedSubmission) {
    return reviewAnswer(item.taskId, item.memberId, "rejected");
  }

  async function manualApprove(task: StudioTask, memberId: string, awardedPoints?: number) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "manualApprove", {
        taskId: task.id,
        memberId,
        awardedPoints,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function skipTaskMember(task: StudioTask, memberId: string, note = "") {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "skipTaskMember", {
        taskId: task.id,
        memberId,
        note: note.trim(),
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Member skipped for this task.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function unskipTaskMember(task: StudioTask, memberId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "unskipTaskMember", {
        taskId: task.id,
        memberId,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Member assignment restored.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addProgressUpdate(task: StudioTask, memberId: string, note: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    const cleanNote = note.trim();
    if (!memberId || !cleanNote) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addProgressUpdate", {
        taskId: task.id,
        memberId,
        note: cleanNote,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Progress saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function saveQueuedProgress(item: QueuedProgressUpdate) {
    const update: TaskProgressUpdate = {
      id: item.id,
      taskId: item.taskId,
      memberId: item.memberId,
      memberName: item.memberName,
      note: item.note,
      createdAt: item.createdAt,
    };

    updateData((current) => ({
      ...current,
      progressUpdates: {
        ...(current.progressUpdates ?? {}),
        [item.taskId]: [update, ...((current.progressUpdates ?? {})[item.taskId] ?? [])],
      },
    }));
    removeQueuedProgress(item.id);
    return true;
  }

  function updateMember(memberId: string, updates: Partial<Member>) {
    updateData((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    }));
  }

  function updateSettings(settings: Partial<StudioSettings>) {
    updateData((current) => ({
      ...current,
      settings: { ...(current.settings ?? DEFAULT_SETTINGS), ...settings },
    }));
  }

  function addRepoUpdate(memberId: string) {
    const update: RepoUpdate = {
      id: `repo-${Date.now()}`,
      memberId,
      createdAt: new Date().toISOString(),
      seen: false,
    };

    updateData((current) => ({
      ...current,
      repoUpdates: [update, ...(current.repoUpdates ?? [])],
    }));
    setRefreshStatus("اتسجل تنبيه الريبو. لازم الأدمن يحفظ GitHub عشان يظهر على جهاز تاني.");
  }

  async function markRepoUpdateSeen(updateId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Marking repo update done...");
    try {
      const nextData = await postAdminMutation(adminPassword, "markRepoUpdateSeen", { updateId });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Repo update marked done.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewProfileRequest(requestId: string, status: "approved" | "rejected") {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving profile request decision...");
    try {
      const nextData = await postAdminMutation(adminPassword, "reviewProfileRequest", {
        requestId,
        status,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus(status === "approved" ? "Profile request approved." : "Profile request rejected.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveToGithub(tokenOverride?: string) {
    const token = (tokenOverride ?? githubToken).trim();
    if (!token) {
      setTokenDraft("");
      setTokenDialogOpen(true);
      setSaveStatus("محتاج GitHub token أول مرة عشان أحفظ.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("جاري الحفظ على GitHub...");
    try {
      const nextData = sanitizeData({ ...data, meta: { updatedAt: new Date().toISOString() } });

      for (const path of GITHUB_DATA_PATHS) {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
        const currentResponse = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!currentResponse.ok) throw new Error(`مش قادر أقرأ ${path} من GitHub.`);
        const currentFile = (await currentResponse.json()) as { sha: string };
        const saveResponse = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update Hivo Studio data in ${path}`,
            content: encodeBase64(`${JSON.stringify(nextData, null, 2)}\n`),
            sha: currentFile.sha,
            branch: GITHUB_BRANCH,
          }),
        });
        if (!saveResponse.ok) throw new Error(`GitHub رفض حفظ ${path}. راجع صلاحيات التوكن.`);
      }

      setGithubToken(token);
      window.localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setTokenDraft("");
      setTokenDialogOpen(false);
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("تم الحفظ. التحديث هيظهر للفريق بعد refresh بسيط.");
    } catch (error) {
      setGithubToken("");
      window.localStorage.removeItem(GITHUB_TOKEN_KEY);
      setTokenDialogOpen(true);
      setSaveStatus(
        error instanceof Error
          ? `${error.message} اكتب التوكن مرة تانية.`
          : "حصل خطأ أثناء الحفظ. اكتب التوكن مرة تانية.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmTokenAndSave() {
    const nextToken = tokenDraft.trim();
    if (!nextToken) {
      setSaveStatus("اكتب GitHub token الأول.");
      return;
    }
    void saveToGithub(nextToken);
  }

  if (activeAdmin) {
    return (
      <AdminView
        data={data}
        stats={stats}
        saveStatus={saveStatus}
        isDirty={isDirty}
        isSaving={isSaving}
        adminQueue={adminQueue}
        queueStatus={queueStatus}
        tokenDialogOpen={tokenDialogOpen}
        tokenDraft={tokenDraft}
        onLogout={logout}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onAddTaskUpdate={addTaskUpdate}
        onAddMeeting={addMeeting}
        onUpdateMeeting={updateMeeting}
        onRecordMeetingAttendance={recordMeetingAttendance}
        onSetMeetingAttendanceScore={setMeetingAttendanceScore}
        onRecalculateMeetingAttendanceScores={recalculateMeetingAttendanceScores}
        onRemoveMeeting={removeMeeting}
        onRemoveTask={removeTask}
        onManualApprove={manualApprove}
        onSkipTaskMember={skipTaskMember}
        onUnskipTaskMember={unskipTaskMember}
        onApproveQueuedSubmission={approveQueuedSubmission}
        onRejectQueuedSubmission={rejectQueuedSubmission}
        onSaveQueuedProgress={saveQueuedProgress}
        onDismissQueuedProgress={removeQueuedProgress}
        onAddProgressUpdate={addProgressUpdate}
        onReviewAnswer={reviewAnswer}
        onAddBonusGrade={addBonusGrade}
        onUpdateMember={updateMember}
        onUpdateSettings={updateSettings}
        onMarkRepoUpdateSeen={markRepoUpdateSeen}
        onReviewProfileRequest={reviewProfileRequest}
        onRefreshAdminQueue={refreshAdminQueue}
        onTokenDraftChange={setTokenDraft}
        onCloseTokenDialog={() => setTokenDialogOpen(false)}
        onConfirmTokenAndSave={confirmTokenAndSave}
        onSaveToGithub={() => void saveCurrentData()}
      />
    );
  }

  if (activeStats) {
    return <DeanStatsView data={data} stats={stats} onLogout={logout} />;
  }

  if (activeMember) {
    return (
      <MemberView
        data={data}
        activeMember={activeMember}
        stats={stats}
        draftAnswers={draftAnswers}
        sentState={sentState}
        refreshStatus={refreshStatus}
        isSubmitting={isSubmitting}
        onDraftChange={(key, value) => {
          setDraftAnswers((current) => {
            const next = { ...current, [key]: value };
            writeMemberDrafts(next);
            return next;
          });
        }}
        onSubmitFinal={submitFinalSubmission}
        onSubmitProgress={submitProgressUpdate}
        onRepoAttention={sendRepoAttention}
        onDriveAttention={sendDriveAttention}
        onProfileChangeRequest={submitProfileChangeRequest}
        onMarkInteraction={markInteraction}
        onLogout={logout}
        onRefreshData={refreshData}
      />
    );
  }

  return (
    <LoginScreen
      data={data}
      onMemberLogin={loginMember}
      onAdminLogin={loginAdmin}
      onStatsLogin={loginStats}
    />
  );
}
