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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { buildBackendApiUrl } from "@/lib/backend-api";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { getLuxisoftWhatsAppLink } from "@/lib/luxisoft-contact";
import { cn } from "@/lib/utils";

type ContactFormState = {
  name: string;
  email: string;
  company: string;
  whatsapp: string;
  message: string;
};

type ImplementationContactCommandDetail = {
  action?: "open" | "prefill";
  values?: Partial<ContactFormState>;
  scroll?: boolean;
  focusName?: boolean;
};

const INITIAL_FORM_STATE: ContactFormState = {
  name: "",
  email: "",
  company: "",
  whatsapp: "",
  message: "",
};
const CONTACT_SECTION_ID = "contacto";
const CONTACT_FORM_ID = "implementation-contact-form";
const CONTACT_COMMAND_EVENT = "navai:implementation-contact-command";
const CONTACT_FIELD_IDS = {
  name: "implementation-contact-name",
  email: "implementation-contact-email",
  company: "implementation-contact-company",
  whatsapp: "implementation-contact-whatsapp",
  message: "implementation-contact-message",
} as const;

function readInitialCaptchaSiteKey() {
  if (typeof import.meta !== "undefined" && typeof import.meta.env.PUBLIC_HCAPTCHA_SITE_KEY === "string") {
    return import.meta.env.PUBLIC_HCAPTCHA_SITE_KEY;
  }

  if (typeof window !== "undefined") {
    const globalKey = (window as Window & { __NAVAI_HCAPTCHA_SITE_KEY__?: string })
      .__NAVAI_HCAPTCHA_SITE_KEY__;
    if (typeof globalKey === "string") {
      return globalKey;
    }
  }

  return "";
}

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
  const [captchaSize, setCaptchaSize] = useState<"normal" | "compact">("normal");
  const [siteKey, setSiteKey] = useState(readInitialCaptchaSiteKey);
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
    fetch(buildBackendApiUrl("/api/hcaptcha/site-key"), { cache: "no-store" })
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
    const mediaQuery = window.matchMedia("(max-width: 420px)");
    const syncCaptchaSize = () => {
      setCaptchaSize(mediaQuery.matches ? "compact" : "normal");
    };

    syncCaptchaSize();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncCaptchaSize);
      return () => mediaQuery.removeEventListener("change", syncCaptchaSize);
    }

    mediaQuery.addListener(syncCaptchaSize);
    return () => mediaQuery.removeListener(syncCaptchaSize);
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

    const contactSection = document.getElementById(CONTACT_SECTION_ID);
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const applyPartialValues = (values: Partial<ContactFormState> | undefined) => {
      if (!values || typeof values !== "object") {
        return;
      }
      setForm((current) => ({
        ...current,
        ...(typeof values.name === "string" ? { name: values.name } : {}),
        ...(typeof values.email === "string" ? { email: values.email } : {}),
        ...(typeof values.company === "string" ? { company: values.company } : {}),
        ...(typeof values.whatsapp === "string" ? { whatsapp: values.whatsapp } : {}),
        ...(typeof values.message === "string" ? { message: values.message } : {}),
      }));
    };

    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<ImplementationContactCommandDetail>).detail;
      if (!detail || typeof detail !== "object") {
        return;
      }

      if (detail.action !== "open" && detail.action !== "prefill") {
        return;
      }

      setIsFormOpen(true);
      setStatus((current) => (current === "success" ? "idle" : current));
      setErrors({});
      setCaptchaError(null);

      if (detail.action === "prefill") {
        applyPartialValues(detail.values);
      }

      if (detail.scroll !== false) {
        const contactSection = document.getElementById(CONTACT_SECTION_ID);
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      if (detail.focusName !== false) {
        window.requestAnimationFrame(() => {
          nameInputRef.current?.focus();
        });
      }
    };

    window.addEventListener(CONTACT_COMMAND_EVENT, handleCommand as EventListener);
    return () => window.removeEventListener(CONTACT_COMMAND_EVENT, handleCommand as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const maybeOpenFromHash = () => {
      const hashId = decodeURIComponent(window.location.hash.replace(/^#/, "").trim()).toLowerCase();
      if (hashId !== CONTACT_SECTION_ID) {
        return;
      }

      setIsFormOpen(true);
      setStatus((current) => (current === "success" ? "idle" : current));
      setCaptchaError(null);
    };

    maybeOpenFromHash();
    window.addEventListener("hashchange", maybeOpenFromHash);
    return () => window.removeEventListener("hashchange", maybeOpenFromHash);
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
        const response = await fetch(buildBackendApiUrl("/api/quote"), {
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
        <Button
          type="button"
          size="lg"
          className={cn("min-w-[13rem]", isFormOpen ? "border-primary/45 from-primary/14 to-primary/28" : undefined)}
          onClick={openForm}
          aria-pressed={isFormOpen}
        >
          {messages.implementationPage.ctaLabel}
        </Button>

        <Button
          asChild
          variant="success"
          size="icon"
          className="impl-whatsapp-icon-btn h-[2.58rem] w-[2.58rem] rounded-[0.65rem]"
        >
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={messages.implementationPage.whatsappButtonLabel}
            title={messages.implementationPage.whatsappButtonLabel}
          >
            <MessageCircle className="impl-whatsapp-icon" aria-hidden="true" />
          </a>
        </Button>
      </div>

      {isFormOpen ? (
        <>
          <Separator />
          <Card className="border-border/70 bg-card/55 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <form
                id={CONTACT_FORM_ID}
                className="impl-contact-form"
                onSubmit={handleSubmit}
                data-navai-contact-form="implementation"
                noValidate
              >
                <div className="impl-contact-grid">
                  <div className="impl-field">
                    <Label htmlFor={CONTACT_FIELD_IDS.name}>{messages.implementationPage.contactNameLabel}</Label>
                    <Input
                      ref={nameInputRef}
                      id={CONTACT_FIELD_IDS.name}
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name ? <small className="impl-field-error">{errors.name}</small> : null}
                  </div>

                  <div className="impl-field">
                    <Label htmlFor={CONTACT_FIELD_IDS.email}>{messages.implementationPage.contactEmailLabel}</Label>
                    <Input
                      id={CONTACT_FIELD_IDS.email}
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? <small className="impl-field-error">{errors.email}</small> : null}
                  </div>

                  <div className="impl-field">
                    <Label htmlFor={CONTACT_FIELD_IDS.company}>{messages.implementationPage.contactCompanyLabel}</Label>
                    <Input
                      id={CONTACT_FIELD_IDS.company}
                      name="company"
                      type="text"
                      value={form.company}
                      onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                    />
                  </div>

                  <div className="impl-field">
                    <Label htmlFor={CONTACT_FIELD_IDS.whatsapp}>{messages.implementationPage.contactWhatsappLabel}</Label>
                    <Input
                      id={CONTACT_FIELD_IDS.whatsapp}
                      name="whatsapp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="impl-field">
                  <Label htmlFor={CONTACT_FIELD_IDS.message}>{messages.implementationPage.contactMessageLabel}</Label>
                  <Textarea
                    id={CONTACT_FIELD_IDS.message}
                    name="message"
                    required
                    rows={5}
                    className="min-h-32 resize-y"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    aria-invalid={Boolean(errors.message)}
                  />
                  {errors.message ? <small className="impl-field-error">{errors.message}</small> : null}
                </div>

                <div className="impl-captcha-wrap">
                  <HCaptchaGate
                    sitekey={siteKey}
                    size={captchaSize}
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
                  <Button
                    type="submit"
                    size="lg"
                    data-navai-contact-submit="true"
                    disabled={status === "loading" || !isCaptchaVerified}
                    className="min-w-[13rem]"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="impl-spinner" aria-hidden="true" />
                        {messages.implementationPage.contactSendingLabel}
                      </>
                    ) : (
                      messages.implementationPage.contactSubmitLabel
                    )}
                  </Button>
                </div>

                {status === "success" ? (
                  <p className="impl-field-success" role="status">
                    {stripLeadingDecorativeText(messages.implementationPage.contactSuccessMessage)}
                  </p>
                ) : null}

                {status !== "success" && errors.form ? (
                  <p className="impl-field-error" role="alert">
                    {stripLeadingDecorativeText(errors.form)}
                  </p>
                ) : null}

                <p className="impl-contact-note">
                  {stripLeadingDecorativeText(messages.implementationPage.contactDisclaimer)}
                </p>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
