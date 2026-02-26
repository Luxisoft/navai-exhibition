'use client';

import { useI18n } from "@/i18n/provider";
import { getLocalizedNavaiExamples } from "@/i18n/examples-catalog";

export default function NavaiExamplesHome() {
  const { language } = useI18n();
  const examples = getLocalizedNavaiExamples(language);
  const content = examples.homePage;

  return (
    <div className="docs-markdown-body">
      <p className="docs-badge">{content.badge}</p>
      <h1>{content.title}</h1>
      <p>{content.description}</p>

      {content.sections.map((section) => (
        <section key={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.description}</p>
          {section.bullets ? (
            <ul>
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

