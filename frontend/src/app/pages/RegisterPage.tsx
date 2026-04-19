import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const authPanelClass =
  "overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]";
const authFieldClass =
  "h-[46px] rounded-lg border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors placeholder:text-gray-600 focus-visible:border-violet-300/28 focus-visible:bg-[#121212] focus-visible:ring-0";
const authButtonClass =
  "rounded-lg border border-violet-300/12 bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))] text-violet-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)] transition-all hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)]";

export default function RegisterPage() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginValue || !password || !confirmPassword) {
      setError("Заполните все поля");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }

    try {
      await register(loginValue, password);
      navigate("/app");
    } catch {
      setError("Ошибка регистрации. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-6 text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col items-center justify-center">
        <main className="flex w-full flex-col items-center">
          <Link to="/" className="flex items-center gap-2 text-white">
            <Sparkles className="text-violet-300/80" size={30} />
            <span className="text-lg font-semibold tracking-tight">ShuKnow</span>
          </Link>
          <Card className={`${authPanelClass} mt-6 w-full max-w-md gap-0`}>
            <CardHeader className="border-b border-white/[0.07] px-6 py-5">
              <CardTitle className="text-xl font-semibold text-white">Создать аккаунт</CardTitle>
              <CardDescription className="text-sm text-gray-400">
                Сохраните материалы и настройте личное пространство
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-rose-400/18 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-login" className="text-sm text-gray-400">Логин</Label>
                  <Input
                    id="register-login"
                    name="username"
                    type="text"
                    placeholder="Ваш логин"
                    value={loginValue}
                    onChange={(e) => setLoginValue(e.target.value)}
                    autoComplete="username"
                    className={authFieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm text-gray-400">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      name="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Минимум 8 символов"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={`${authFieldClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-0 flex h-[46px] w-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-300"
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirmPassword" className="text-sm text-gray-400">Подтвердите пароль</Label>
                  <div className="relative">
                    <Input
                      id="register-confirmPassword"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Повторите пароль"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className={`${authFieldClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-0 flex h-[46px] w-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-300"
                      aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium ${authButtonClass}`}
                >
                  Зарегистрироваться
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Уже есть аккаунт?{" "}
                <Link to="/login" className="text-violet-300/85 hover:text-violet-200">
                  Войти
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
