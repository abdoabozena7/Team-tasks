import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Activity, Database, Radio, Sparkles, Brain, ShieldAlert, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Real-Time Comment Intelligence — Team Breakdown" },
      { name: "description", content: "Seven-person team breakdown for the real-time comment streaming, sentiment, and fake-detection project." },
    ],
  }),
});

type Member = {
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sections: { title: string; items: (string | { sub: string; items: string[] })[] }[];
  note?: { title: string; body: string };
};

const members: Member[] = [
  {
    name: "Abozena",
    role: "Project Lead + Integration",
    icon: Activity,
    accent: "from-[oklch(0.72_0.18_25)] to-[oklch(0.65_0.22_15)]",
    sections: [
      {
        title: "دوره",
        items: ["الشخص اللي ماسك الصورة الكاملة وبيجمع كل الأجزاء مع بعض"],
      },
      {
        title: "مسؤولياته",
        items: [
          "تحديد الشكل النهائي للـ architecture",
          "تحديد الـ Kafka topics",
          "تنظيم الـ workflow بين التيم",
          "متابعة الـ integration بين modules",
          "توثيق الـ pipeline كاملة",
          "تجهيز سيناريو الديمو النهائي",
        ],
      },
      {
        title: "التاسكات",
        items: [
          "رسم Architecture Diagram",
          {
            sub: "تحديد flow زي:",
            items: [
              "API/Data Source → Producer",
              "Kafka → Consumer",
              "Cleaning",
              "Sentiment",
              "Fake/Spam Detection",
              "Alerts",
              "Dashboard",
            ],
          },
          {
            sub: "تحديد أسماء الـ topics:",
            items: ["raw-comments", "cleaned-comments", "sentiment-results", "suspicious-comments", "alerts"],
          },
          "تحديد format موحد للـ message JSON",
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "Architecture diagram",
          "Data flow diagram",
          "JSON schema موحد",
          "Final integration plan",
          "عرض المشروع النهائي مع باقي التيم",
        ],
      },
    ],
  },
  {
    name: "Mariam Helal",
    role: "Data Collection / API Engineer",
    icon: Database,
    accent: "from-[oklch(0.75_0.17_60)] to-[oklch(0.68_0.2_45)]",
    sections: [
      {
        title: "دوره",
        items: ["مسؤول عن سحب التعليقات من الـ API الجاهز أو عمل simulated stream"],
      },
      {
        title: "مسؤولياته",
        items: [
          "اختيار الـ source",
          "ربط المشروع بالـ API",
          "تجهيز comment producer يدخل البيانات على Kafka",
          "التعامل مع rate limits و format البيانات",
        ],
      },
      {
        title: "التاسكات",
        items: [
          {
            sub: "يحدد API مناسب:",
            items: ["YouTube API", "Reddit API", "أو dataset + simulation لو API صعب"],
          },
          {
            sub: "يسحب الحقول المهمة:",
            items: ["comment text", "author/user id", "timestamp", "source/post id"],
          },
          {
            sub: "يعمل Producer يبعت التعليقات على topic:",
            items: ["raw-comments"],
          },
          "لو الـ API مش real-time قوي، يعمل script يحاكي stream بشكل تدريجي",
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "Script/API module لجلب البيانات",
          "Kafka producer شغال",
          "sample streamed comments",
          "شرح ليه اختار المصدر ده",
        ],
      },
    ],
    note: {
      title: "ملاحظة مهمة",
      body: "هنا تبرير قوي جدًا للدكتور: إحنا مش بنعمل scraping عشوائي، إحنا بنستخدم API رسمي/جاهز علشان نجيب data موثوقة، ونركز مجهودنا على الـ real-time processing والتحليل الذكي، وده جوهر المشروع.",
    },
  },
  {
    name: "Renad",
    role: "Kafka & Streaming Engineer",
    icon: Radio,
    accent: "from-[oklch(0.74_0.16_140)] to-[oklch(0.65_0.19_155)]",
    sections: [
      {
        title: "دوره",
        items: ["مسؤول عن الجزء اللي يثبت إن المشروع فعلًا real-time ومستخدم Kafka صح"],
      },
      {
        title: "مسؤولياته",
        items: [
          "إعداد Kafka",
          "إنشاء الـ topics",
          "بناء producers/consumers",
          "التأكد إن كل stage مفصولة عن التانية",
        ],
      },
      {
        title: "التاسكات",
        items: [
          "Setup Kafka locally أو Docker",
          "إنشاء topics",
          "عمل consumers لكل مرحلة",
          "ربط الموديولات ببعض",
          "اختبار throughput بشكل بسيط",
          "التأكد إن الـ pipeline شغالة end-to-end",
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "Kafka setup guide",
          "topics configured",
          "producer/consumer scripts",
          "demo يوضح data بتتنقل live",
        ],
      },
    ],
    note: {
      title: "أهم نقطة في العرض",
      body: "الشخص ده لازم يوضح إن Kafka هنا مش مجرد إضافة: بيفصل المراحل عن بعض، بيسمح real-time streaming، scalable، يسهّل alerts والدashboard live. وده مهم جدًا عشان الدكتور ميقولش \"ليه Kafka؟\"",
    },
  },
  {
    name: "Kero",
    role: "Data Cleaning & Preprocessing",
    icon: Sparkles,
    accent: "from-[oklch(0.75_0.16_200)] to-[oklch(0.66_0.18_215)]",
    sections: [
      {
        title: "دوره",
        items: ["تنظيف التعليقات وتجهيزها قبل أي تحليل"],
      },
      {
        title: "مسؤولياته",
        items: [
          "تنظيف النصوص",
          "توحيد الـ format",
          "إزالة noise",
          "تجهيز comments صالحة للتحليل",
        ],
      },
      {
        title: "التاسكات",
        items: [
          {
            sub: "إزالة:",
            items: ["URLs", "mentions", "extra spaces", "special characters غير المهمة"],
          },
          "lowercase / normalization",
          {
            sub: "optional:",
            items: ["emoji handling", "Arabic/English mixed text normalization لو موجود"],
          },
          {
            sub: "إرسال الناتج إلى:",
            items: ["cleaned-comments"],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "preprocessing module",
          "before/after examples",
          "rules واضحة للتنظيف",
          "consumer من raw-comments و producer لـ cleaned-comments",
        ],
      },
    ],
    note: {
      title: "لازم يخلي باله من حاجة",
      body: "ماينفعش التنظيف يبقى aggressive زيادة، عشان ميبوظش معنى التعليق قبل الـ sentiment analysis.",
    },
  },
  {
    name: "Mohamed",
    role: "Sentiment Analysis Engineer",
    icon: Brain,
    accent: "from-[oklch(0.72_0.18_290)] to-[oklch(0.64_0.21_305)]",
    sections: [
      {
        title: "دوره",
        items: ["مسؤول عن تحليل المشاعر للتعليقات"],
      },
      {
        title: "مسؤولياته",
        items: [
          "تشغيل sentiment model أو API جاهز",
          "استخراج label لكل comment",
          "حساب raw sentiment و trusted sentiment بعد الفلترة",
        ],
      },
      {
        title: "التاسكات",
        items: [
          {
            sub: "اختيار الطريقة:",
            items: ["API جاهز", "model جاهز من Hugging Face", "TextBlob/VADER لو English"],
          },
          {
            sub: "تصنيف كل تعليق:",
            items: ["Positive", "Negative", "Neutral"],
          },
          {
            sub: "حفظ النتائج في topic:",
            items: ["sentiment-results"],
          },
          {
            sub: "حساب إحصائيات:",
            items: ["نسبة الإيجابي/السلبي/المحايد", "raw sentiment", "filtered sentiment"],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "sentiment analysis module",
          "مقارنة بين input و output",
          "sentiment aggregation logic",
          "charts/data ready للـ dashboard",
        ],
      },
    ],
    note: {
      title: "نقطة مهمة",
      body: "بما إنك قلتوا مش محتاجين تعملوا embeddings بنفسكم، فالشخص ده يشتغل على model/API جاهز بدل ما يضيّع وقت في training.",
    },
  },
  {
    name: "Basmala",
    role: "Suspicious / Fake Comment Detection Engineer",
    icon: ShieldAlert,
    accent: "from-[oklch(0.7_0.2_350)] to-[oklch(0.6_0.23_5)]",
    sections: [
      {
        title: "دوره",
        items: ["أهم جزء مميز في المشروع: اكتشاف التعليقات المشبوهة"],
      },
      {
        title: "مسؤولياته",
        items: [
          "تصميم suspicious score",
          "كشف التكرار والتشابه والانفجارات الزمنية",
          "تحديد التعليقات اللي غالبًا spam/fake/coordinated",
        ],
      },
      {
        title: "التاسكات — يبني rules/features زي:",
        items: [
          { sub: "A) Repetition", items: ["نفس التعليق اتكرر كام مرة"] },
          {
            sub: "B) Similarity",
            items: [
              "تعليقات شبه بعض جدًا",
              "بما إنكم مش هتعملوا embeddings بنفسكم، ممكن تستخدموا:",
              "TF-IDF + cosine similarity",
              "fuzzy matching",
              "sentence similarity tool جاهز",
            ],
          },
          { sub: "C) Timing / Burst Detection", items: ["عدد كبير من التعليقات المتشابهة في وقت قصير"] },
          {
            sub: "D) Simple spam patterns",
            items: ["كلمات دعائية مكررة", "links كتير", "صياغة متكررة جدًا"],
          },
          {
            sub: "E) Final Suspicious Score — مثال:",
            items: [
              "Suspicious Score = 0.4 similarity + 0.3 repetition + 0.2 timing + 0.1 spam signals",
              "وبعدها يحط threshold: لو score > 0.7 → suspicious",
              "ويبعث النتائج على: suspicious-comments",
            ],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "suspicious detection module",
          "score calculation",
          "rules explanation",
          "examples لتعليقات اتحكم عليها وليه",
        ],
      },
    ],
    note: {
      title: "ده أهم شخص في تبرير فكرة المشروع",
      body: "لازم يوضح: إحنا مش بنعمل sentiment analysis وخلاص، إحنا بننضف الرأي العام من الضوضاء والحملات المزيفة، وده بيدي نتيجة أقرب للحقيقة.",
    },
  },
  {
    name: "Malak",
    role: "Dashboard + Alerts + Presentation Support",
    icon: LayoutDashboard,
    accent: "from-[oklch(0.78_0.15_95)] to-[oklch(0.7_0.18_75)]",
    sections: [
      {
        title: "دوره",
        items: ["واجهة المشروع والجزء اللي هيبان في الديمو"],
      },
      {
        title: "مسؤولياته",
        items: [
          "بناء dashboard",
          "عرض النتائج live",
          "إظهار الفرق بين raw و filtered",
          "إظهار alerts",
          "مساعدة في تجهيز العرض النهائي",
        ],
      },
      {
        title: "التاسكات",
        items: [
          {
            sub: "يبني Dashboard بـ Streamlit أو Dash تعرض:",
            items: [
              "total comments",
              "suspicious comments %",
              "raw sentiment",
              "trusted sentiment",
              "line chart over time",
              "top repeated comments",
              "recent alerts",
            ],
          },
          {
            sub: "Alerts — مثال:",
            items: [
              "“تم اكتشاف 40 تعليق متشابه خلال 3 دقائق”",
              "“ارتفاع غير طبيعي في positive comments”",
              "“حملة تعليقات مشبوهة محتملة”",
            ],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "dashboard شغال",
          "alerts panel",
          "visual comparison بين قبل وبعد التنقية",
          "demo-ready interface",
        ],
      },
    ],
  },
];

function renderItems(items: (string | { sub: string; items: string[] })[]) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <li key={i} className="flex gap-3 text-foreground/85 leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{it}</span>
          </li>
        ) : (
          <li key={i} className="space-y-2">
            <div className="font-semibold text-foreground">{it.sub}</div>
            <ul className="space-y-1.5 ps-5 border-s border-border/60">
              {it.items.map((sub, j) => (
                <li key={j} className="flex gap-2 text-foreground/75 text-sm">
                  <span className="text-primary/60">›</span>
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          </li>
        )
      )}
    </ul>
  );
}

function MemberCard({ member, index, open, onToggle }: { member: Member; index: number; open: boolean; onToggle: () => void }) {
  const Icon = member.icon;
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl transition-all duration-500 ${
        open ? "shadow-[0_30px_80px_-20px_oklch(0.5_0.2_280/0.4)]" : "hover:border-border/80 hover:-translate-y-1"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${member.accent} opacity-60`} />
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-5 p-6 text-start"
        aria-expanded={open}
      >
        <div className={`relative shrink-0 grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br ${member.accent} text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
          <span className="absolute -top-1.5 -right-1.5 grid place-items-center w-6 h-6 rounded-full bg-background border border-border text-[11px] font-mono font-bold text-foreground">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Person {index + 1}
          </div>
          <h3 className="text-2xl font-bold text-foreground tracking-tight">{member.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>
        </div>
        <div className={`shrink-0 grid place-items-center w-10 h-10 rounded-full border border-border/60 bg-background/40 transition-transform duration-500 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      <div
        className={`grid transition-all duration-500 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-7 space-y-6 border-t border-border/40 pt-6 mx-6 -mt-px">
            {member.sections.map((s, i) => (
              <div key={i} className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary/90">
                  {s.title}
                </h4>
                {renderItems(s.items)}
              </div>
            ))}
            {member.note && (
              <div className={`relative rounded-2xl p-5 bg-gradient-to-br ${member.accent} bg-opacity-10`}>
                <div className="absolute inset-0 rounded-2xl bg-background/80 backdrop-blur-sm" />
                <div className="relative">
                  <div className="text-xs font-mono uppercase tracking-[0.18em] text-foreground/60 mb-2">
                    ⚡ {member.note.title}
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{member.note.body}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[oklch(0.6_0.25_290)] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-[oklch(0.65_0.22_200)] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-[oklch(0.7_0.2_350)] opacity-15 blur-[120px]" />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/40 backdrop-blur-md text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-6">
            <span className="w-2 h-2 rounded-full bg-[oklch(0.7_0.2_140)] animate-pulse" />
            Real-Time Comment Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-br from-foreground via-foreground to-foreground/40 bg-clip-text text-transparent">
            تقسيمة المشروع
            <br />
            <span className="text-3xl md:text-5xl bg-gradient-to-r from-[oklch(0.7_0.2_290)] via-[oklch(0.7_0.2_200)] to-[oklch(0.75_0.2_350)] bg-clip-text text-transparent">
              على 7 أشخاص
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            اضغط على أي اسم لعرض المسؤوليات والتاسكات والـ deliverables بالتفصيل
          </p>
        </header>

        {/* Members */}
        <div className="space-y-4">
          {members.map((m, i) => (
            <MemberCard
              key={m.name}
              member={m}
              index={i}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>

        {/* Footer pipeline summary */}
        <footer className="mt-20 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-8">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-6 text-center">
            Pipeline Flow
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {["API", "Producer", "Kafka", "Cleaning", "Sentiment", "Fake Detection", "Alerts", "Dashboard"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-background border border-border/60 font-mono text-foreground/80">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-muted-foreground">←</span>}
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
