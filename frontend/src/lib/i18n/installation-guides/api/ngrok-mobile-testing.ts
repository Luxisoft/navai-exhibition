import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideValue } from "../helpers";

type ApiNgrokMobileTestingCopy = {
  bullets: string[];
  labels: {
    exposeApi: string;
    mobileFlow: string;
  };
  flow: string;
};

const API_NGROK_COMMAND = "ngrok http 3000";

const API_NGROK_MOBILE_TESTING_COPY: Partial<
  Record<LanguageCode, ApiNgrokMobileTestingCopy>
> = {
  es: {
    bullets: [
      "`localhost` solo sirve para `curl` u otras herramientas que corren en la misma maquina. Para pruebas mobile reales, exponga el backend con `ngrok http 3000`.",
      "Copie la URL HTTPS que entrega ngrok y usela como base URL de la app mobile en lugar de `localhost`.",
      "Mantenga el backend y el tunel de ngrok activos mientras valida la sesion de voz en el telefono.",
    ],
    labels: {
      exposeApi: "Exponer la API local con ngrok",
      mobileFlow: "Flujo de prueba mobile",
    },
    flow:
      "1. Mantenga el backend corriendo en el puerto 3000.\n2. Ejecute `ngrok http 3000`.\n3. Copie la URL HTTPS publica que muestra ngrok.\n4. Expo Router: use esa URL en `.env` para `EXPO_PUBLIC_NAVAI_API_URL` y `NAVAI_API_URL`.\n5. React Native CLI: use esa URL en `src/ai/env.ts` para `NAVAI_API_URL`.",
  },
  en: {
    bullets: [
      "`localhost` only works for `curl` or tools running on the same machine. For real mobile tests, expose the backend with `ngrok http 3000`.",
      "Copy the HTTPS forwarding URL from ngrok and use it as the mobile app base URL instead of `localhost`.",
      "Keep the backend server and the ngrok tunnel running while you validate the voice session on the phone.",
    ],
    labels: {
      exposeApi: "Expose the local API with ngrok",
      mobileFlow: "Mobile test flow",
    },
    flow:
      "1. Keep the backend running on port 3000.\n2. Run `ngrok http 3000`.\n3. Copy the public HTTPS URL shown by ngrok.\n4. Expo Router: use that URL in `.env` for `EXPO_PUBLIC_NAVAI_API_URL` and `NAVAI_API_URL`.\n5. React Native CLI: use that URL in `src/ai/env.ts` for `NAVAI_API_URL`.",
  },
  pt: {
    bullets: [
      "`localhost` so funciona para `curl` ou ferramentas rodando na mesma maquina. Para testes mobile reais, exponha o backend com `ngrok http 3000`.",
      "Copie a URL HTTPS gerada pelo ngrok e use-a como base URL do app mobile no lugar de `localhost`.",
      "Mantenha o backend e o tunel do ngrok ativos enquanto valida a sessao de voz no telefone.",
    ],
    labels: {
      exposeApi: "Expor a API local com ngrok",
      mobileFlow: "Fluxo de teste mobile",
    },
    flow:
      "1. Mantenha o backend rodando na porta 3000.\n2. Execute `ngrok http 3000`.\n3. Copie a URL HTTPS publica mostrada pelo ngrok.\n4. Expo Router: use essa URL no `.env` para `EXPO_PUBLIC_NAVAI_API_URL` e `NAVAI_API_URL`.\n5. React Native CLI: use essa URL em `src/ai/env.ts` para `NAVAI_API_URL`.",
  },
  fr: {
    bullets: [
      "`localhost` ne fonctionne que pour `curl` ou les outils qui tournent sur la meme machine. Pour des tests mobile reels, exposez le backend avec `ngrok http 3000`.",
      "Copiez l'URL HTTPS fournie par ngrok et utilisez-la comme URL de base de l'application mobile a la place de `localhost`.",
      "Gardez le backend et le tunnel ngrok actifs pendant la validation de la session vocale sur le telephone.",
    ],
    labels: {
      exposeApi: "Exposer l'API locale avec ngrok",
      mobileFlow: "Flux de test mobile",
    },
    flow:
      "1. Gardez le backend en cours d'execution sur le port 3000.\n2. Lancez `ngrok http 3000`.\n3. Copiez l'URL HTTPS publique affichee par ngrok.\n4. Expo Router : utilisez cette URL dans `.env` pour `EXPO_PUBLIC_NAVAI_API_URL` et `NAVAI_API_URL`.\n5. React Native CLI : utilisez cette URL dans `src/ai/env.ts` pour `NAVAI_API_URL`.",
  },
  hi: {
    bullets: [
      "`localhost` sirf usi machine par chalne wale `curl` ya tools ke liye kaam karta hai. Real mobile testing ke liye backend ko `ngrok http 3000` se expose karein.",
      "ngrok ki HTTPS URL copy karke mobile app ki base URL me `localhost` ki jagah use karein.",
      "Phone par voice session validate karte waqt backend aur ngrok tunnel dono chalu rakhein.",
    ],
    labels: {
      exposeApi: "ngrok se local API expose karein",
      mobileFlow: "Mobile test flow",
    },
    flow:
      "1. Backend ko port 3000 par chalu rakhein.\n2. `ngrok http 3000` chalayein.\n3. ngrok dikhai hui public HTTPS URL copy karein.\n4. Expo Router: us URL ko `.env` me `EXPO_PUBLIC_NAVAI_API_URL` aur `NAVAI_API_URL` ke liye use karein.\n5. React Native CLI: us URL ko `src/ai/env.ts` me `NAVAI_API_URL` ke liye use karein.",
  },
  ja: {
    bullets: [
      "`localhost` は `curl` や同じマシン上で動くツールでしか使えません。実機モバイル検証では `ngrok http 3000` で backend を公開してください。",
      "ngrok が出す HTTPS URL をコピーし、モバイルアプリの base URL として `localhost` の代わりに使ってください。",
      "端末で音声セッションを検証している間は backend と ngrok トンネルの両方を起動したままにしてください。",
    ],
    labels: {
      exposeApi: "ngrok でローカル API を公開",
      mobileFlow: "モバイル検証フロー",
    },
    flow:
      "1. backend をポート 3000 で起動したままにします。\n2. `ngrok http 3000` を実行します。\n3. ngrok が表示する公開 HTTPS URL をコピーします。\n4. Expo Router: その URL を `.env` の `EXPO_PUBLIC_NAVAI_API_URL` と `NAVAI_API_URL` に設定します。\n5. React Native CLI: その URL を `src/ai/env.ts` の `NAVAI_API_URL` に設定します。",
  },
  ko: {
    bullets: [
      "`localhost` 는 `curl` 이나 같은 장비에서 실행되는 도구에서만 동작합니다. 실제 모바일 테스트에서는 `ngrok http 3000` 으로 backend 를 노출하세요.",
      "ngrok 이 제공하는 HTTPS URL 을 복사해서 모바일 앱의 base URL 로 `localhost` 대신 사용하세요.",
      "휴대폰에서 음성 세션을 검증하는 동안 backend 와 ngrok 터널을 모두 켜 둬야 합니다.",
    ],
    labels: {
      exposeApi: "ngrok 으로 로컬 API 노출",
      mobileFlow: "모바일 테스트 흐름",
    },
    flow:
      "1. backend 를 3000 포트에서 실행한 상태로 둡니다.\n2. `ngrok http 3000` 을 실행합니다.\n3. ngrok 이 보여주는 공개 HTTPS URL 을 복사합니다.\n4. Expo Router: 그 URL 을 `.env` 의 `EXPO_PUBLIC_NAVAI_API_URL` 과 `NAVAI_API_URL` 에 넣습니다.\n5. React Native CLI: 그 URL 을 `src/ai/env.ts` 의 `NAVAI_API_URL` 에 넣습니다.",
  },
  ru: {
    bullets: [
      "`localhost` работает только для `curl` или инструментов, запущенных на той же машине. Для реальных мобильных тестов откройте backend через `ngrok http 3000`.",
      "Скопируйте HTTPS URL, который выдает ngrok, и используйте его как base URL мобильного приложения вместо `localhost`.",
      "Держите backend и туннель ngrok запущенными, пока проверяете голосовую сессию на телефоне.",
    ],
    labels: {
      exposeApi: "Открыть локальный API через ngrok",
      mobileFlow: "Сценарий мобильной проверки",
    },
    flow:
      "1. Оставьте backend запущенным на порту 3000.\n2. Выполните `ngrok http 3000`.\n3. Скопируйте публичный HTTPS URL, который показывает ngrok.\n4. Expo Router: используйте этот URL в `.env` для `EXPO_PUBLIC_NAVAI_API_URL` и `NAVAI_API_URL`.\n5. React Native CLI: используйте этот URL в `src/ai/env.ts` для `NAVAI_API_URL`.",
  },
  zh: {
    bullets: [
      "`localhost` 只适用于 `curl` 或运行在同一台机器上的工具。做真实移动端测试时，请用 `ngrok http 3000` 暴露 backend。",
      "复制 ngrok 提供的 HTTPS URL，并把它作为移动应用的 base URL，替换掉 `localhost`。",
      "在手机上验证语音会话期间，请同时保持 backend 和 ngrok 隧道处于运行状态。",
    ],
    labels: {
      exposeApi: "用 ngrok 暴露本地 API",
      mobileFlow: "移动端测试流程",
    },
    flow:
      "1. 保持 backend 在 3000 端口运行。\n2. 执行 `ngrok http 3000`。\n3. 复制 ngrok 显示的公网 HTTPS URL。\n4. Expo Router：把这个 URL 写到 `.env` 的 `EXPO_PUBLIC_NAVAI_API_URL` 和 `NAVAI_API_URL`。\n5. React Native CLI：把这个 URL 写到 `src/ai/env.ts` 的 `NAVAI_API_URL`。",
  },
};

export function withApiNgrokMobileTesting(
  tab: InstallationGuideTab,
  language: LanguageCode,
): InstallationGuideTab {
  const copy = getLocalizedInstallationGuideValue(
    API_NGROK_MOBILE_TESTING_COPY,
    language,
  );

  return {
    ...tab,
    sections: tab.sections.map((section) => {
      if (section.id !== "paso-6-probar-api") {
        return section;
      }

      return {
        ...section,
        bullets: [...(section.bullets ?? []), ...copy.bullets],
        codeBlocks: [
          ...(section.codeBlocks ?? []),
          {
            label: copy.labels.exposeApi,
            language: "bash",
            code: API_NGROK_COMMAND,
          },
          {
            label: copy.labels.mobileFlow,
            language: "text",
            code: copy.flow,
          },
        ],
      };
    }),
  };
}
