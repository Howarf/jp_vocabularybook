"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase, supabaseConfigurationMessage } from "@/src/lib/supabaseClient";
import VocabularyBookPreloader from "./VocabularyBookPreloader";
import styles from "./AuthGuard.module.css";

type AuthGuardProps = {
  children: ReactNode;
};

// 보호 페이지 접근 전 Supabase 인증 세션을 확인하고 비로그인 사용자를 로그인 페이지로 이동시킵니다.
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(isSupabaseConfigured);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedUserId, setAuthorizedUserId] = useState<string | null>(null);
  const guardMessage = isSupabaseConfigured
    ? "인증 상태를 확인하는 중입니다..."
    : supabaseConfigurationMessage;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    // 현재 브라우저 인증 세션을 확인하고 화면 접근 가능 여부를 갱신합니다.
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      setAuthorizedUserId(session.user.id);
      setIsCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthorized(false);
        setAuthorizedUserId(null);
        setIsCheckingSession(false);
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      setAuthorizedUserId(session.user.id);
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (isCheckingSession || !isAuthorized) {
    return (
      <main className={styles.page} aria-live="polite">
        <div className={styles.card}>{guardMessage}</div>
      </main>
    );
  }

  return (
    <>
      {authorizedUserId ? <VocabularyBookPreloader userId={authorizedUserId} /> : null}
      {children}
    </>
  );
}
