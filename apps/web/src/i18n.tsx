import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PreferredLanguage } from "@munim/contracts";
import { currentLanguage, translate } from "./translations";
type LanguageContextValue = {
  language: PreferredLanguage;
  setLanguage: (language: PreferredLanguage) => void;
  t: (message: string, values?: Record<string, string | number>) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setCurrent] = useState<PreferredLanguage>(currentLanguage);
  const setLanguage = useCallback((next: PreferredLanguage) => {
    document.documentElement.lang = next;
    try {
      localStorage.setItem("munim-language", next);
    } catch {}
    setCurrent(next);
  }, []);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (message: string, values?: Record<string, string | number>) =>
        translate(language, message, values),
    }),
    [language, setLanguage],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("Use LanguageProvider around the application.");
  return value;
}
