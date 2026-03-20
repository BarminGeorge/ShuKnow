import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Sparkles,
  FolderOpen,
  Bot,
  Send,
  Zap,
  Settings,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
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

// ── Step card ───────────────────────────────────────────────────────────────

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{description}</p>
    </div>
  );
}

// ── Comparison row ──────────────────────────────────────────────────────────

function ComparisonRow({
  feature,
  shuknow,
  obsidian,
  memai,
}: {
  feature: string;
  shuknow: boolean;
  obsidian: boolean;
  memai: boolean;
}) {
  const Cell = ({ value }: { value: boolean }) => (
    <td className="px-4 py-3 text-center">
      {value ? (
        <CheckCircle2 className="inline text-green-400" size={18} />
      ) : (
        <X className="inline text-gray-600" size={18} />
      )}
    </td>
  );

  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3 text-sm text-gray-300">{feature}</td>
      <Cell value={shuknow} />
      <Cell value={obsidian} />
      <Cell value={memai} />
    </tr>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="text-blue-400" size={22} />
            <span className="text-lg font-bold">ShuKnow</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("features")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Возможности
            </button>
            <button onClick={() => scrollToSection("how-it-works")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Как это работает
            </button>
            <button onClick={() => scrollToSection("comparison")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Сравнение
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/app">Перейти к приложению</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                  <Link to="/login">Войти</Link>
                </Button>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/register">Начать сейчас</Link>
                </Button>
              </>
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
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <button onClick={() => scrollToSection("features")} className="block w-full text-left text-sm text-gray-300 hover:text-white py-2">
              Возможности
            </button>
            <button onClick={() => scrollToSection("how-it-works")} className="block w-full text-left text-sm text-gray-300 hover:text-white py-2">
              Как это работает
            </button>
            <button onClick={() => scrollToSection("comparison")} className="block w-full text-left text-sm text-gray-300 hover:text-white py-2">
              Сравнение
            </button>
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  <Link to="/app">Перейти к приложению</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white w-full">
                    <Link to="/login">Войти</Link>
                  </Button>
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                    <Link to="/register">Начать сейчас</Link>
                  </Button>
                </>
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
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 mb-6">
              <Sparkles className="text-blue-400" size={14} />
              <span className="text-xs text-blue-300 font-medium">AI-powered организация</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Отправил —{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                и готово
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              ИИ-агент, который автоматически сортирует ваши заметки, файлы и изображения
              по нужным папкам. Просто отправьте — остальное сделает агент.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 text-base">
                <Link to={ctaPath}>
                  {ctaText}
                  <ArrowRight size={18} className="ml-2" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-gray-400 hover:text-white text-base"
                onClick={() => scrollToSection("how-it-works")}
              >
                Как это работает?
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Возможности</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Всё, что нужно для автоматической организации информации
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FadeInSection>
              <FeatureCard
                icon={<Zap size={20} />}
                title="Автоматическая сортировка"
                description="Отправьте текст, картинку или файл через чат — ИИ определит категорию и распределит по нужным папкам. Никакой ручной работы."
                imageSrc="/images/landing/feature-sort.webp"
                imageAlt="Скриншот автоматической сортировки"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<FolderOpen size={20} />}
                title="Гибкая настройка"
                description="Создайте папки, опишите что в них хранить — и агент запомнит вашу структуру. Настройте один раз, пользуйтесь всегда."
                imageSrc="/images/landing/feature-folders.webp"
                imageAlt="Скриншот настройки папок"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<Bot size={20} />}
                title="Своя модель"
                description="Подключите OpenAI, Anthropic или любой другой LLM-провайдер. Используйте бесплатные API вместо дорогих подписок."
                imageSrc="/images/landing/feature-model.webp"
                imageAlt="Скриншот настройки API"
              />
            </FadeInSection>

            <FadeInSection>
              <FeatureCard
                icon={<Send size={20} />}
                title="Отправил и готово"
                description="Принцип работы — как мессенджер. Отправьте сообщение с данными в чат, и агент всё сделает сам. Без лишних действий."
                imageSrc="/images/landing/feature-chat.webp"
                imageAlt="Скриншот чат-интерфейса"
              />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как это работает</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Три простых шага до полной автоматизации
            </p>
          </FadeInSection>

          <FadeInSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <StepCard
                number={1}
                icon={<Settings size={24} />}
                title="Настройте папки"
                description="Создайте папки и опишите, какую информацию в них хранить. Агент будет ориентироваться на ваши описания."
              />
              <StepCard
                number={2}
                icon={<Send size={24} />}
                title="Отправьте данные"
                description="Напишите текст, прикрепите фото или файл — просто отправьте в чат, как сообщение в мессенджере."
              />
              <StepCard
                number={3}
                icon={<Sparkles size={24} />}
                title="ИИ всё разложит"
                description="Агент проанализирует содержимое и автоматически поместит его в подходящую папку и файл."
              />
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Comparison ─────────────────────────────────────────────────────── */}
      <section id="comparison" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Сравнение</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Чем ShuKnow отличается от других решений
            </p>
          </FadeInSection>

          <FadeInSection>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Возможность</th>
                    <th className="px-4 py-3 text-center text-blue-400 font-semibold">ShuKnow</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Obsidian</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">mem.ai</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow feature="Авто-сортировка по папкам" shuknow={true} obsidian={false} memai={false} />
                  <ComparisonRow feature='Принцип "отправил и готово"' shuknow={true} obsidian={false} memai={false} />
                  <ComparisonRow feature="Поддержка картинок" shuknow={true} obsidian={true} memai={false} />
                  <ComparisonRow feature="Своя LLM-модель" shuknow={true} obsidian={false} memai={false} />
                  <ComparisonRow feature="Бесплатный план" shuknow={true} obsidian={true} memai={false} />
                  <ComparisonRow feature="Пользовательские правила сортировки" shuknow={true} obsidian={false} memai={false} />
                  <ComparisonRow feature="Офлайн-режим" shuknow={false} obsidian={true} memai={false} />
                  <ComparisonRow feature="AI-поиск по файлам" shuknow={true} obsidian={false} memai={true} />
                </tbody>
              </table>
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
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 text-base">
            <Link to={ctaPath}>
              {ctaText}
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </FadeInSection>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-sm font-medium">ShuKnow</span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} ShuKnow. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}
