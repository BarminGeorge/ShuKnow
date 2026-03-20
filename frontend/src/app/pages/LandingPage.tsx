import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Sparkles,
  FolderOpen,
  Bot,
  Send,
  Zap,
  ArrowRight,
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
        className={`${aspectClass} rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-white/5 flex items-center justify-center ${className}`}
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
      className={`${aspectClass} rounded-xl border border-white/10 object-cover ${className}`}
    />
  );
}

// ── Feature card ────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  imageSrc,
  imageAlt,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}) {
  return (
    <div className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed mb-4">{description}</p>
      <ImagePlaceholder
        src={imageSrc}
        alt={imageAlt}
        className="w-full"
        aspectClass="aspect-[3/2]"
      />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ctaPath = isAuthenticated ? "/app" : "/register";
  const ctaText = isAuthenticated ? "Перейти к приложению" : "Начать бесплатно";

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center">
          {/* Logo — pinned left */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Sparkles className="text-blue-400" size={22} />
            <span className="text-lg font-bold">ShuKnow</span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <button onClick={() => scrollToSection("features")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Возможности
            </button>
            <button onClick={() => scrollToSection("use-cases")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Применение
            </button>
          </div>

          {/* Login — pinned right */}
          <div className="hidden md:flex items-center shrink-0">
            {isAuthenticated ? (
              <Button asChild size="sm" variant="ghost" className="text-gray-400 hover:text-gray-200 hover:bg-white/5 gap-2">
                <Link to="/app"><LogIn size={16} />Войти в приложение</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="ghost" className="text-gray-400 hover:text-gray-200 hover:bg-white/5 gap-2">
                <Link to="/login"><LogIn size={16} />Вход</Link>
              </Button>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 py-4 space-y-2">
            <button onClick={() => scrollToSection("features")} className="block w-full text-left text-sm text-gray-300 hover:text-white py-2">
              Возможности
            </button>
            <button onClick={() => scrollToSection("use-cases")} className="block w-full text-left text-sm text-gray-300 hover:text-white py-2">
              Применение
            </button>
            <div className="pt-2 border-t border-white/5">
              {isAuthenticated ? (
                <Button asChild size="sm" variant="ghost" className="text-gray-300 hover:text-white w-full gap-2">
                  <Link to="/app"><LogIn size={16} />Войти в приложение</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="ghost" className="text-gray-300 hover:text-white w-full gap-2">
                  <Link to="/login"><LogIn size={16} />Вход</Link>
                </Button>
              )}
            </div>
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
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                сохраняй без рутины
              </span>
            </p>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              ИИ-агент, который автоматически сортирует ваши заметки, файлы и изображения
              по нужным папкам. Просто отправьте — остальное сделает агент.
            </p>

            <div className="flex items-center justify-center">
              <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-6 text-lg rounded-full">
                <Link to={ctaPath}>
                  Начать сейчас
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16"
          >
            <div className="relative">
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-blue-500/20 via-purple-500/10 to-transparent rounded-3xl blur-3xl" />
              <ImagePlaceholder
                src="/images/landing/hero.webp"
                alt="Интерфейс ShuKnow — чат с ИИ-агентом и папки"
                className="w-full shadow-2xl shadow-blue-500/5"
                aspectClass="aspect-[16/9]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как это устроено</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Вы отправляете — агент раскладывает. Вот и всё.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeInSection>
              <FeatureCard
                icon={<Send size={20} />}
                title="Отправьте что угодно"
                description="Текст, картинку, файл — просто киньте в чат, как сообщение другу. Без лишних кнопок и настроек."
                imageSrc="/images/landing/feature-chat.webp"
                imageAlt="Чат-интерфейс для отправки данных"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<Zap size={20} />}
                title="Агент сам разложит"
                description="ИИ читает содержимое, определяет категорию и кладёт в нужную папку. Вам не нужно думать, куда это деть."
                imageSrc="/images/landing/feature-sort.webp"
                imageAlt="Автоматическая сортировка по папкам"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<FolderOpen size={20} />}
                title="Ваши правила"
                description="Создайте папки и опишите, что в них хранить. Настройте один раз — агент будет следовать вашей структуре."
                imageSrc="/images/landing/feature-folders.webp"
                imageAlt="Настройка папок и правил"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<Bot size={20} />}
                title="Своя модель"
                description="Подключите OpenAI, Anthropic или любой другой LLM. Можно даже бесплатные API — никаких подписок."
                imageSrc="/images/landing/feature-model.webp"
                imageAlt="Выбор LLM-провайдера"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Способы применения</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Несколько сценариев, где ShuKnow берёт рутину на себя
            </p>
          </FadeInSection>

          <FadeInSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Учёба и конспекты</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Скиньте лекцию, статью или учебник — агент разберёт материал и разложит по нужным папкам. Готовиться к экзаменам станет проще.</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Lightbulb size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Сбор идей и ресёрч</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Кидайте ссылки, цитаты и заметки в чат. Агент сгруппирует всё по темам — вы сосредоточитесь на главном.</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Layers size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Организация проектов</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Документы, ТЗ, ссылки на доку — отправьте в чат, и агент распределит файлы по папкам проекта за вас.</p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
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
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <FadeInSection className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Готовы навести порядок?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Перестаньте тратить время на ручную сортировку. Позвольте ИИ
            организовать вашу информацию.
          </p>
          <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-6 text-lg rounded-full">
            <Link to={ctaPath}>
              {ctaText}
            </Link>
          </Button>
        </FadeInSection>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} ShuKnow. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}
