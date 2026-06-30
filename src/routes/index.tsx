import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Plus,
  RotateCcw,
  Save,
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
  basePoints?: number;
  adminNote?: string;
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

type StudioData = {
  projectName: string;
  announcement?: string;
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  meta: { updatedAt: string };
};

type ActiveMember = {
  member: Member;
  displayName: string;
};

type MemberScore = {
  member: Member;
  approved: number;
  baseCompleted: number;
  completed: number;
  taskPoints: number;
  basePoints: number;
  points: number;
};

const ADMIN_PASSWORD = "5678";
const ACTIVE_MEMBER_KEY = "hivo-studio-active-member";
const ACTIVE_DISPLAY_NAME_KEY = "hivo-studio-active-display-name";
const ADMIN_SESSION_KEY = "hivo-studio-admin";
const GITHUB_TOKEN_KEY = "hivo-studio-github-token";
const GITHUB_OWNER = "abdoabozena7";
const GITHUB_REPO = "Team-tasks";
const GITHUB_BRANCH = "main";
const GITHUB_DATA_PATHS = ["team-data.json", "public/team-data.json"];
const DEFAULT_DATA: StudioData = {
  projectName: "Hivo Studio",
  announcement: "",
  members: [],
  tasks: [],
  responses: {},
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
    members: (data.members ?? []).map((member) => ({
      ...member,
      aliases: member.aliases ?? [],
      hidden: Boolean(member.hidden),
      baseCompleted: sanitizeNumber(member.baseCompleted),
      basePoints: sanitizeNumber(member.basePoints),
      adminNote: member.adminNote ?? "",
    })),
    tasks: data.tasks ?? [],
    responses: data.responses ?? {},
    meta: data.meta ?? DEFAULT_DATA.meta,
  };
}

function taskIsForMember(task: StudioTask, memberId: string) {
  return task.scope === "all" || task.memberId === memberId;
}

function responseKey(taskId: string, memberId: string) {
  return `${taskId}:${memberId}`;
}

function getResponse(data: StudioData, taskId: string, memberId: string) {
  return data.responses[taskId]?.[memberId];
}

