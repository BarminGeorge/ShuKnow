import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to app if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
          <Sparkles className="text-blue-400" size={28} />
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
                <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="login" className="text-gray-300">Логин</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="Ваш логин"
                  value={loginValue}
                  onChange={(e) => setLoginValue(e.target.value)}
                  className="bg-[#0d0d0d] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0d0d0d] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Войти
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
