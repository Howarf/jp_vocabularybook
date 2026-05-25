"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import styles from "./AuthGuard.module.css";

type AuthGuardProps = {
  children: ReactNode;
};

// 보호 페이지 접근 전 Supabase 인증 세션을 확인하고 비로그인 사용자를 로그인 페이지로 이동시킵니다.
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
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
      setIsCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthorized(false);
        setIsCheckingSession(false);
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
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
        <div className={styles.card}>인증 상태를 확인하는 중입니다...</div>
      </main>
    );
  }

  return children;
}
