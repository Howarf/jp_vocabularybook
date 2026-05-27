"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import PublicOnlyGuard from "@/src/components/PublicOnlyGuard";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabaseClient";
import { useAuthStore } from "@/src/stores/useAuthStore";
import styles from "./signup.module.css";

// 사용자가 새 계정을 만들고 프로필을 저장할 수 있는 회원가입 화면을 렌더링합니다.
export default function SignupPage() {
  const router = useRouter();
  const {
    signupId,
    signupPassword,
    signupPasswordConfirm,
    nickname,
    isLoading,
    errorMessage,
    successMessage,
    setSignupId,
    setSignupPassword,
    setSignupPasswordConfirm,
    setNickname,
    setIsLoading,
    setErrorMessage,
    resetMessages,
    resetSignupForm,
  } = useAuthStore();

  // 회원가입 폼 제출을 검증하고 Supabase 계정 및 프로필 생성을 처리합니다.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase URL과 publishable key 환경변수를 설정해 주세요.");
      return;
    }

    if (!signupId.trim() || !signupPassword || !signupPasswordConfirm) {
      setErrorMessage("아이디, 비밀번호, 비밀번호 확인을 모두 입력해 주세요.");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setErrorMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupId.trim(),
      password: signupPassword,
      options: {
        data: {
          nickname: nickname.trim(),
        },
      },
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (typeof userId !== "string" || !userId) {
      setIsLoading(false);
      console.error("회원가입 응답에 유효한 사용자 ID가 없습니다.", {
        hasUser: Boolean(data.user),
        userIdType: typeof userId,
      });
      setErrorMessage(
        "회원가입 계정은 생성되었지만 사용자 정보를 확인하지 못했습니다. 로그인 후 다시 시도해 주세요.",
      );
      return;
    }

    const now = new Date().toISOString();
    const {} = await supabase.from("profiles").upsert(
      {
        id: userId,
        display_name: nickname.trim(),
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    setIsLoading(false);

    resetSignupForm();
    router.push("/login");
  };

  return (
    <PublicOnlyGuard>
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="signup-title">
          <p className={styles.eyebrow}>Create account</p>
          <h1 id="signup-title" className={styles.title}>
            회원가입
          </h1>
          <p className={styles.description}>
            계정을 만들고 일본어 단어 학습을 준비하세요.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="signup-id">
              아이디
              <input
                id="signup-id"
                className={styles.input}
                type="email"
                value={signupId}
                onChange={(event) => setSignupId(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
              />
            </label>

            <label className={styles.label} htmlFor="signup-password">
              비밀번호
              <input
                id="signup-password"
                className={styles.input}
                type="password"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="new-password"
              />
            </label>

            <label className={styles.label} htmlFor="signup-password-confirm">
              비밀번호 확인
              <input
                id="signup-password-confirm"
                className={styles.input}
                type="password"
                value={signupPasswordConfirm}
                onChange={(event) => setSignupPasswordConfirm(event.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
            </label>

            <label className={styles.label} htmlFor="nickname">
              닉네임
              <input
                id="nickname"
                className={styles.input}
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="표시할 닉네임"
                autoComplete="nickname"
              />
            </label>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
            {successMessage ? (
              <p className={styles.success}>{successMessage}</p>
            ) : null}

            <button className={styles.button} type="submit" disabled={isLoading}>
              {isLoading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className={styles.helper}>
            이미 계정이 있나요? <Link href="/login">로그인</Link>
          </p>
        </section>
      </main>
    </PublicOnlyGuard>
  );
}
