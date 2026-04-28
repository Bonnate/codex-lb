import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OauthDialog } from "@/features/accounts/components/oauth-dialog";

const idleState = {
  status: "idle" as const,
  method: null,
  authorizationUrl: null,
  callbackUrl: null,
  verificationUrl: null,
  userCode: null,
  deviceAuthId: null,
  intervalSeconds: null,
  expiresInSeconds: null,
  errorMessage: null,
};

const devicePendingState = {
  status: "pending" as const,
  method: "device" as const,
  authorizationUrl: null,
  callbackUrl: null,
  verificationUrl: "https://auth.example.com/device",
  userCode: "AAAA-BBBB",
  deviceAuthId: "device-auth-id",
  intervalSeconds: 5,
  expiresInSeconds: 120,
  errorMessage: null,
};

const browserPendingState = {
  status: "pending" as const,
  method: "browser" as const,
  authorizationUrl: "https://auth.example.com/authorize",
  callbackUrl: "http://127.0.0.1:1455/auth/callback",
  verificationUrl: null,
  userCode: null,
  deviceAuthId: null,
  intervalSeconds: null,
  expiresInSeconds: null,
  errorMessage: null,
};

const browserStartingState = {
  ...browserPendingState,
  status: "starting" as const,
};

const successState = {
  ...idleState,
  status: "success" as const,
};

const errorState = {
  ...idleState,
  status: "error" as const,
  errorMessage: "OAuth failed unexpectedly",
};

describe("OauthDialog", () => {
  it("renders intro stage with method selection and starts flow", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue(undefined);

    render(
      <OauthDialog
        open
        state={idleState}
        onOpenChange={vi.fn()}
        onStart={onStart}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("브라우저 (PKCE)")).toBeInTheDocument();
    expect(screen.getByText("디바이스 코드")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인 시작" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "로그인 시작" }));
    expect(onStart).toHaveBeenCalledWith("browser");
  });

  it("renders the account expiry date input when adding a new account", () => {
    const onExpiresOnChange = vi.fn();

    render(
      <OauthDialog
        open
        state={idleState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
        showExpiryInput
        expiresOn="2026-05-26"
        onExpiresOnChange={onExpiresOnChange}
      />,
    );

    const expiryInput = screen.getByLabelText("계정 만료일");
    expect(expiryInput).toHaveValue("2026-05-26");

    fireEvent.change(expiryInput, { target: { value: "2026-06-01" } });

    expect(onExpiresOnChange).toHaveBeenLastCalledWith("2026-06-01");
  });

  it("hides the account expiry date input when reauthenticating", () => {
    render(
      <OauthDialog
        open
        state={idleState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
        showExpiryInput={false}
        expiresOn="2026-05-26"
      />,
    );

    expect(screen.queryByLabelText("계정 만료일")).not.toBeInTheDocument();
  });

  it("renders device stage with user code and verification URL", () => {
    render(
      <OauthDialog
        open
        state={devicePendingState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("AAAA-BBBB")).toBeInTheDocument();
    expect(screen.getByText("https://auth.example.com/device")).toBeInTheDocument();
    expect(screen.getByText(/인증 대기 중/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "방식 변경" })).toBeInTheDocument();
  });

  it("renders success stage", () => {
    render(
      <OauthDialog
        open
        state={successState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("계정이 성공적으로 추가되었습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeInTheDocument();
  });

  it("renders error stage with message and retry option", () => {
    render(
      <OauthDialog
        open
        state={errorState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("OAuth failed unexpectedly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    // Dialog footer has both "닫기" and the dialog's X close button.
    const closeButtons = screen.getAllByRole("button", { name: /닫기|Close/ });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("submits the pasted callback URL through the manual callback handler", async () => {
    const user = userEvent.setup();
    const onManualCallback = vi.fn().mockResolvedValue(undefined);

    render(
      <OauthDialog
        open
        state={browserPendingState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={onManualCallback}
        onReset={vi.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("http://localhost:1455/auth/callback?code=...&state=..."),
      "http://localhost:1455/auth/callback?code=abc&state=expected",
    );
    await user.click(screen.getByRole("button", { name: "전송" }));

    expect(onManualCallback).toHaveBeenCalledWith(
      "http://localhost:1455/auth/callback?code=abc&state=expected",
    );
  });

  it("refreshes the browser authorization link without leaving the dialog", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue(undefined);

    render(
      <OauthDialog
        open
        state={browserPendingState}
        onOpenChange={vi.fn()}
        onStart={onStart}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "링크 새로고침" }));

    expect(onStart).toHaveBeenCalledWith("browser");
  });

  it("renders a disabled loading refresh state while generating a fresh browser link", () => {
    render(
      <OauthDialog
        open
        state={browserStartingState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "새로 고치는 중..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "방식 변경" })).toBeDisabled();
    expect(screen.getByText("새 로그인 링크를 만드는 중...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "복사" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인 페이지 열기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전송" })).toBeDisabled();
  });

  it("clears the pasted callback input when browser refresh disables the form", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <OauthDialog
        open
        state={browserPendingState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    const callbackInput = screen.getByPlaceholderText(
      "http://localhost:1455/auth/callback?code=...&state=...",
    );
    await user.type(callbackInput, "http://localhost:1455/auth/callback?code=abc&state=expected");
    expect(callbackInput).toHaveValue(
      "http://localhost:1455/auth/callback?code=abc&state=expected",
    );

    rerender(
      <OauthDialog
        open
        state={browserStartingState}
        onOpenChange={vi.fn()}
        onStart={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onManualCallback={vi.fn().mockResolvedValue(undefined)}
        onReset={vi.fn()}
      />,
    );

    expect(callbackInput).toHaveValue("");
    expect(callbackInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "전송" })).toBeDisabled();
  });
});
