import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginValue || !password) {
      setError("Заполните все поля");
      return;
    }

    try {
      await login(loginValue, password);
      navigate("/app");
    } catch {
      setError("Ошибка входа. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <Link to="/" className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={28} />
          <span className="text-2xl font-bold text-white">ShuKnow</span>
        </Link>

        <Card className="bg-[#141414] border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Войти в аккаунт</CardTitle>
            <CardDescription className="text-gray-400">
              Введите логин и пароль для входа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="login" className="text-gray-300">Логин</Label>
                <Input
                  id="login"
                  name="username"
                  type="text"
                  placeholder="Ваш логин"
                  value={loginValue}
                  onChange={(e) => setLoginValue(e.target.value)}
                  autoComplete="username"
                  className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Войти
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
