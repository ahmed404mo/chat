"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [status, setStatus] = useState<
    "idle" | "joining" | "success" | "error" | "no_code"
  >(searchParams.get("code") ? "idle" : "no_code");
  const [message, setMessage] = useState("");
  const [checkingChats, setCheckingChats] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkUserStatus = async () => {
      if (!user) return;

      const isManager = user.role === "admin" || user.role === "hr";
      // لو كان أدمن أو HR يروح للشات مباشرة
      if (isManager) {
        router.push("/chat");
        return;
      }

      // لو يوزر عادي أو موظف، ومفيش كود دعوة في الرابط، هنفحص جروباته
      const urlCode = searchParams.get("code");
      if (!urlCode) {
        setCheckingChats(true);
        try {
          const res = await fetch("/api/chat/conversations", {
            headers: {
              authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const data = await res.json();

          if (!isMounted) return;

          // لو رجع بجروبات، هنحوله للشات فوراً
          if (data.conversations && data.conversations.length > 0) {
            router.push("/chat");
          } else {
            // لو معندوش جروبات، يفضل هنا عشان يكتب الكود
            setCheckingChats(false);
          }
        } catch (err) {
          if (isMounted) setCheckingChats(false);
        }
      }
    };

    if (!loading && user) {
      checkUserStatus();
    }

    if (!loading && !user) {
      const currentCode = searchParams.get("code");
      const redirectPath = currentCode
        ? `/join?code=${encodeURIComponent(currentCode)}`
        : "/join";
      router.push(`/?redirect=${encodeURIComponent(redirectPath)}`);
    }

    return () => {
      isMounted = false;
    };
  }, [user, loading, router, searchParams]);

  useEffect(() => {
    // Auto-join if code is in URL and user is logged in
    if (searchParams.get("code") && user && status === "idle") {
      handleJoin();
    }
  }, [searchParams, user, status]);

  const handleJoin = async () => {
    if (!code.trim()) {
      // This case should ideally not be hit if button is disabled
      return;
    }

    setStatus("joining");
    setMessage("");

    try {
      const res = await fetch("/api/chat/invite/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Invalid invitation code");
        return;
      }

      setStatus("success");
      setMessage("Successfully joined the conversation!");
      setTimeout(async () => {
        router.push("/chat");
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Failed to connect. Please try again.");
    }
  };

  // إظهار شاشة التحميل في حالة تسجيل الدخول أو أثناء فحص الجروبات
  if (loading || checkingChats || (user && status === "idle")) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center theme-dark:bg-[#09090b] bg-gray-50 relative overflow-hidden">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-r-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center theme-dark:bg-[#09090b] bg-[#f8fafc] relative overflow-hidden px-4">
      <div className="absolute top-[-20%] ltr:left-[-10%] rtl:right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-20%] ltr:right-[-10%] rtl:left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none -z-10"></div>

      <div className="w-full max-w-md theme-dark:bg-white/5 bg-white/80 backdrop-blur-2xl border theme-dark:border-white/10 border-gray-200 rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 text-center animate-fade-in-up">
        {status === "no_code" || status === "error" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 theme-dark:border-white/10 border-gray-200 flex items-center justify-center mx-auto mb-4">
              <svg
                width="36"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="theme-dark:text-gray-400 text-gray-500"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
              </svg>
            </div>
            <h4 className="font-bold mb-2 theme-dark:text-white text-gray-900">
              Invitation Required
            </h4>
            <p className="theme-dark:text-gray-400 text-gray-500 text-sm mb-6">
              To join a conversation, you need an invitation link from your
              manager.
            </p>

            {status === "error" && (
              <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                {message}
              </div>
            )}

            <div className="mb-4 text-left">
              <label className="block text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                Or enter code manually
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 text-center font-mono text-lg theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: "0.15em" }}
                maxLength={8}
              />
            </div>
            <button
              className="w-full py-2.5 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              onClick={handleJoin}
              disabled={!code.trim()}
            >
              Join Chat
            </button>
          </>
        ) : status === "success" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-400"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h4 className="font-bold mb-2 text-green-400">Welcome!</h4>
            <p className="theme-dark:text-gray-300 text-gray-600 text-sm mb-0">
              {message}
            </p>
            <p className="text-sm theme-dark:text-gray-500 text-gray-400 mt-1">
              Redirecting to chat...
            </p>
          </>
        ) : (
          // الحالة الافتراضية (joining)
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-r-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] mx-auto"></div>
            <p className="theme-dark:text-gray-400 text-gray-500 text-sm mt-6">
              Joining conversation, please wait...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center theme-dark:bg-[#09090b] bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-r-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
