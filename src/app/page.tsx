"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import AuroraBackground from "@/components/reactbits/AuroraBackground";

const PASSWORD_LEVELS = [
  { labelAr: "ضعيف", labelEn: "Weak", color: "#ef4444" },
  { labelAr: "مقبول", labelEn: "Fair", color: "#f59e0b" },
  { labelAr: "جيد", labelEn: "Good", color: "#22c55e" },
  { labelAr: "قوي", labelEn: "Strong", color: "#7c5cff" },
];

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3);
}

function isCapsLock(e: React.KeyboardEvent): boolean {
  return e.getModifierState("CapsLock");
}

function useIsRtl() {
  const [isRtl, setIsRtl] = useState(false);
  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);
  return isRtl;
}

function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  icon,
  error,
  autoFocus,
  onKeyDown,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  error?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;
  const isRtl = useIsRtl();

  return (
    <div className="relative">
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-200"
        style={{
          border: `1px solid ${error ? "var(--color-danger)" : focused ? "var(--color-primary)" : "var(--color-border)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(124, 92, 255, 0.08)" : "none",
          background: "var(--color-input)",
        }}
      >
        <div
          className="absolute inset-y-0 flex items-center pointer-events-none z-10"
          style={{
            [isRtl ? "right" : "left"]: 14,
            color: floating ? "var(--color-primary)" : "var(--color-muted)",
          }}
        >
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete={
            type === "password"
              ? id.includes("confirm")
                ? "new-password"
                : "current-password"
              : "off"
          }
          className="w-full bg-transparent text-sm outline-none transition-colors"
          style={{
            padding: isRtl ? "22px 40px 6px 12px" : "22px 12px 6px 40px",
            color: "var(--color-text)",
          }}
          aria-label={label}
          aria-invalid={!!error}
        />
        <label
          htmlFor={id}
          onClick={() => document.getElementById(id)?.focus()}
          className="absolute pointer-events-none transition-all duration-200"
          style={{
            [isRtl ? "right" : "left"]: floating ? 40 : 40,
            top: floating ? 6 : "50%",
            transform: floating ? "translateY(0)" : "translateY(-50%)",
            fontSize: floating ? "10px" : "13px",
            color: error
              ? "var(--color-danger)"
              : floating
                ? "var(--color-primary)"
                : "var(--color-muted)",
            fontWeight: floating ? 600 : 400,
          }}
        >
          {label}
        </label>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="text-xs mt-1.5 px-1"
            style={{ color: "var(--color-danger)" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const level = getPasswordStrength(password);
  if (!password) return null;
  const info = PASSWORD_LEVELS[level] || PASSWORD_LEVELS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 space-y-1.5"
    >
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i <= level ? info.color : "var(--color-border)",
            }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: info.color }}>
        {info.labelAr}
        {level >= 3 && ""}
      </p>
    </motion.div>
  );
}

function RippleButton({
  children,
  onClick,
  disabled,
  loading,
  type: btnType,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "submit" | "button";
  variant?: "primary" | "secondary";
}) {
  const [ripples, setRipples] = useState<
    { x: number; y: number; id: number }[]
  >([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);
  const isRtl = useIsRtl();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = rippleId.current++;
      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(
        () => setRipples((prev) => prev.filter((r) => r.id !== id)),
        600,
      );
      onClick?.();
    },
    [onClick],
  );

  const isPrimary = variant === "primary";

  return (
    <button
      ref={btnRef}
      type={btnType || "button"}
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full relative overflow-hidden rounded-xl text-sm font-semibold transition-all duration-200 select-none"
      style={{
        padding: "13px 24px",
        background: isPrimary
          ? "linear-gradient(135deg, var(--color-primary), var(--color-secondary))"
          : "var(--color-hover)",
        color: isPrimary ? "#fff" : "var(--color-text)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow:
          isPrimary && !disabled
            ? "0 4px 16px rgba(124, 92, 255, 0.25)"
            : "none",
      }}
      aria-busy={loading}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center justify-center gap-2"
          >
            <svg
              className="animate-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Please wait...</span>
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x - 8,
            top: r.y - 8,
            width: 16,
            height: 16,
            background: "rgba(255,255,255,0.35)",
            animation: "ripple 0.6s ease-out forwards",
          }}
        />
      ))}
      <style>{`@keyframes ripple { to { transform: scale(25); opacity: 0; } }`}</style>
    </button>
  );
}

const formFadeProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
} as const;

const T = {
  welcomeBack: { ar: "مرحباً بعودتك", en: "Welcome back" },
  createAccount: { ar: "إنشاء حساب", en: "Create account" },
  signInToContinue: {
    ar: "سجل الدخول إلى حسابك للمتابعة",
    en: "Sign in to your account to continue",
  },
  getStarted: {
    ar: "ابدأ مع حسابك المجاني",
    en: "Get started with your free account",
  },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  emailAddress: { ar: "البريد الإلكتروني", en: "Email Address" },
  password: { ar: "كلمة المرور", en: "Password" },
  confirmPassword: { ar: "تأكيد كلمة المرور", en: "Confirm Password" },
  signedIn: { ar: "تم تسجيل الدخول بنجاح", en: "Signed in successfully" },
  accountCreated: { ar: "تم إنشاء الحساب", en: "Account created" },
  redirecting: { ar: "جاري التحويل...", en: "Redirecting..." },
  nameRequired: { ar: "الاسم مطلوب", en: "Name is required" },
  emailRequired: { ar: "البريد الإلكتروني مطلوب", en: "Email is required" },
  emailInvalid: { ar: "بريد إلكتروني غير صالح", en: "Invalid email address" },
  passwordRequired: { ar: "كلمة المرور مطلوبة", en: "Password is required" },
  passwordMin: { ar: "على الأقل 6 أحرف", en: "At least 6 characters" },
  confirmRequired: {
    ar: "يرجى تأكيد كلمة المرور",
    en: "Please confirm your password",
  },
  confirmMismatch: {
    ar: "كلمتا المرور غير متطابقتين",
    en: "Passwords do not match",
  },
  rememberMe: { ar: "تذكرني", en: "Remember me" },
  noAccount: { ar: "ليس لديك حساب؟", en: "Don't have an account?" },
  haveAccount: { ar: "لديك حساب بالفعل؟", en: "Already have an account?" },
  signUp: { ar: "اشتراك", en: "Sign up" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  capsLockOn: { ar: "مفتاح Caps Lock مفعل", en: "Caps Lock is on" },
  hide: { ar: "إخفاء", en: "Hide" },
  show: { ar: "إظهار", en: "Show" },
  terms: {
    ar: "بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية",
    en: "By continuing, you agree to our Terms of Service and Privacy Policy",
  },
  signInBtn: { ar: "تسجيل الدخول", en: "Sign In" },
  createAccountBtn: { ar: "إنشاء حساب", en: "Create Account" },
  errorOccurred: {
    ar: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    en: "An error occurred. Please try again.",
  },
  or: { ar: "أو", en: "or" },
};

function t(text: { ar: string; en: string }, isRtl: boolean) {
  return isRtl ? text.ar : text.en;
}

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const isRtl = useIsRtl();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [success, setSuccess] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin" || user.role === "hr") router.push("/chat");
      else router.push("/join");
    }
  }, [user, loading, router]);

  useEffect(() => {
    emailRef.current?.focus();
  }, [isLogin]);

  const validate = useCallback((): boolean => {
    let valid = true;
    if (!isLogin) {
      if (!name.trim()) {
        setNameError(t(T.nameRequired, isRtl));
        valid = false;
      } else setNameError("");
    }
    if (!email.trim()) {
      setEmailError(t(T.emailRequired, isRtl));
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t(T.emailInvalid, isRtl));
      valid = false;
    } else setEmailError("");

    if (!password) {
      setPasswordError(t(T.passwordRequired, isRtl));
      valid = false;
    } else if (password.length < 6) {
      setPasswordError(t(T.passwordMin, isRtl));
      valid = false;
    } else setPasswordError("");

    if (!isLogin) {
      if (!confirmPassword) {
        setConfirmError(t(T.confirmRequired, isRtl));
        valid = false;
      } else if (password !== confirmPassword) {
        setConfirmError(t(T.confirmMismatch, isRtl));
        valid = false;
      } else setConfirmError("");
    }
    return valid;
  }, [isLogin, isRtl, name, email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setFormLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      setSuccess(true);
      setTimeout(() => {
        if (user?.role === "admin" || user?.role === "hr") router.push("/chat");
        else router.push("/join");
      }, 800);
    } catch (err: any) {
      setError(err.message || t(T.errorOccurred, isRtl));
      setSuccess(false);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setPassword("");
    setConfirmPassword("");
    setCapsLock(false);
  };

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            }}
          />
          <div className="flex gap-1.5">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{
                  animationDelay: `${d}ms`,
                  background: "var(--color-primary)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden sm:py-8"
      style={{ background: "var(--color-bg)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-[480px] relative z-10 sm:px-4"
      >
        <div
          className="sm:rounded-[28px] border-0 sm:border shadow-2xl overflow-hidden min-h-[100dvh] sm:min-h-0 w-full flex flex-col"
          style={{
            background: "var(--color-surface)",
            borderColor: "rgba(124, 92, 255, 0.12)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,92,255,0.06) inset",
          }}
        >
          <div className="flex flex-col justify-center flex-1 px-5 sm:px-10 py-8">
            {/* Header */}
            <motion.div
              {...formFadeProps}
              className="flex flex-col items-center mb-9"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.15,
                }}
                className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center mb-5"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                  boxShadow: "0 8px 24px rgba(124, 92, 255, 0.25)",
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[22px] font-bold text-[var(--color-text)] tracking-tight"
              >
                {isLogin ? t(T.welcomeBack, isRtl) : t(T.createAccount, isRtl)}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-[var(--color-muted)] mt-1.5 text-center"
              >
                {isLogin
                  ? t(T.signInToContinue, isRtl)
                  : t(T.getStarted, isRtl)}
              </motion.p>
            </motion.div>

            {/* Success overlay */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "rgba(34, 197, 94, 0.15)" }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {isLogin
                      ? t(T.signedIn, isRtl)
                      : t(T.accountCreated, isRtl)}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    {t(T.redirecting, isRtl)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              {!success && (
                <motion.form
                  key={isLogin ? "login" : "register"}
                  {...formFadeProps}
                  onSubmit={handleSubmit}
                  className="space-y-4 w-full"
                  noValidate
                >
                  {/* Name field (register only) */}
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          marginBottom: 16,
                        }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <FloatingInput
                          id="name"
                          label={t(T.fullName, isRtl)}
                          type="text"
                          value={name}
                          onChange={(v) => {
                            setName(v);
                            setNameError("");
                          }}
                          error={nameError}
                          icon={
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  <FloatingInput
                    id="email"
                    label={t(T.emailAddress, isRtl)}
                    type="email"
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      setEmailError("");
                    }}
                    error={emailError}
                    autoFocus
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    }
                  />

                  {/* Password */}
                  <div>
                    <FloatingInput
                      id="password"
                      label={t(T.password, isRtl)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        setPasswordError("");
                      }}
                      error={passwordError}
                      onKeyDown={(e) => {
                        setCapsLock(isCapsLock(e));
                      }}
                      icon={
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      }
                    />
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <AnimatePresence>
                          {capsLock && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="flex items-center gap-1 text-[10px] font-medium"
                              style={{ color: "var(--color-danger)" }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M12 2v8m0 0l-4-4m4 4l4-4" />
                                <path d="M6 18h12" />
                              </svg>
                              {t(T.capsLockOn, isRtl)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] font-medium transition-colors"
                        style={{ color: "var(--color-muted)" }}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? t(T.hide, isRtl) : t(T.show, isRtl)
                        }
                      >
                        {showPassword ? t(T.hide, isRtl) : t(T.show, isRtl)}
                      </button>
                    </div>

                    {!isLogin && <PasswordStrength password={password} />}

                    <AnimatePresence>
                      {!isLogin && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4"
                        >
                          <FloatingInput
                            id="confirm-password"
                            label={t(T.confirmPassword, isRtl)}
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(v) => {
                              setConfirmPassword(v);
                              setConfirmError("");
                            }}
                            error={confirmError}
                            icon={
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <rect
                                  x="3"
                                  y="11"
                                  width="18"
                                  height="11"
                                  rx="2"
                                  ry="2"
                                />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Remember Me (login only) */}
                  <AnimatePresence>
                    {isLogin && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center px-1"
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <div
                            onClick={() => setRememberMe(!rememberMe)}
                            className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                            style={{
                              border: `1.5px solid ${rememberMe ? "var(--color-primary)" : "var(--color-border)"}`,
                              background: rememberMe
                                ? "var(--color-primary)"
                                : "transparent",
                            }}
                          >
                            {rememberMe && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {t(T.rememberMe, isRtl)}
                          </span>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          [isRtl ? "x" : "x"]: isRtl ? 8 : -8,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          [isRtl ? "x" : "x"]: isRtl ? 8 : -8,
                        }}
                        className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                          color: "var(--color-danger)",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="shrink-0"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <RippleButton
                    type="submit"
                    loading={formLoading}
                    disabled={formLoading}
                  >
                    {isLogin ? (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        {t(T.signInBtn, isRtl)}
                      </>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t(T.createAccountBtn, isRtl)}
                      </>
                    )}
                  </RippleButton>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Toggle mode */}
            <motion.div
              {...formFadeProps}
              transition={{ ...formFadeProps.transition, delay: 0.35 }}
              className="mt-7 text-center"
            >
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                {isLogin ? t(T.noAccount, isRtl) : t(T.haveAccount, isRtl)}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold transition-colors hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  {isLogin ? t(T.signUp, isRtl) : t(T.signIn, isRtl)}
                </button>
              </p>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-auto pt-6 border-t text-center px-2"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                {t(T.terms, isRtl)}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