function createStats(data: StudioData) {
  const memberStats = data.members.map((member) => {
    const approvedTasks = data.tasks.filter(
      (task) => getResponse(data, task.id, member.id)?.status === "approved",
    );
    const taskPoints = approvedTasks.reduce((sum, task) => sum + (task.points || 1), 0);
    const baseCompleted = sanitizeNumber(member.baseCompleted);
    const basePoints = sanitizeNumber(member.basePoints);

    return {
      member,
      approved: approvedTasks.length,
      baseCompleted,
      completed: baseCompleted + approvedTasks.length,
      taskPoints,
      basePoints,
      points: basePoints + taskPoints,
    };
  });
  const visibleStats = memberStats.filter((item) => !item.member.hidden);
  const rankedMembers = [...visibleStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.completed - a.completed;
  });
  const leader = rankedMembers[0];
  const approvedTotal = visibleStats.reduce((sum, item) => sum + item.completed, 0);
  const pointsTotal = visibleStats.reduce((sum, item) => sum + item.points, 0);

  return {
    allMemberStats: memberStats,
    memberStats: rankedMembers,
    leader,
    approvedTotal,
    pointsTotal,
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

function LoginScreen({
  members,
  onMemberLogin,
  onAdminLogin,
}: {
  members: Member[];
  onMemberLogin: (member: Member, displayName: string) => void;
  onAdminLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submitName() {
    const displayName = name.trim();
    if (!displayName) return;

    if (displayName === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onAdminLogin();
      return;
    }

    const member = findMemberByName(displayName, members);
    if (!member) {
      setError("الاسم مش واضح عندي. اكتبه عربي أو إنجليزي زي اسمك في التيم.");
      return;
    }

    window.localStorage.setItem(ACTIVE_MEMBER_KEY, member.id);
    window.localStorage.setItem(ACTIVE_DISPLAY_NAME_KEY, displayName);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
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

function Leaderboard({ scores }: { scores: MemberScore[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {scores.map((item, index) => (
        <div
          key={item.member.id}
          className="flex items-center gap-3 border-[2px] border-ink bg-paper px-3 py-2 doodle-shadow-sm"
          style={{ borderRadius: "12px 16px 10px 14px / 14px 10px 16px 12px" }}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full border-[2px] border-ink font-bold ${rankingBadgeClass(
              item,
            )}`}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-bold">{item.member.name}</span>
          <span className="text-sm text-foreground/70">
            {item.points} pts / {item.completed} tasks
          </span>
        </div>
      ))}
    </div>
  );
}

function MemberView({
  data,
  activeMember,
  stats,
  draftAnswers,
  onDraftChange,
  onSubmitAnswer,
  onLogout,
}: {
  data: StudioData;
  activeMember: ActiveMember;
  stats: ReturnType<typeof createStats>;
  draftAnswers: Record<string, string>;
  onDraftChange: (key: string, value: string) => void;
  onSubmitAnswer: (task: StudioTask) => void;
  onLogout: () => void;
}) {
  const memberTasks = data.tasks.filter((task) => taskIsForMember(task, activeMember.member.id));

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
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
        </section>

        {data.announcement?.trim() && (
          <section
            className="mb-7 border-[2.5px] border-ink bg-card p-5 text-lg leading-[1.8] doodle-shadow"
            style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
          >
            <strong className="highlight-yellow">آخر تحديث: </strong>
            {data.announcement}
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
                  </div>
                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>
                  <Textarea
                    value={draftAnswers[key] ?? existing?.answer ?? ""}
                    onChange={(event) => onDraftChange(key, event.target.value)}
                    disabled={!canAnswer}
                    placeholder="اكتب إجابتك هنا..."
                    className="min-h-32 border-[2px] border-ink bg-paper text-base"
                  />
                  <Button
                    type="button"
                    onClick={() => onSubmitAnswer(task)}
                    disabled={!canAnswer}
                    className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                  >
                    <Check data-icon="inline-start" />
                    إرسال الإجابة
                  </Button>
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
    </div>
  );
}

function AdminView({
  data,
  stats,
  githubToken,
  saveStatus,
  onLogout,
  onAddTask,
  onRemoveTask,
  onManualApprove,
  onReviewAnswer,
  onUpdateMember,
  onUpdateAnnouncement,
  onGithubTokenChange,
  onSaveToGithub,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  githubToken: string;
  saveStatus: string;
  onLogout: () => void;
  onAddTask: (task: Omit<StudioTask, "id" | "createdAt">) => void;
  onRemoveTask: (taskId: string) => void;
  onManualApprove: (task: StudioTask, memberId: string) => void;
  onReviewAnswer: (taskId: string, memberId: string, status: "approved" | "rejected") => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onUpdateAnnouncement: (value: string) => void;
  onGithubTokenChange: (value: string) => void;
  onSaveToGithub: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});

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
      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <header className="mb-8 text-center">
          <Logo />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio Admin</span>
          </h1>
          <p className="text-lg text-foreground/75">
            إدارة التاسكات، متابعة الفريق، وحفظ التحديثات في GitHub.
          </p>
        </header>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-4 doodle-shadow"
          style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold">
              <span className="highlight-blue">
                النقاط: {stats.pointsTotal} | التاسكات المحسوبة: {stats.approvedTotal} | التاسكات:{" "}
                {data.tasks.length}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              className="border-[2px] border-ink bg-paper doodle-shadow-sm"
            >
              <LogOut data-icon="inline-start" />
              خروج الأدمن
            </Button>
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
            <KeyRound data-icon="inline-start" />
            حفظ GitHub
          </h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="password"
              value={githubToken}
              onChange={(event) => onGithubTokenChange(event.target.value)}
              placeholder="GitHub token للحفظ في team-data.json"
              className="border-[2px] border-ink bg-paper"
            />
            <Button
              type="button"
              onClick={onSaveToGithub}
              className="border-[2px] border-ink doodle-shadow-sm"
            >
              <Save data-icon="inline-start" />
              حفظ على GitHub
            </Button>
          </div>
          {saveStatus && <p className="mt-3 text-sm font-bold text-foreground/75">{saveStatus}</p>}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
            <Edit3 data-icon="inline-start" />
            إضافة تاسك
          </h2>
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
                      اعتماد واتساب
                    </Button>
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
          <h2 className="mb-4 text-2xl font-bold">
            <span className="highlight-yellow">تحديث عام</span>
          </h2>
          <Textarea
            value={data.announcement ?? ""}
            onChange={(event) => onUpdateAnnouncement(event.target.value)}
            placeholder="اكتب newsletter أو آخر تحديث يظهر لكل التيم..."
            className="min-h-24 border-[2px] border-ink bg-paper"
          />
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <h2 className="mb-4 text-2xl font-bold">
            <span className="highlight-yellow">تحديث الفريق</span>
          </h2>
          <div className="flex flex-col gap-3">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="grid gap-3 border-[2px] border-ink bg-paper p-3 md:grid-cols-[1fr_110px_110px_1.3fr_auto]"
              >
                <div>
                  <strong className={member.hidden ? "text-foreground/45" : ""}>
                    {member.name}
                  </strong>
                  <p className="text-xs text-foreground/60">
                    {member.hidden ? "مخفي من الليدر بورد" : "ظاهر في المنافسة"}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={member.baseCompleted ?? 0}
                  onChange={(event) =>
                    onUpdateMember(member.id, { baseCompleted: sanitizeNumber(event.target.value) })
                  }
                  placeholder="تاسكات قديمة"
                  className="border-[2px] border-ink bg-card"
                />
                <Input
                  type="number"
                  min={0}
                  value={member.basePoints ?? 0}
                  onChange={(event) =>
                    onUpdateMember(member.id, { basePoints: sanitizeNumber(event.target.value) })
                  }
                  placeholder="نقط قديمة"
                  className="border-[2px] border-ink bg-card"
                />
                <Input
                  value={member.adminNote ?? ""}
                  onChange={(event) => onUpdateMember(member.id, { adminNote: event.target.value })}
                  placeholder="رسالة الأدمن للعضو"
                  className="border-[2px] border-ink bg-card"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onUpdateMember(member.id, { hidden: !member.hidden })}
                  className="border-[2px] border-ink bg-card doodle-shadow-sm"
                >
                  {member.hidden ? (
                    <Eye data-icon="inline-start" />
                  ) : (
                    <EyeOff data-icon="inline-start" />
                  )}
                  {member.hidden ? "إظهار" : "إخفاء"}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <h2 className="mb-4 text-2xl font-bold">
            <span className="highlight-yellow">Leaderboard</span>
          </h2>
          <Leaderboard scores={stats.memberStats} />
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

function Index() {
  const [data, setData] = useState<StudioData>(DEFAULT_DATA);
  const [activeMember, setActiveMember] = useState<ActiveMember | null>(null);
  const [activeAdmin, setActiveAdmin] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [githubToken, setGithubToken] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const response = await fetch(`${import.meta.env.BASE_URL}team-data.json?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const initialData = sanitizeData((await response.json()) as StudioData);

      if (!mounted) return;
      setData(initialData);
      setGithubToken(window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? "");

      const hasAdminSession = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
      if (hasAdminSession) {
        setActiveAdmin(true);
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

  function updateData(updater: (current: StudioData) => StudioData) {
    setData((current) =>
      sanitizeData({ ...updater(current), meta: { updatedAt: new Date().toISOString() } }),
    );
    setSaveStatus("");
  }

  function loginMember(member: Member, displayName: string) {
    setActiveAdmin(false);
    setActiveMember({ member, displayName });
  }

  function loginAdmin() {
    setActiveMember(null);
    setActiveAdmin(true);
  }

  function logout() {
    window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
    window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setActiveMember(null);
    setActiveAdmin(false);
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
      delete nextResponses[taskId];

      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
        responses: nextResponses,
      };
    });
  }

  function submitAnswer(task: StudioTask) {
    if (!activeMember) return;
    const key = responseKey(task.id, activeMember.member.id);
    const answer = draftAnswers[key]?.trim();
    if (!answer) return;

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
            submittedAt: new Date().toISOString(),
          },
        },
      },
    }));
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

  function updateMember(memberId: string, updates: Partial<Member>) {
    updateData((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    }));
  }

  function updateAnnouncement(value: string) {
    updateData((current) => ({ ...current, announcement: value }));
  }

  function updateGithubToken(value: string) {
    setGithubToken(value);
    if (value.trim()) {
      window.localStorage.setItem(GITHUB_TOKEN_KEY, value.trim());
    } else {
      window.localStorage.removeItem(GITHUB_TOKEN_KEY);
    }
  }

  async function saveToGithub() {
    const token = githubToken.trim();
    if (!token) {
      setSaveStatus("حط GitHub token الأول عشان أقدر أحفظ team-data.json.");
      return;
    }

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

      setData(nextData);
      setSaveStatus("تم الحفظ على GitHub. التحديث هيظهر للفريق بعد refresh بسيط.");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "حصل خطأ أثناء الحفظ.");
    }
  }

  if (activeAdmin) {
    return (
      <AdminView
        data={data}
        stats={stats}
        githubToken={githubToken}
        saveStatus={saveStatus}
        onLogout={logout}
        onAddTask={addTask}
        onRemoveTask={removeTask}
        onManualApprove={manualApprove}
        onReviewAnswer={reviewAnswer}
        onUpdateMember={updateMember}
        onUpdateAnnouncement={updateAnnouncement}
        onGithubTokenChange={updateGithubToken}
        onSaveToGithub={saveToGithub}
      />
    );
  }

  if (activeMember) {
    return (
      <MemberView
        data={data}
        activeMember={activeMember}
        stats={stats}
        draftAnswers={draftAnswers}
        onDraftChange={(key, value) => setDraftAnswers((current) => ({ ...current, [key]: value }))}
        onSubmitAnswer={submitAnswer}
        onLogout={logout}
      />
    );
  }

  return (
    <LoginScreen members={data.members} onMemberLogin={loginMember} onAdminLogin={loginAdmin} />
  );
}
