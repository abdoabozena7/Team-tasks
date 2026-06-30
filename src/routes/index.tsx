import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hivo Studio" },
      { name: "description", content: "Hivo Studio team tasks and idea review board." },
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
};

type StudioTask = {
  id: string;
  title: string;
  question: string;
  points: number;
  scope: "all" | "member";
  memberId?: string;
  createdAt: string;
};

type TaskResponse = {
  memberId: string;
  memberName: string;
  answer: string;
  status: "submitted" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
};

type TaskProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
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

type AdminQueue = {
  submissions: QueuedSubmission[];
  progressUpdates: QueuedProgressUpdate[];
};

type RepoUpdate = {
  id: string;
  memberId: string;
  createdAt: string;
  note?: string;
  seen?: boolean;
};

type StudioData = {
  projectName: string;
  announcement?: string;
  settings?: StudioSettings;
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  repoUpdates?: RepoUpdate[];
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
  baseCompleted: number;
  baseApproved: number;
  baseRejected: number;
  completed: number;
  taskPoints: number;
  basePoints: number;
  points: number;
  avgHours: number | null;
  responseRate: number;
  approvalRate: number;
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

const DEFAULT_ADMIN_PASSWORD = "5678";
const DEFAULT_STATS_PASSWORD = "6789";
const ACTIVE_MEMBER_KEY = "hivo-studio-active-member";
const ACTIVE_DISPLAY_NAME_KEY = "hivo-studio-active-display-name";
const ADMIN_SESSION_KEY = "hivo-studio-admin";
const STATS_SESSION_KEY = "hivo-studio-stats";
const GITHUB_TOKEN_KEY = "hivo-studio-github-token";
const REFRESHED_SESSION_KEY = "hivo-studio-refreshed-this-session";
const NICKNAME_HINT_KEY = "hivo-studio-nickname-hint";
const MEMBER_DRAFTS_KEY = "hivo-studio-member-drafts";
const MEMBER_SENT_STATE_KEY = "hivo-studio-member-sent-state";
const LOCAL_QUEUE_KEY = "hivo-studio-local-admin-queue";
const GITHUB_OWNER = "abdoabozena7";
const GITHUB_REPO = "Team-tasks";
const GITHUB_BRANCH = "main";
const GITHUB_DATA_PATHS = ["team-data.json", "public/team-data.json"];

const DEFAULT_SETTINGS: StudioSettings = {
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  statsPassword: DEFAULT_STATS_PASSWORD,
  backendUrl: "",
};

const DEFAULT_DATA: StudioData = {
  projectName: "Hivo Studio",
  announcement: "",
  settings: DEFAULT_SETTINGS,
  members: [],
  tasks: [],
  responses: {},
  progressUpdates: {},
  repoUpdates: [],
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

function sanitizeData(data: StudioData): StudioData {
  return {
    ...DEFAULT_DATA,
    ...data,
    announcement: data.announcement ?? "",
    settings: {
      adminPassword: data.settings?.adminPassword || DEFAULT_ADMIN_PASSWORD,
      statsPassword: data.settings?.statsPassword || DEFAULT_STATS_PASSWORD,
      backendUrl: data.settings?.backendUrl ?? "",
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
    })),
    tasks: data.tasks ?? [],
    responses: data.responses ?? {},
    progressUpdates: data.progressUpdates ?? {},
    repoUpdates: data.repoUpdates ?? [],
    meta: data.meta ?? DEFAULT_DATA.meta,
  };
}

