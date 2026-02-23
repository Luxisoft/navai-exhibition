'use client';

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { forwardRef, useImperativeHandle, useRef } from "react";

export type HCaptchaGateRef = {
  reset: () => void;
};

type HCaptchaGateProps = {
  sitekey: string;
  size?: "normal" | "compact" | "invisible";
  theme?: "light" | "dark";
  onTokenChange: (token: string | null, ekey?: string | null) => void;
  onReadyChange?: (ready: boolean) => void;
  onError?: (message: string) => void;
};

const HCaptchaGate = forwardRef<HCaptchaGateRef, HCaptchaGateProps>(function HCaptchaGate(
  { sitekey, size = "normal", theme = "dark", onTokenChange, onReadyChange, onError },
  ref
) {
  const captchaRef = useRef<HCaptcha | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      captchaRef.current?.resetCaptcha?.();
    },
  }));

  if (!sitekey) {
    onReadyChange?.(false);
    return null;
  }

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={sitekey}
      size={size}
      theme={theme}
      onLoad={() => onReadyChange?.(true)}
      onVerify={(token, ekey) => {
        onTokenChange(token, ekey ?? null);
      }}
      onExpire={() => {
        onTokenChange(null, null);
      }}
      onError={(event) => {
        onReadyChange?.(false);
        onTokenChange(null, null);
        const message = typeof event === "string" ? event : "hCaptcha error.";
        onError?.(message);
      }}
    />
  );
});

export default HCaptchaGate;
