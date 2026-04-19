import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  Sparkles,
  FolderOpen,
  Bot,
  Send,
  Zap,
  Menu,
  X,
  LogIn,
  BookOpen,
  Lightbulb,
  Layers,
  FileText,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";

const primaryLinkClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300/12 bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))] px-5 py-2.5 text-sm font-medium text-violet-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)] transition-all hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)]";
const navLinkClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.055] hover:text-gray-200";
const featureIconClass =
  "mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-violet-200/9 bg-[linear-gradient(135deg,rgba(76,29,149,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))] text-violet-300/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";
const useCaseCardClass =
  "rounded-lg border border-white/[0.08] bg-[#111111] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-all duration-300 hover:border-white/[0.12] hover:bg-[#141414]";
const useCaseIconClass =
  "mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200/9 bg-[linear-gradient(135deg,rgba(76,29,149,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))] text-violet-300/75";

// ── Animated section wrapper ────────────────────────────────────────────────

function FadeInSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Image placeholder ───────────────────────────────────────────────────────

function ImagePlaceholder({
  src,
  alt,
  className = "",
  aspectClass = "aspect-video",
}: {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${aspectClass} flex items-center justify-center rounded-lg border border-white/[0.08] bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${className}`}
      >
        <span className="text-sm text-gray-500 px-4 text-center">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${aspectClass} rounded-lg border border-white/[0.08] object-cover ${className}`}
    />
  );
}

// ── Feature slide (NotebookLM-style) ────────────────────────────────────────

function FeatureSlide({
  icon,
  title,
  description,
  imageSrc,
  imageAlt,
  reverse = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-10 md:gap-16`}>
      {/* Text */}
      <div className="flex-1 max-w-md">
        <div className={featureIconClass}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>
      {/* Image */}
      <div className="flex-1 w-full">
        <ImagePlaceholder
          src={imageSrc}
          alt={imageAlt}
          className="w-full shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
          aspectClass="aspect-[3/2]"
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ctaPath = isAuthenticated ? "/app" : "/register";
  const ctaText = isAuthenticated ? "Перейти к приложению" : "Начать бесплатно";
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-[#080808]/82 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center">
          {/* Logo — pinned left */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Sparkles className="text-violet-300/80" size={24} />
            <span className="text-lg font-bold">ShuKnow</span>
          </Link>

          {/* Spacer */}
          <div className="hidden md:flex flex-1" />

          {/* Login — pinned right */}
          <div className="hidden md:flex items-center shrink-0">
            {isAuthenticated ? (
              <Link to="/app" className={navLinkClass}><LogIn size={16} />Войти в приложение</Link>
            ) : (
              <Link to="/login" className={navLinkClass}><LogIn size={16} />Вход</Link>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.055] text-gray-400 hover:text-gray-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.07] bg-[#080808]/95 backdrop-blur-xl px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <Link to="/app" className={`${navLinkClass} w-full`}><LogIn size={16} />Войти в приложение</Link>
            ) : (
              <Link to="/login" className={`${navLinkClass} w-full`}><LogIn size={16} />Вход</Link>
            )}
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight leading-[1.0] mb-3">
              ShuKnow
            </h1>

            <p className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-14">
              <span className="bg-[linear-gradient(135deg,rgba(232,222,255,0.96),rgba(167,139,250,0.78)_48%,rgba(125,211,252,0.74))] bg-clip-text text-transparent">
                сохраняй без рутины
              </span>
            </p>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              ИИ-агент, который автоматически сортирует ваши заметки, файлы и изображения
              по нужным папкам. Просто отправьте — остальное сделает агент.
            </p>

            <div className="flex items-center justify-center">
              <Link to={ctaPath} className={primaryLinkClass}>
                Начать сейчас
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как это устроено</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Вы отправляете — агент раскладывает. Вот и всё.
            </p>
          </FadeInSection>

          <div className="space-y-24 md:space-y-32">
            <FadeInSection>
              <FeatureSlide
                icon={<Send size={22} className="-translate-x-0.5 translate-y-0.5" />}
                title="Отправьте что угодно"
                description="Текст, картинку, файл — просто киньте в чат, как сообщение другу. Без лишних кнопок и настроек."
                imageSrc="/images/landing/feature-chat.svg"
                imageAlt="Чат-интерфейс для отправки данных"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureSlide
                icon={<Zap size={22} />}
                title="Агент сам разложит"
                description="ИИ читает содержимое, определяет категорию и кладёт в нужную папку. Вам не нужно думать, куда это деть."
                imageSrc="/images/landing/feature-sort.svg"
                imageAlt="Автоматическая сортировка по папкам"
                reverse
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureSlide
                icon={<FolderOpen size={22} />}
                title="Ваши правила"
                description="Создайте папки и опишите, что в них хранить. Настройте один раз — агент будет следовать вашей структуре."
                imageSrc="/images/landing/feature-folders.svg"
                imageAlt="Настройка папок и правил"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureSlide
                icon={<Bot size={22} />}
                title="Своя модель"
                description="Подключите OpenAI, Anthropic или любой другой LLM. Можно даже бесплатные API — никаких подписок."
                imageSrc="/images/landing/feature-model.svg"
                imageAlt="Выбор LLM-провайдера"
                reverse
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 border-t border-white/[0.07]">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Способы применения</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Несколько сценариев, где ShuKnow берёт рутину на себя
            </p>
          </FadeInSection>

          <FadeInSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={useCaseCardClass}>
                <div className={useCaseIconClass}>
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Учёба и конспекты</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Скиньте лекцию, статью или учебник — агент разберёт материал и разложит по нужным папкам. Готовиться к экзаменам станет проще.</p>
              </div>

              <div className={useCaseCardClass}>
                <div className={useCaseIconClass}>
                  <Lightbulb size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Сбор идей и ресёрч</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Кидайте ссылки, цитаты и заметки в чат. Агент сгруппирует всё по темам — вы сосредоточитесь на главном.</p>
              </div>

              <div className={useCaseCardClass}>
                <div className={useCaseIconClass}>
                  <Layers size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Организация проектов</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Документы, ТЗ, ссылки на доку — отправьте в чат, и агент распределит файлы по папкам проекта за вас.</p>
              </div>

              <div className={useCaseCardClass}>
                <div className={useCaseIconClass}>
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Личная база знаний</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Рецепты, книги, заметки из путешествий — всё, что хочется сохранить и легко найти потом. Агент наведёт порядок.</p>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/[0.07]">
        <FadeInSection className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Готовы навести порядок?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Перестаньте тратить время на ручную сортировку. Позвольте ИИ
            организовать вашу информацию.
          </p>
          <Link to={ctaPath} className={primaryLinkClass}>
            {ctaText}
          </Link>
        </FadeInSection>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} ShuKnow. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}