function taskIsForMember(task: StudioTask, memberId: string) {
  return task.scope === "all" || task.memberId === memberId;
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

function createStats(data: StudioData) {
  const memberStats = data.members.map((member) => {
    const assignedTasks = data.tasks.filter((task) => taskIsForMember(task, member.id));
    const responses = assignedTasks
      .map((task) => ({ task, response: getResponse(data, task.id, member.id) }))
      .filter((item): item is { task: StudioTask; response: TaskResponse } =>
        Boolean(item.response),
      );
    const approvedTasks = responses.filter((item) => item.response.status === "approved");
    const taskPoints = approvedTasks.reduce((sum, item) => sum + (item.task.points || 1), 0);
    const speedSamples = responses
      .map((item) => hoursBetween(item.task.createdAt, item.response.submittedAt))
      .filter((value): value is number => value !== null);
    const avgHours =
      speedSamples.length > 0
        ? speedSamples.reduce((sum, value) => sum + value, 0) / speedSamples.length
        : null;
    const baseCompleted = sanitizeNumber(member.baseCompleted);
    const baseApproved = sanitizeNumber(member.baseApproved);
    const baseRejected = sanitizeNumber(member.baseRejected);
    const basePoints = sanitizeNumber(member.basePoints);
    const approved = approvedTasks.length + baseApproved;
    const rejected =
      responses.filter((item) => item.response.status === "rejected").length + baseRejected;
    const pending = responses.filter((item) => item.response.status === "submitted").length;
    const submitted = responses.length + baseCompleted;
    const reviewed = approved + rejected;
    const responseRate =
      assignedTasks.length > 0 ? (responses.length / assignedTasks.length) * 100 : 0;
    const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;

    return {
      member,
      assignedTasks: assignedTasks.length,
      submitted,
      approved,
      rejected,
      pending,
      reviewed,
      baseCompleted,
      baseApproved,
      baseRejected,
      completed: baseCompleted + approvedTasks.length,
      taskPoints,
      basePoints,
      points: basePoints + taskPoints,
      avgHours,
      responseRate,
      approvalRate,
    };
  });
  const visibleStats = memberStats.filter((item) => !item.member.hidden);
  const rankedMembers = [...visibleStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.completed - a.completed;
  });
  const taskMetrics = data.tasks.map((task) => {
    const visibleMemberIds = new Set(
      data.members
        .filter((member) => !member.hidden && taskIsForMember(task, member.id))
        .map((member) => member.id),
    );
    const expected =
      task.scope === "member"
        ? task.memberId
          ? visibleMemberIds.has(task.memberId)
            ? 1
            : 0
          : 0
        : data.members.filter((member) => !member.hidden).length;
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
      rejected: responses.filter((response) => response.status === "rejected").length,
      submitted: responses.filter((response) => response.status === "submitted").length,
      progressUpdates: progressUpdates.length,
    };
  });
  const leader = rankedMembers[0];
  const worst = rankedMembers[rankedMembers.length - 1];
  const approvedTotal = visibleStats.reduce((sum, item) => sum + item.completed, 0);
  const pointsTotal = visibleStats.reduce((sum, item) => sum + item.points, 0);
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
    leader,
    worst,
    approvedTotal,
    pointsTotal,
    pendingTotal,
  };
}

function rankingBadgeClass(item: MemberScore) {
  if (item.approved > 0) return "bg-emerald-200";
  if (item.basePoints > 0 || item.baseCompleted > 0) return "bg-yellow-200";
  return "bg-card";
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
  onAdminLogin: () => void;
  onStatsLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const settings = data.settings ?? DEFAULT_SETTINGS;

  function submitName() {
    const displayName = name.trim();
    if (!displayName) return;

    if (displayName === settings.adminPassword) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.localStorage.removeItem(STATS_SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onAdminLogin();
      return;
    }

    if (displayName === settings.statsPassword) {
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
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitName();
              }}
              placeholder="اكتب اسمك..."
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
      <span>مرفوض: {item.rejected}</span>
      <span>نقاط: {item.points}</span>
      <span>تاسكات محسوبة: {item.completed}</span>
      <span>نسبة التسليم: {formatPercent(item.responseRate)}</span>
      <span>نسبة القبول: {formatPercent(item.approvalRate)}</span>
      <span>متوسط السرعة: {formatHours(item.avgHours)}</span>
    </div>
  );
}

