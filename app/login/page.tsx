"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect } from "react";
import PublicOnlyGuard from "@/src/components/PublicOnlyGuard";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabaseClient";
import { useAuthStore } from "@/src/stores/useAuthStore";
import sharedStyles from "../shared.module.css";
import styles from "./login.module.css";

// 사용자가 Supabase 인증으로 로그인할 수 있는 화면을 렌더링합니다.
export default function LoginPage() {
  const router = useRouter();
  const {
    loginId,
    loginPassword,
    isLoading,
    errorMessage,
    successMessage,
    setLoginId,
    setLoginPassword,
    setIsLoading,
    setErrorMessage,
    setSuccessMessage,
    resetLoginForm,
    resetMessages,
  } = useAuthStore();

  useEffect(() => {
    resetLoginForm();
    resetMessages();
  }, [resetLoginForm, resetMessages]);

  // 로그인 폼 제출을 검증하고 Supabase 인증 요청을 처리합니다.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase URL과 publishable key 환경변수를 설정해 주세요.");
      return;
    }

    if (!loginId.trim() || !loginPassword) {
      setErrorMessage("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginId.trim(),
      password: loginPassword,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("로그인에 성공했습니다. 메인 페이지로 이동합니다.");
    router.push("/");
  };

  return (
    <PublicOnlyGuard>
      <main className={sharedStyles.authPage}>
        <section className={[sharedStyles.authCard, styles.card].join(" ")} aria-labelledby="login-title">
          <p className={sharedStyles.authEyebrow}>Welcome back</p>
          <h1 id="login-title" className={sharedStyles.authTitle}>
            로그인
          </h1>
          <p className={sharedStyles.authDescription}>
            가입한 아이디와 비밀번호로 일본어 단어장을 시작하세요.
          </p>

          <form className={sharedStyles.authForm} onSubmit={handleSubmit}>
            <label className={sharedStyles.authLabel} htmlFor="login-id">
              아이디
              <input
                id="login-id"
                className={sharedStyles.authInput}
                type="email"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
              />
            </label>

            <label className={sharedStyles.authLabel} htmlFor="login-password">
              비밀번호
              <input
                id="login-password"
                className={sharedStyles.authInput}
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </label>

            {errorMessage ? <p className={[sharedStyles.formMessage, sharedStyles.errorMessage].join(" ")}>{errorMessage}</p> : null}
            {successMessage ? (
              <p className={[sharedStyles.formMessage, sharedStyles.successMessage].join(" ")}>{successMessage}</p>
            ) : null}

            <button className={sharedStyles.primaryButton} type="submit" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className={sharedStyles.authHelper}>
            아직 계정이 없나요? <Link href="/signup">회원가입</Link>
          </p>
        </section>
      </main>
    </PublicOnlyGuard>
  );
}
