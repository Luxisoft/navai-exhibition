'use client';

import { useCallback, type ChangeEvent } from "react";

import { useI18n } from "@/lib/i18n/provider";
import type { LanguageCode } from "@/lib/i18n/messages";

type LanguageSwitcherProps = {
  compact?: boolean;
  selectId?: string;
  disabled?: boolean;
};

export default function LanguageSwitcher({
  compact = false,
  selectId,
  disabled = false,
}: LanguageSwitcherProps) {
  const { language, setLanguage, options, messages } = useI18n();
  const resolvedSelectId = selectId ?? "lang-select";
  const wrapperClassName = compact ? "lang-switcher is-compact" : "lang-switcher";

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setLanguage(event.target.value as LanguageCode);
    },
    [setLanguage]
  );

  return (
    <div className={wrapperClassName}>
      {!compact ? (
        <label htmlFor={resolvedSelectId} className="lang-switcher-label">
          {messages.common.languageLabel}
        </label>
      ) : null}
      <select
        id={resolvedSelectId}
        value={language}
        onChange={handleChange}
        className="lang-switcher-select"
        aria-label={messages.common.languageLabel}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