function Leaderboard({ scores }: { scores: MemberScore[] }) {
  const [openMemberId, setOpenMemberId] = useState("");
  const worstMemberId = scores[scores.length - 1]?.member.id;
  const rowPalettes = [
    "bg-[#fff4a8]",
    "bg-[#cffafe]",
    "bg-[#dcfce7]",
    "bg-[#fde2f3]",
    "bg-[#ede9fe]",
    "bg-[#ffedd5]",
    "bg-[#dbeafe]",
    "bg-[#fef3c7]",
    "bg-[#ccfbf1]",
  ];

  return (
    <div className="leaderboard-stage grid gap-3 md:grid-cols-2">
      {scores.map((item, index) => {
        const isLeader = index === 0;
        const isWorst = item.member.id === worstMemberId && scores.length > 1;
        const isOpen = openMemberId === item.member.id;
        const rowColor = rowPalettes[index % rowPalettes.length];

        if (isWorst) {
          return (
            <button
              key={item.member.id}
              type="button"
              onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
              className="border border-black bg-white p-2 text-left font-serif text-black shadow-none"
              dir="rtl"
            >
              <div>
                {index + 1}. {item.member.name} - {item.points} pts / {item.completed} tasks
              </div>
              {item.member.publicFlag && (
                <div className="text-red-700">[{item.member.publicFlag}]</div>
              )}
              {isOpen && <MemberDetails item={item} />}
            </button>
          );
        }

        return (
          <button
            key={item.member.id}
            type="button"
            onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
            className={`leaderboard-row group relative overflow-hidden text-right border-[2.5px] border-ink px-3 py-3 doodle-shadow-sm transition ${rowColor} ${
              isLeader ? "leaderboard-row-top md:col-span-2" : ""
            }`}
            style={{
              borderRadius: "14px 18px 12px 16px / 16px 12px 18px 14px",
              animationDelay: `${index * 80}ms`,
            }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={`leaderboard-badge grid size-10 shrink-0 place-items-center rounded-full border-[2.5px] border-ink font-bold ${rankingBadgeClass(
                  item,
                )}`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold leading-tight">
                  {item.member.name}
                  {isLeader && <span className="leaderboard-top-tag ms-2">TOP</span>}
                  {item.member.publicFlag && (
                    <span className="ms-2 text-xs font-bold text-red-600">
                      {item.member.publicFlag}
                    </span>
                  )}
                </span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-white/70">
                  <span
                    className="leaderboard-progress block h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${Math.max(8, Math.min(100, item.responseRate || item.approvalRate || 0))}%`,
                    }}
                  />
                </span>
              </span>
              <span className="leaderboard-points shrink-0 rounded-full border-[2px] border-ink bg-white/80 px-3 py-1 text-sm font-bold">
                {item.points} pts
                <span className="mx-1 text-foreground/45">/</span>
                {item.completed}
              </span>
            </div>
            {isOpen && (
              <div className="relative z-10">
                <MemberDetails item={item} />
              </div>
            )}
          </button>
        );
      })}
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
  onSubmitFinal: (task: StudioTask) => void;
  onSubmitProgress: (task: StudioTask) => void;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedOnce, setRefreshedOnce] = useState(
    window.sessionStorage.getItem(REFRESHED_SESSION_KEY) === "true",
  );
  const [showNicknameHint, setShowNicknameHint] = useState(
    window.localStorage.getItem(NICKNAME_HINT_KEY) !== "seen",
  );
  const memberTasks = data.tasks.filter((task) => taskIsForMember(task, activeMember.member.id));

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

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
        aria-label="settings"
      >
        <Settings className="size-5" />
      </button>

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

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <header className="relative mb-10 text-center">
          <Logo />
          <h1 className="mb-3 mt-4 text-5xl font-bold leading-tight md:text-6xl">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto max-w-xl text-xl leading-relaxed text-foreground/80">
            أهلا {activeMember.displayName}. هنا تاسكاتك أنت بس، واللي يتوافق عليه يتحسب لك بالنقط.
          </p>
        </header>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-4 doodle-shadow"
          style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold">
              <span className="highlight-blue">
                نقاط التيم: {stats.pointsTotal} | تاسكات محسوبة: {stats.approvedTotal}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={refreshMemberData}
                disabled={refreshing}
                className={`border-[2px] border-ink doodle-shadow-sm ${
                  refreshedOnce
                    ? ""
                    : "scale-105 bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.35)]"
                }`}
              >
                <RefreshCw data-icon="inline-start" />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="border-[2px] border-ink bg-paper doodle-shadow-sm"
              >
                <LogOut data-icon="inline-start" />
                تغيير الاسم
              </Button>
            </div>
          </div>
          {refreshStatus && <p className="mt-2 text-sm text-foreground/65">{refreshStatus}</p>}
        </section>

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
              const progressSent = sentState[taskProgressKey];
              const officialProgress = (data.progressUpdates?.[task.id] ?? []).filter(
                (update) => update.memberId === activeMember.member.id,
              );
              const canAnswer = !existing || existing.status === "rejected";

              return (
                <article
                  key={task.id}
                  className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{task.title}</h2>
                      <p className="mt-1 text-sm text-foreground/60">
                        {task.scope === "all" ? "تاسك عام لكل التيم" : "تاسك مخصص ليك"} •{" "}
                        {task.points || 1} points
                      </p>
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
                  </div>
                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>
                  <Textarea
                    value={draftAnswers[key] ?? existing?.answer ?? ""}
                    onChange={(event) => onDraftChange(key, event.target.value)}
                    disabled={!canAnswer}
                    placeholder="اكتب إجابتك هنا..."
                    className="min-h-32 border-[2px] border-ink bg-paper text-base"
                  />
                  <p className="mt-2 text-sm font-bold text-red-700">
                    ده تسليم رسمي. بعد ما تبعته هيظهر مستني مراجعة الأدمن، والدرجات تتحسب بعد القبول
                    فقط.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => onSubmitFinal(task)}
                      disabled={!canAnswer || isSubmitting}
                      className="border-[2px] border-ink doodle-shadow-sm"
                    >
                      <Save data-icon="inline-start" />
                      تسليم للمراجعة
                    </Button>
                  </div>

                  <div className="mt-5 border-t-[2px] border-ink/20 pt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-lg">تحديث متابعة بدون درجات</strong>
                      <span className="rounded-full border-[2px] border-ink bg-yellow-100 px-2 py-1 text-xs font-bold">
                        لا يتحسب نقاط
                      </span>
                    </div>
                    <p className="mb-3 text-sm leading-6 text-foreground/65">
                      اكتب وصلت لإيه أو محتاج إيه. ده متابعة بس، مش تسليم نهائي للتاسك.
                    </p>
                    {officialProgress.length > 0 && (
                      <div className="mb-3 grid gap-2">
                        {officialProgress.map((update) => (
                          <div key={update.id} className="border-[2px] border-ink bg-yellow-50 p-3">
                            <p className="whitespace-pre-wrap leading-7">{update.note}</p>
                            <p className="mt-1 text-xs text-foreground/55">
                              محفوظ رسميًا: {new Date(update.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {progressSent && (
                      <p className="mb-3 border-[2px] border-ink bg-yellow-100 p-2 text-sm font-bold">
                        تم إرسال متابعة للأدمن
                      </p>
                    )}
                    <Textarea
                      value={draftAnswers[taskProgressKey] ?? ""}
                      onChange={(event) => onDraftChange(taskProgressKey, event.target.value)}
                      placeholder="اكتب تحديث متابعة سريع..."
                      className="min-h-24 border-[2px] border-ink bg-yellow-50 text-base"
                    />
                    <p className="mt-2 text-sm font-bold text-yellow-800">
                      ده تحديث متابعة فقط، لا يتحسب نقاط ولا يقفل التاسك.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => onSubmitProgress(task)}
                        disabled={isSubmitting}
                        className="border-[2px] border-ink bg-yellow-100 doodle-shadow-sm"
                      >
                        <Save data-icon="inline-start" />
                        إرسال متابعة
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{
            borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px",
            transform: "rotate(-0.3deg)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Caveat, cursive" }}>
              <span className="highlight-yellow">Leaderboard</span>
            </h2>
            <div className="text-lg font-bold">
              <span className="highlight-blue">
                {stats.leader && stats.leader.points > 0
                  ? `${stats.leader.member.name} متصدر بـ ${stats.leader.points} points`
                  : "لسه مفيش إنجازات محسوبة"}
              </span>
            </div>
          </div>
          <Leaderboard scores={stats.memberStats} />
        </section>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4">
          <section
            className="w-full max-w-lg border-[2.5px] border-ink bg-card p-5 doodle-shadow"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <h2 className="mb-3 text-3xl font-bold">
              <span className="highlight-yellow">Settings</span>
            </h2>
            <p className="mb-3 text-sm text-foreground/65">الأسماء المتاحة للدخول:</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {[activeMember.member.name, ...activeMember.member.aliases].map((alias) => (
                <span key={alias} className="border-[2px] border-ink bg-paper px-2 py-1 text-sm">
                  {alias}
                </span>
              ))}
            </div>

            <div className="mt-3 border-[2px] border-ink bg-paper p-3 text-sm leading-6">
              <strong>التعديل الرسمي من الأدمن فقط.</strong>
              <p>
                لو عايز تضيف nickname أو تغير لينك الريبو، كلم الأدمن وهو يحفظه من لوحة الإدارة عشان
                يظهر لكل الأجهزة.
              </p>
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
              ) : (
                <p className="mt-2 font-bold text-red-700">لا يوجد ريبو محفوظ رسميًا.</p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="mt-4 w-full border-[2px] border-ink bg-paper doodle-shadow-sm"
            >
              رجوع
            </Button>
          </section>
        </div>
      )}
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
  onReviewAnswer: (taskId: string, memberId: string, status: "approved" | "rejected") => void;
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
  const safeAdminQueue = adminQueue ?? emptyQueue();
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
                        <p className="mt-2 whitespace-pre-wrap leading-7">{item.answer}</p>
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
                        <p className="mt-2 whitespace-pre-wrap leading-7">{item.note}</p>
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
                            <p className="whitespace-pre-wrap leading-7">{update.note}</p>
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
                          <p className="whitespace-pre-wrap leading-[1.8]">{response.answer}</p>
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
                        <span>مرفوض: {memberScore?.rejected ?? 0}</span>
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

                  <div className="mb-4">
                    <p className="mb-2 text-sm font-bold text-foreground/70">
                      أرقام قديمة تتحسب مع اللي اتقبل على الموقع
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="grid gap-1 text-sm font-bold">
                        تاسكات قديمة
                        <Input
                          type="number"
                          min={0}
                          value={member.baseCompleted ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseCompleted: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-card text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        مقبول قديم
                        <Input
                          type="number"
                          min={0}
                          value={member.baseApproved ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseApproved: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-emerald-50 text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        مرفوض قديم
                        <Input
                          type="number"
                          min={0}
                          value={member.baseRejected ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseRejected: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-red-50 text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        نقاط قديمة
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
                    </div>
                  </div>

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
            <Input
              value={data.settings?.backendUrl ?? ""}
              onChange={(event) => onUpdateSettings({ backendUrl: event.target.value })}
              placeholder="Backend URL for website submissions"
              className="border-[2px] border-ink bg-paper md:col-span-2 ltr:text-left"
              dir="ltr"
            />
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
        adminQueue={adminQueue}
        queueStatus={queueStatus}
        tokenDialogOpen={tokenDialogOpen}
        tokenDraft={tokenDraft}
        onTokenDraftChange={onTokenDraftChange}
        onCloseTokenDialog={onCloseTokenDialog}
        onConfirmTokenAndSave={onConfirmTokenAndSave}
        onSaveToGithub={onSaveToGithub}
      />
    </div>
  );
}

function SaveBar({
  saveStatus,
  isDirty,
  isSaving,
  tokenDialogOpen,
  tokenDraft,
  onTokenDraftChange,
  onCloseTokenDialog,
  onConfirmTokenAndSave,
  onSaveToGithub,
}: {
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  tokenDialogOpen: boolean;
  tokenDraft: string;
  onTokenDraftChange: (value: string) => void;
  onCloseTokenDialog: () => void;
  onConfirmTokenAndSave: () => void;
  onSaveToGithub: () => void;
}) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-ink bg-card/95 px-4 py-3 shadow-[0_-8px_0_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center text-sm font-bold text-foreground/75 sm:text-right">
            {saveStatus || (isDirty ? "في تغييرات غير محفوظة" : "كل التغييرات محفوظة")}
          </div>
          <Button
            type="button"
            onClick={onSaveToGithub}
            disabled={isSaving}
            className="h-12 min-w-40 border-[2px] border-ink text-lg doodle-shadow-sm"
          >
            <Save data-icon="inline-start" />
            {isSaving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {tokenDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4">
          <section
            className="w-full max-w-md border-[2.5px] border-ink bg-card p-5 text-center doodle-shadow"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <h2 className="mb-3 text-3xl font-bold">
              <span className="highlight-yellow">GitHub Token</span>
            </h2>
            <p className="mb-4 text-sm leading-6 text-foreground/70">
              اكتب التوكن مرة واحدة على الجهاز ده عشان زر حفظ يقدر يحدث ملفات الداتا على GitHub.
            </p>
            <Input
              type="password"
              value={tokenDraft}
              onChange={(event) => onTokenDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onConfirmTokenAndSave();
              }}
              placeholder="GitHub token"
              className="h-12 border-[2px] border-ink bg-paper text-center"
              autoFocus
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={onConfirmTokenAndSave}
                disabled={isSaving}
                className="border-[2px] border-ink doodle-shadow-sm"
              >
                <Save data-icon="inline-start" />
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCloseTokenDialog}
                disabled={isSaving}
                className="border-[2px] border-ink bg-paper doodle-shadow-sm"
              >
                رجوع
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
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
  const mostRejected = [...visibleStats].sort((a, b) => b.rejected - a.rejected)[0];
  const mostPending = [...visibleStats].sort((a, b) => b.pending - a.pending)[0];
  const lowestResponseRate = [...visibleStats]
    .filter((item) => item.assignedTasks > 0)
    .sort((a, b) => a.responseRate - b.responseRate)[0];
  const totalSubmitted = visibleStats.reduce((sum, item) => sum + item.submitted, 0);
  const totalRejected = visibleStats.reduce((sum, item) => sum + item.rejected, 0);

  const insightCards = [
    {
      label: "أفضل أداء",
      value: best?.member.name ?? "N/A",
      detail: best ? `${best.points} pts / ${best.completed} tasks` : "لسه مفيش بيانات",
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
      label: "أكثر رفض",
      value: mostRejected?.member.name ?? "N/A",
      detail: mostRejected ? `${mostRejected.rejected} rejected` : "مفيش رفض",
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
      detail: worst ? `${worst.points} pts / ${worst.completed} tasks` : "لسه مفيش بيانات",
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
            شاشة قراءة فقط: مين شغال، مين سريع، ومين محتاج متابعة.
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
            ["Rejected", totalRejected],
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
  const response = await fetch(`${import.meta.env.BASE_URL}team-data.json?ts=${Date.now()}`, {
    cache: "no-store",
  });
  return sanitizeData((await response.json()) as StudioData);
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
    try {
      const nextQueue = await fetchAdminQueue(data.settings?.backendUrl);
      setAdminQueue((current) =>
        data.settings?.backendUrl ? nextQueue : mergeQueue(current, nextQueue),
      );
      setQueueStatus(
        data.settings?.backendUrl
          ? "تم تحديث queue من backend."
          : "تم قراءة queue المحلي. أضف Backend URL عشان يستقبل من أجهزة الفريق.",
      );
    } catch (error) {
      setQueueStatus(
        error instanceof Error ? error.message : "مش قادر أقرأ queue التسليمات حاليًا.",
      );
    }
  }, [data.settings?.backendUrl]);

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

  async function refreshData() {
    const freshData = await fetchStudioData();
    setData(freshData);
    setRefreshStatus("تم تحديث الداتا، وأي تغييرات محلية على جهازك فضلت محفوظة.");
  }

  function loginMember(member: Member, displayName: string) {
    setActiveAdmin(false);
    setActiveStats(false);
    setActiveMember({ member, displayName });
  }

  function loginAdmin() {
    setActiveMember(null);
    setActiveStats(false);
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
    window.localStorage.removeItem(STATS_SESSION_KEY);
    setActiveMember(null);
    setActiveAdmin(false);
    setActiveStats(false);
  }

  function addTask(task: Omit<StudioTask, "id" | "createdAt">) {
    updateData((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          ...task,
          id: `task-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function removeTask(taskId: string) {
    updateData((current) => {
      const nextResponses = { ...current.responses };
      const nextProgressUpdates = { ...(current.progressUpdates ?? {}) };
      delete nextResponses[taskId];
      delete nextProgressUpdates[taskId];

      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
        responses: nextResponses,
        progressUpdates: nextProgressUpdates,
      };
    });
  }

  async function submitFinalSubmission(task: StudioTask) {
    if (!activeMember) return;
    const key = responseKey(task.id, activeMember.member.id);
    const answer = draftAnswers[key]?.trim();
    if (!answer) return;

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
      const mode = await submitQueuedItem(data.settings?.backendUrl, "submissions", item);
      if (mode === "local") {
        setAdminQueue((current) => ({ ...current, submissions: [item, ...current.submissions] }));
      }
      updateData((current) => ({
        ...current,
        responses: {
          ...current.responses,
          [task.id]: {
            ...(current.responses[task.id] ?? {}),
            [activeMember.member.id]: {
              memberId: activeMember.member.id,
              memberName: activeMember.displayName,
              answer,
              status: "submitted",
              submittedAt: item.submittedAt,
            },
          },
        },
      }));
      writeMemberDrafts({ ...readMemberDrafts(), [key]: answer });
      setSentState((current) => {
        const next = { ...current, [key]: "pending" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus(
        mode === "backend"
          ? "تم إرسال التسليم للمراجعة. مستني قرار الأدمن."
          : "تم تسجيل التسليم في queue محلي على الجهاز ده. أضف Backend URL عشان يوصّل من أجهزة الفريق.",
      );
      if (activeAdmin) void refreshAdminQueue();
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "حصل خطأ أثناء إرسال التسليم للمراجعة.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProgressUpdate(task: StudioTask) {
    if (!activeMember) return;
    const key = progressKey(task.id, activeMember.member.id);
    const note = draftAnswers[key]?.trim();
    if (!note) return;

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
      const mode = await submitQueuedItem(data.settings?.backendUrl, "progress-updates", item);
      if (mode === "local") {
        setAdminQueue((current) => ({
          ...current,
          progressUpdates: [item, ...current.progressUpdates],
        }));
      }
      updateData((current) => ({
        ...current,
        progressUpdates: {
          ...(current.progressUpdates ?? {}),
          [task.id]: [
            {
              id: item.id,
              taskId: item.taskId,
              memberId: item.memberId,
              memberName: item.memberName,
              note: item.note,
              createdAt: item.createdAt,
            },
            ...((current.progressUpdates ?? {})[task.id] ?? []),
          ],
        },
      }));
      writeMemberDrafts({ ...readMemberDrafts(), [key]: note });
      setSentState((current) => {
        const next = { ...current, [key]: "sent" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus(
        mode === "backend"
          ? "تم إرسال المتابعة للأدمن. لا تتحسب نقاط."
          : "تم تسجيل المتابعة في queue محلي على الجهاز ده. أضف Backend URL عشان توصل من أجهزة الفريق.",
      );
      if (activeAdmin) void refreshAdminQueue();
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "حصل خطأ أثناء إرسال المتابعة.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reviewAnswer(taskId: string, memberId: string, status: "approved" | "rejected") {
    updateData((current) => {
      const response = current.responses[taskId]?.[memberId];
      if (!response) return current;

      return {
        ...current,
        responses: {
          ...current.responses,
          [taskId]: {
            ...current.responses[taskId],
            [memberId]: {
              ...response,
              status,
              reviewedAt: new Date().toISOString(),
            },
          },
        },
      };
    });
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

  function approveQueuedSubmission(item: QueuedSubmission) {
    updateData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [item.taskId]: {
          ...(current.responses[item.taskId] ?? {}),
          [item.memberId]: {
            memberId: item.memberId,
            memberName: item.memberName,
            answer: item.answer,
            status: "approved",
            submittedAt: item.submittedAt,
            reviewedAt: new Date().toISOString(),
          },
        },
      },
    }));
    removeQueuedSubmission(item.id);
  }

  function rejectQueuedSubmission(item: QueuedSubmission) {
    updateData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [item.taskId]: {
          ...(current.responses[item.taskId] ?? {}),
          [item.memberId]: {
            memberId: item.memberId,
            memberName: item.memberName,
            answer: item.answer,
            status: "rejected",
            submittedAt: item.submittedAt,
            reviewedAt: new Date().toISOString(),
          },
        },
      },
    }));
    removeQueuedSubmission(item.id);
  }

  function manualApprove(task: StudioTask, memberId: string) {
    const member = data.members.find((item) => item.id === memberId);
    if (!member) return;

    updateData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [task.id]: {
          ...(current.responses[task.id] ?? {}),
          [member.id]: {
            memberId: member.id,
            memberName: member.name,
            answer: "تم التسليم خارج الموقع وتم اعتماده يدويًا.",
            status: "approved",
            submittedAt: new Date().toISOString(),
            reviewedAt: new Date().toISOString(),
          },
        },
      },
    }));
  }

  function addProgressUpdate(task: StudioTask, memberId: string, note: string) {
    const member = data.members.find((item) => item.id === memberId);
    const cleanNote = note.trim();
    if (!member || !cleanNote) return;

    const update: TaskProgressUpdate = {
      id: `progress-${Date.now()}`,
      taskId: task.id,
      memberId: member.id,
      memberName: member.name,
      note: cleanNote,
      createdAt: new Date().toISOString(),
    };

    updateData((current) => ({
      ...current,
      progressUpdates: {
        ...(current.progressUpdates ?? {}),
        [task.id]: [update, ...((current.progressUpdates ?? {})[task.id] ?? [])],
      },
    }));
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

  function markRepoUpdateSeen(updateId: string) {
    updateData((current) => ({
      ...current,
      repoUpdates: (current.repoUpdates ?? []).map((update) =>
        update.id === updateId ? { ...update, seen: true } : update,
      ),
    }));
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
        tokenDialogOpen={tokenDialogOpen}
        tokenDraft={tokenDraft}
        onLogout={logout}
        onAddTask={addTask}
        onRemoveTask={removeTask}
        onManualApprove={manualApprove}
        onApproveQueuedSubmission={approveQueuedSubmission}
        onRejectQueuedSubmission={rejectQueuedSubmission}
        onSaveQueuedProgress={saveQueuedProgress}
        onDismissQueuedProgress={removeQueuedProgress}
        onAddProgressUpdate={addProgressUpdate}
        onReviewAnswer={reviewAnswer}
        onUpdateMember={updateMember}
        onUpdateSettings={updateSettings}
        onMarkRepoUpdateSeen={markRepoUpdateSeen}
        onRefreshAdminQueue={refreshAdminQueue}
        onTokenDraftChange={setTokenDraft}
        onCloseTokenDialog={() => setTokenDialogOpen(false)}
        onConfirmTokenAndSave={confirmTokenAndSave}
        onSaveToGithub={() => void saveToGithub()}
      />
    );
  }

  if (activeStats) {
    return <StatsView data={data} stats={stats} onLogout={logout} />;
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
