"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { serviceNames } from "@/lib/services";
import { useAuth } from "@/lib/auth-context";
import { FormSkeleton } from "@/components/ui/skeleton";

const serviceOptions = Object.values(serviceNames);
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from") || "/post-ad";
  const { setUser, setToken } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [service, setService] = useState<string>(serviceOptions[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP (shown inline below the email field)
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(OTP_TTL_SECONDS);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!otpSent) return;
    const timer = setInterval(() => {
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent]);

  useEffect(() => {
    if (!otpSent || resendIn <= 0) return;
    const cooldown = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(cooldown);
  }, [otpSent, resendIn]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchMode(next: "login" | "signup") {
    setError("");
    setOtpError("");
    resetOtp();
    setMode(next);
    setLoginMethod("password");
  }

  function resetOtp() {
    setOtpSent(false);
    setOtpEmail("");
    setDigits(["", "", "", "", "", ""]);
    setResendIn(0);
    setExpiresIn(OTP_TTL_SECONDS);
  }

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!paste) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) {
        next[i] = paste[i] ?? "";
      }
      return next;
    });
    digitRefs.current[5]?.focus();
  }

  // Send / resend the OTP for the signup email (reserves the email)
  async function handleSendCode(e?: React.MouseEvent) {
    e?.preventDefault();
    setOtpError("");
    setError("");
    if (resendIn > 0 || sending) return;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address to send the code.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/start-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Unable to send the code.");
        if (data.resendInMs) setResendIn(Math.ceil(data.resendInMs / 1000));
        setSending(false);
        return;
      }
      setOtpSent(true);
      setOtpEmail(email);
      setDigits(["", "", "", "", "", ""]);
      setExpiresIn(OTP_TTL_SECONDS);
      if (data.emailSent === false) {
        setOtpError(
          data.message ||
          "We couldn't send the code right now. Please check your email configuration and resend below."
        );
      } else {
        setResendIn(RESEND_COOLDOWN_SECONDS);
      }
      digitRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // Login (existing single form)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Something went wrong.");
        setBusy(false);
        return;
      }
      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);
      router.push(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // OTP Login (for users logging in or resetting via verified email)
  async function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOtpError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!otpSent || otpEmail !== email) {
      await handleSendCode();
      setError("We just sent a 6-digit verification code to your email. Enter it below to finish signing in.");
      return;
    }
    const otp = digits.join("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    setBusy(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || verifyData.message || "Invalid verification code.");
        setBusy(false);
        return;
      }
      if (verifyData.token) setToken(verifyData.token);
      if (verifyData.user) setUser(verifyData.user);
      router.push(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Signup: verify the OTP, then complete the account
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOtpError("");

    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpSent || otpEmail !== email) {
      await handleSendCode();
      setError("We just sent a 6-digit verification code to your email. Enter it below to finish creating your account.");
      return;
    }
    const otp = digits.join("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    setBusy(true);
    try {
      // 1) Verify the OTP to obtain a signup token
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(
          verifyData.error || verifyData.message || "Invalid verification code."
        );
        if (verifyData.resendInMs) setResendIn(Math.ceil(verifyData.resendInMs / 1000));
        setDigits(["", "", "", "", "", ""]);
        digitRefs.current[0]?.focus();
        return;
      }

      // If user is an existing verified user, log them in immediately!
      if (verifyData.user) {
        if (verifyData.token) setToken(verifyData.token);
        setUser(verifyData.user);
        router.push(returnTo);
        return;
      }

      if (!verifyData.signupToken) {
        setError("Verification failed. Please try sending a new code.");
        return;
      }

      // 2) Complete the account with the signup token
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          service,
          signupToken: verifyData.signupToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Something went wrong.");
        return;
      }
      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);
      router.push(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const expiresMins = Math.floor(expiresIn / 60);
  const expiresSecs = String(expiresIn % 60).padStart(2, "0");

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-10">
      <section className="w-full max-w-md rounded-[2rem] bg-gray-100/85 p-5 sm:p-8 shadow-lg shadow-gray-200/40">
        <div className="mb-6 flex gap-2">
          <Button
            variant="soft"
            active={mode === "login"}
            onClick={() => switchMode("login")}
            className={mode === "login" ? "!text-white" : "!text-black"}
          >
            Login
          </Button>
          <Button
            variant="soft"
            active={mode === "signup"}
            onClick={() => switchMode("signup")}
            className={mode === "signup" ? "!text-white" : "!text-black"}
          >
            Sign up
          </Button>
        </div>

        <h1 className="text-2xl font-black text-gray-950">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-gray-900">
          {mode === "login"
            ? "Log in to manage your ads and profile."
            : "Enter your details, verify your email, and create your account."}
        </p>

        <form
          onSubmit={
            mode === "signup"
              ? handleSignup
              : loginMethod === "otp"
              ? handleOtpLogin
              : handleLogin
          }
          className="mt-6 space-y-4"
        >
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Name
              </label>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (otpSent && otpEmail !== e.target.value) resetOtp();
                }}
                placeholder="you@example.com"
                className="flex-1 min-w-0"
                required
              />
              {(mode === "signup" || loginMethod === "otp") && (
                <Button
                  type="button"
                  variant={otpSent ? "soft" : "solid"}
                  size="sm"
                  disabled={sending || resendIn > 0}
                  onClick={(e) => handleSendCode(e as unknown as React.MouseEvent)}
                  className="!text-white whitespace-nowrap w-full sm:w-auto shrink-0"
                >
                  {sending
                    ? "Sending..."
                    : resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : otpSent
                    ? "Resend Code"
                    : "Send Code"}
                </Button>
              )}
            </div>
            {(mode === "signup" || loginMethod === "otp") && (
              <div className="mt-1.5">
                {otpSent ? (
                  <p className="text-xs font-semibold text-gray-700">
                    ✓ Code sent to {otpEmail}. Check your inbox or spam folder.
                  </p>
                ) : (
                  <p className="text-xs text-gray-800">
                    Click <strong>&quot;Send Code&quot;</strong> to receive your 6-digit verification code.
                  </p>
                )}
                {otpError && (
                  <p className="mt-1 text-xs font-semibold text-gray-600">
                    {otpError}
                  </p>
                )}
              </div>
            )}
          </div>

          {(mode === "signup" || loginMethod === "otp") && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Enter verification code
              </label>
              <div className="flex justify-between gap-1 sm:gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={(e) => handleDigitPaste(index, e)}
                    aria-label={`Digit ${index + 1}`}
                    className="h-12 w-9 sm:h-14 sm:w-12 rounded-xl sm:rounded-[20px] border border-gray-200 bg-gray-50 text-center text-xl sm:text-2xl font-bold text-gray-950 outline-none placeholder:text-gray-300 focus:border-gray-500"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-900">
                {expiresIn > 0 ? (
                  <span>
                    Code expires in:{" "}
                    <span className="font-semibold">
                      {expiresMins}:{expiresSecs}
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-gray-700">
                    This code has expired.
                  </span>
                )}
                <span aria-hidden="true">•</span>
                {sending ? (
                  <span>Sending...</span>
                ) : resendIn > 0 ? (
                  <span>Resend in {resendIn}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e as unknown as React.MouseEvent)}
                    className="font-semibold text-gray-600 underline underline-offset-2 hover:text-gray-700"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {(mode === "signup" || (mode === "login" && loginMethod === "password")) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("otp");
                      setError("");
                      resetOtp();
                    }}
                    className="text-xs font-medium text-gray-600 hover:text-gray-950 underline underline-offset-2"
                  >
                    Forgot password? Sign in with OTP
                  </button>
                )}
              </div>
              <div className="relative">
                <TextInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {mode === "login" && loginMethod === "otp" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setError("");
                  resetOtp();
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-950 underline underline-offset-2"
              >
                Sign in with password instead
              </button>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Confirm Password
              </label>
              <div className="relative">
                <TextInput
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Service
              </label>
              <div ref={serviceRef} className="relative">
                <button
                  type="button"
                  onClick={() => setServiceOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={serviceOpen}
                  className="flex w-full items-center justify-between rounded-[20px] border border-gray-200 bg-gray-50 px-4 py-3 text-left text-gray-950 outline-none focus:border-gray-500"
                >
                  <span>{service}</span>
                  <span
                    className={`text-gray-700 transition-transform ${
                      serviceOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                {serviceOpen && (
                  <ul
                    role="listbox"
                    className="absolute z-20 mt-1 w-full overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-lg"
                  >
                    {serviceOptions.map((name) => (
                      <li
                        key={name}
                        role="option"
                        aria-selected={service === name}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setService(name);
                          setServiceOpen(false);
                        }}
                        onClick={() => {
                          setService(name);
                          setServiceOpen(false);
                        }}
                        className={`cursor-pointer px-4 py-3 text-gray-950 hover:bg-gray-100 ${
                          service === name ? "bg-gray-50 font-semibold" : ""
                        }`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {otpSent && otpError && (
            <p className="text-sm font-medium text-gray-700" role="alert">
              {otpError}
            </p>
          )}
          {error && (
            <p className="text-sm font-medium text-gray-700" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="solid"
            fullWidth
            disabled={busy}
            loading={busy}
            loadingText={
              mode === "login"
                ? loginMethod === "otp"
                  ? "Verifying..."
                  : "Logging in..."
                : "Creating account..."
            }
            className="!text-white"
          >
            {mode === "login"
              ? loginMethod === "otp"
                ? "Verify & Log in"
                : "Log in"
              : "Create account"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-10">
          <FormSkeleton fields={3} />
        </main>
      }
    >
      <AuthPage />
    </Suspense>
  );
}
