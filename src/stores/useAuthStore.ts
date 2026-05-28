import { create } from "zustand";

type AuthState = {
  loginId: string;
  loginPassword: string;
  signupId: string;
  signupPassword: string;
  signupPasswordConfirm: string;
  nickname: string;
  isLoading: boolean;
  errorMessage: string;
  successMessage: string;
};

type AuthActions = {
  setLoginId: (loginId: string) => void;
  setLoginPassword: (loginPassword: string) => void;
  setSignupId: (signupId: string) => void;
  setSignupPassword: (signupPassword: string) => void;
  setSignupPasswordConfirm: (signupPasswordConfirm: string) => void;
  setNickname: (nickname: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setErrorMessage: (errorMessage: string) => void;
  setSuccessMessage: (successMessage: string) => void;
  resetLoginForm: () => void;
  resetSignupForm: () => void;
  resetMessages: () => void;
  resetAllAuthState: () => void;
};

const initialState: AuthState = {
  loginId: "",
  loginPassword: "",
  signupId: "",
  signupPassword: "",
  signupPasswordConfirm: "",
  nickname: "",
  isLoading: false,
  errorMessage: "",
  successMessage: "",
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,
  // 로그인 아이디 입력값을 저장합니다.
  setLoginId: (loginId) => set({ loginId }),
  // 로그인 비밀번호 입력값을 저장합니다.
  setLoginPassword: (loginPassword) => set({ loginPassword }),
  // 회원가입 아이디 입력값을 저장합니다.
  setSignupId: (signupId) => set({ signupId }),
  // 회원가입 비밀번호 입력값을 저장합니다.
  setSignupPassword: (signupPassword) => set({ signupPassword }),
  // 회원가입 비밀번호 확인 입력값을 저장합니다.
  setSignupPasswordConfirm: (signupPasswordConfirm) =>
    set({ signupPasswordConfirm }),
  // 회원가입 닉네임 입력값을 저장합니다.
  setNickname: (nickname) => set({ nickname }),
  // 인증 요청의 로딩 상태를 저장합니다.
  setIsLoading: (isLoading) => set({ isLoading }),
  // 인증 화면에 표시할 오류 메시지를 저장합니다.
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  // 인증 화면에 표시할 성공 메시지를 저장합니다.
  setSuccessMessage: (successMessage) => set({ successMessage }),
  // 로그인 폼 입력값과 메시지를 초기화합니다.
  resetLoginForm: () =>
    set({ loginId: "", loginPassword: "", errorMessage: "", successMessage: "" }),
  // 회원가입 폼 입력값과 메시지를 초기화합니다.
  resetSignupForm: () =>
    set({
      signupId: "",
      signupPassword: "",
      signupPasswordConfirm: "",
      nickname: "",
      errorMessage: "",
      successMessage: "",
    }),
  // 인증 화면의 오류 및 성공 메시지를 초기화합니다.
  resetMessages: () => set({ errorMessage: "", successMessage: "" }),
  // 인증 폼 입력값과 메시지 및 로딩 상태를 모두 초기화합니다.
  resetAllAuthState: () => set(initialState),
}));
