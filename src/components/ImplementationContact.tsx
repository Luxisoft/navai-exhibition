'use client';

import { Loader2, MessageCircle } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import HCaptchaGate, { type HCaptchaGateRef } from "@/components/security/HCaptchaGate";
import { useI18n } from "@/i18n/provider";
import { getLuxisoftWhatsAppLink } from "@/lib/luxisoft-contact";

type ContactFormState = {
  name: string;
  email: string;
  company: string;
  whatsapp: string;
  message: string;
};

const INITIAL_FORM_STATE: ContactFormState = {
  name: "",
  email: "",
  company: "",
  whatsapp: "",
  message: "",
};

type SubmitStatus = "idle" | "loading" | "success";

export default function ImplementationContact() {
  const { language, messages } = useI18n();

  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM_STATE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaEkey, setCaptchaEkey] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaTheme, setCaptchaTheme] = useState<"light" | "dark">("dark");
  const [siteKey, setSiteKey] = useState(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "");
  const captchaRef = useRef<HCaptchaGateRef | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const whatsappLink = useMemo(() => {
    return getLuxisoftWhatsAppLink(messages.implementationPage.whatsappPrefill);
  }, [messages.implementationPage.whatsappPrefill]);

  useEffect(() => {
    if (siteKey) {
      return;
    }

    let mounted = true;
    fetch("/api/hcaptcha/site-key", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { siteKey?: string };
        if (mounted && data.siteKey) {
          setSiteKey(data.siteKey);
        }
      })
      .catch(() => {
        // Ignore fetch errors and let validation report missing captcha setup.
      });

    return () => {
      mounted = false;
    };
  }, [siteKey]);

  useEffect(() => {
    const setThemeFromDom = () => {
      const theme = document.documentElement.dataset.theme;
      setCaptchaTheme(theme === "light" ? "light" : "dark");
    };

    setThemeFromDom();

    const observer = new MutationObserver(setThemeFromDom);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isFormOpen]);

  const openForm = useCallback(() => {
    setIsFormOpen(true);
    setStatus((current) => (current === "success" ? "idle" : current));
    setErrors({});
    setCaptchaError(null);

    const contactSection = document.getElementById("contacto");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const validate = useCallback(() => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = messages.implementationPage.contactNameRequiredMessage;
    }

    if (!form.email.trim()) {
      nextErrors.email = messages.implementationPage.contactEmailRequiredMessage;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = messages.implementationPage.contactEmailInvalidMessage;
    }

    if (!form.message.trim()) {
      nextErrors.message = messages.implementationPage.contactMessageRequiredMessage;
    }

    return nextErrors;
  }, [
    form.email,
    form.message,
    form.name,
    messages.implementationPage.contactEmailInvalidMessage,
    messages.implementationPage.contactEmailRequiredMessage,
    messages.implementationPage.contactMessageRequiredMessage,
    messages.implementationPage.contactNameRequiredMessage,
  ]);

  const isCaptchaVerified = Boolean(siteKey && captchaReady && captchaToken && !captchaError);

  const resetCaptcha = useCallback(() => {
    captchaRef.current?.reset();
    setCaptchaToken(null);
    setCaptchaEkey(null);
    setCaptchaReady(false);
    setCaptchaError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors = validate();
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return;
      }

      if (!siteKey) {
        setErrors({ captcha: messages.implementationPage.contactCaptchaConfigMessage });
        return;
      }

      if (!captchaReady) {
        setErrors({ captcha: messages.implementationPage.contactCaptchaNotReadyMessage });
        return;
      }

      if (!captchaToken) {
        setErrors({ captcha: messages.implementationPage.contactCaptchaRequiredMessage });
        return;
      }

      if (captchaError) {
        setErrors({ captcha: captchaError });
        return;
      }

      setStatus("loading");

      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            company: form.company.trim(),
            whatsapp: form.whatsapp.trim(),
            message: form.message.trim(),
            language,
            hcaptchaToken: captchaToken,
            hcaptchaEkey: captchaEkey,
          }),
        });

        if (!response.ok) {
          throw new Error("quote_request_failed");
        }

        setStatus("success");
        setForm(INITIAL_FORM_STATE);
        setErrors({});
      } catch {
        setStatus("idle");
        setErrors({ form: messages.implementationPage.contactErrorMessage });
      } finally {
        resetCaptcha();
      }
    },
    [
      captchaEkey,
      captchaReady,
      captchaToken,
      form.company,
      form.email,
      form.message,
      form.name,
      form.whatsapp,
      language,
      messages.implementationPage.contactCaptchaConfigMessage,
      messages.implementationPage.contactCaptchaNotReadyMessage,
      messages.implementationPage.contactCaptchaRequiredMessage,
      messages.implementationPage.contactErrorMessage,
      resetCaptcha,
      siteKey,
      validate,
      captchaError,
    ]
  );

  return (
    <div className="impl-contact-wrap">
      <div className="impl-contact-top-actions">
        <button type="button" className="docs-cta-btn" onClick={openForm}>
          {messages.implementationPage.ctaLabel}
        </button>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer noopener"
          className="impl-whatsapp-icon-btn"
          aria-label={messages.implementationPage.whatsappButtonLabel}
          title={messages.implementationPage.whatsappButtonLabel}
        >
          <MessageCircle className="impl-whatsapp-icon" aria-hidden="true" />
        </a>
      </div>

      {isFormOpen ? (
        <form className="impl-contact-form" onSubmit={handleSubmit} noValidate>
          <label className="impl-field">
            <span>{messages.implementationPage.contactNameLabel}</span>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <small className="impl-field-error">{errors.name}</small> : null}
          </label>

          <label className="impl-field">
            <span>{messages.implementationPage.contactEmailLabel}</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <small className="impl-field-error">{errors.email}</small> : null}
          </label>

          <label className="impl-field">
            <span>{messages.implementationPage.contactCompanyLabel}</span>
            <input
              type="text"
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
            />
          </label>

          <label className="impl-field">
            <span>{messages.implementationPage.contactWhatsappLabel}</span>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
            />
          </label>

          <label className="impl-field">
            <span>{messages.implementationPage.contactMessageLabel}</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message ? <small className="impl-field-error">{errors.message}</small> : null}
          </label>

          <div className="impl-captcha-wrap">
            <HCaptchaGate
              sitekey={siteKey}
              size="normal"
              theme={captchaTheme}
              fallbackErrorMessage={messages.implementationPage.contactCaptchaGenericErrorMessage}
              onTokenChange={(tokenValue, ekeyValue) => {
                setCaptchaToken(tokenValue);
                setCaptchaEkey(ekeyValue || null);
                if (tokenValue) {
                  setCaptchaError(null);
                  setErrors((current) => {
                    if (!current.captcha) {
                      return current;
                    }
                    const next = { ...current };
                    delete next.captcha;
                    return next;
                  });
                }
              }}
              onReadyChange={(ready) => setCaptchaReady(ready)}
              onError={(message) => {
                setCaptchaError(message);
                setErrors((current) => ({ ...current, captcha: message }));
              }}
              ref={captchaRef}
            />
            {errors.captcha || captchaError ? (
              <small className="impl-field-error">{errors.captcha || captchaError}</small>
            ) : null}
          </div>

          <div className="impl-contact-actions">
            <button
              type="submit"
              className="docs-cta-btn"
              disabled={status === "loading" || !isCaptchaVerified}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="impl-spinner" aria-hidden="true" />
                  {messages.implementationPage.contactSendingLabel}
                </>
              ) : (
                messages.implementationPage.contactSubmitLabel
              )}
            </button>
          </div>

          {status === "success" ? (
            <p className="impl-field-success" role="status">
              {messages.implementationPage.contactSuccessMessage}
            </p>
          ) : null}

          {status !== "success" && errors.form ? (
            <p className="impl-field-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <p className="impl-contact-note">{messages.implementationPage.contactDisclaimer}</p>
        </form>
      ) : null}
    </div>
  );
}
