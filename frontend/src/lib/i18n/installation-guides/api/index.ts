import type {
  InstallationGuideContent,
  InstallationGuideTab,
  LanguageCode,
} from "@/lib/i18n/messages";

import {
  buildInstallationGuide,
  type InstallationGuideTabsSectionLocale,
} from "../helpers";
import { getApiNestjsGuideTab } from "./installation-guide-nestjs";
import { getApiNodejsGuideTab } from "./installation-guide-nodejs";
import { getApiTypescriptGuideTab } from "./installation-guide-typescript";

const API_INSTALLATION_GUIDE_TABS_SECTION: Partial<
  Record<LanguageCode, InstallationGuideTabsSectionLocale>
> = {
  en: {
    id: "variantes-rapidas-por-stack",
    title: "Choose your base stack",
    description:
      "Pick the route that matches your backend. Every step below updates to the selected stack so you can follow one path from project creation to the first NAVAI request.",
    bullets: [
      "Use Node.js + Express if you want the quickest first deployment.",
      "Switch tabs before copying files so the commands and file names stay aligned.",
    ],
  },
  fr: {
    id: "variantes-rapidas-por-stack",
    title: "Choisissez votre stack de base",
    description:
      "Choisissez la route qui correspond à votre backend. Toutes les étapes ci-dessous se mettent à jour selon la stack sélectionnée afin que vous puissiez suivre un seul parcours, de la création du projet à la première requête NAVAI.",
    bullets: [
      "Utilisez Node.js + Express si vous voulez le premier déploiement le plus rapide.",
      "Changez d'onglet avant de copier les fichiers pour garder les commandes et les noms alignés.",
    ],
  },
  es: {
    id: "variantes-rapidas-por-stack",
    title: "Elegir stack base",
    description: "",
  },
  pt: {
    id: "variantes-rapidas-por-stack",
    title: "Escolha sua stack base",
    description:
      "Escolha o caminho que mais combina com seu backend. Cada etapa abaixo é atualizada conforme a stack selecionada para que você siga um único fluxo, desde a criação do projeto até a primeira requisição NAVAI.",
    bullets: [
      "Use Node.js + Express se quiser a rota mais rápida para a primeira implantação.",
      "Troque de aba antes de copiar os arquivos para manter comandos e nomes alinhados.",
    ],
  },
  zh: {
    id: "variantes-rapidas-por-stack",
    title: "选择基础技术栈",
    description:
      "选择最适合您后端的路线。下面的每一步都会根据所选技术栈更新，这样您就可以从创建项目一路跟到第一次 NAVAI 请求。",
    bullets: [
      "如果您想最快完成第一次部署，请使用 Node.js + Express。",
      "复制文件之前先切换标签，以保持命令和文件名一致。",
    ],
  },
  ja: {
    id: "variantes-rapidas-por-stack",
    title: "ベーススタックを選択",
    description:
      "あなたのバックエンドに最も合うルートを選んでください。以下の各ステップは選択したスタックに合わせて更新されるため、プロジェクト作成から最初の NAVAI リクエストまで 1 つの流れで進められます。",
    bullets: [
      "最初のデプロイを最短で成功させたいなら Node.js + Express を使ってください。",
      "コマンド名とファイル名を揃えるため、ファイルをコピーする前にタブを切り替えてください。",
    ],
  },
  ru: {
    id: "variantes-rapidas-por-stack",
    title: "Выберите базовый стек",
    description:
      "Выберите путь, который лучше всего подходит вашему backend. Все шаги ниже обновляются в зависимости от выбранного стека, чтобы вы могли пройти один сценарий от создания проекта до первого запроса NAVAI.",
    bullets: [
      "Используйте Node.js + Express, если хотите самый быстрый первый запуск.",
      "Переключайте вкладку до копирования файлов, чтобы команды и имена файлов оставались согласованными.",
    ],
  },
  ko: {
    id: "variantes-rapidas-por-stack",
    title: "기본 스택 선택",
    description:
      "백엔드에 맞는 경로를 선택하세요. 아래 단계는 선택한 스택에 따라 업데이트되므로 프로젝트 생성부터 첫 NAVAI 요청까지 하나의 흐름으로 따라갈 수 있습니다.",
    bullets: [
      "가장 빠르게 첫 배포를 하고 싶다면 Node.js + Express를 사용하세요.",
      "파일을 복사하기 전에 탭을 바꿔 현재 스택에 맞는 명령과 파일명을 확인하세요.",
    ],
  },
  hi: {
    id: "variantes-rapidas-por-stack",
    title: "अपना बेस स्टैक चुनें",
    description:
      "अपने बैकएंड से मेल खाने वाला रास्ता चुनें। नीचे के चरण चुने गए स्टैक के अनुसार अपडेट होते हैं ताकि आप प्रोजेक्ट बनाने से पहली NAVAI request तक एक ही प्रवाह का पालन कर सकें।",
    bullets: [
      "अगर आप सबसे तेज़ पहला deployment चाहते हैं तो Node.js + Express चुनें।",
      "फ़ाइलें कॉपी करने से पहले टैब बदलें ताकि commands और file names सही stack के साथ मेल खाते रहें।",
    ],
  },
};

const API_FINAL_CONNECTION_SECTION_ID = "paso-7-conectar-web-o-mobile";

function removeApiFinalConnectionSection(
  tab: InstallationGuideTab,
): InstallationGuideTab {
  return {
    ...tab,
    sections: tab.sections.filter(
      (section) => section.id !== API_FINAL_CONNECTION_SECTION_ID,
    ),
  };
}

export function getLocalizedApiInstallationGuide(
  language: LanguageCode,
): InstallationGuideContent {
  return buildInstallationGuide(API_INSTALLATION_GUIDE_TABS_SECTION, language, [
    getApiNodejsGuideTab(language),
    getApiTypescriptGuideTab(language),
    getApiNestjsGuideTab(language),
  ].map(removeApiFinalConnectionSection));
}
