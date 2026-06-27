"use client";
import { useState, useEffect, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SplashScreen from "@/components/SplashScreen";

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/chat";

  useEffect(() => {
    if (user) {
      const isManager = user.role === "admin" || user.role === "hr";
      if (isManager) {
        router.push("/chat");
      } else if (redirectTo === "/chat") {
        router.push("/join");
      } else {
        router.push(redirectTo);
      }
    }
  }, [user, router, redirectTo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Request notification permission on user gesture
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    // الخلفية الأساسية غامقة مع دوائر نيون مضيئة
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden p-4 font-sans text-white">
      {/* تأثيرات الإضاءة في الخلفية (Neon Orbs) */}
      <div className="absolute top-[-10%] ltr:left-[-10%] rtl:right-[-10%] w-96 h-96 bg-blue-600/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] ltr:right-[-10%] rtl:left-[-10%] w-96 h-96 bg-purple-600/40 rounded-full blur-[120px] pointer-events-none"></div>

      {/* كونتينر الفورم (Glassmorphism) */}
      <div className="w-full max-w-[400px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 sm:p-10 z-10 relative flex flex-col justify-center animate-fade-in-up">
        
        {/* الهيدر */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 mb-6 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-gray-400">
            {isLogin
              ? "Sign in to continue to your workspace"
              : "Register to get started with us"}
          </p>
        </div>

        {/* تنبيه الأخطاء */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 text-center backdrop-blur-md">
            {error}
          </div>
        )}

        {/* الفورم */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400 pl-2">Full Name</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 placeholder-gray-500"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400 pl-2">Email Address</label>
            <input
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 placeholder-gray-500"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400 pl-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 placeholder-gray-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-2xl px-4 py-4 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-white/10"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Register"
            )}
          </button>
        </form>

        {/* الفوتر للتبديل بين اللوجين والتسجيل */}
        <p className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="font-semibold text-blue-400 hover:text-blue-300 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] transition-all focus:outline-none"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Register now" : "Sign in here"}
          </button>
        </p>

      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <SplashScreen message="جاري التحميل..." />
      }
    >
      <AuthForm />
    </Suspense>
  );
}