"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "hi";

/**
 * A deliberately small dictionary. It covers navigation and the controls a
 * volunteer touches in the field — the places where a Hindi reader actually
 * needs help — rather than pretending the whole product is translated.
 */
const DICT: Record<string, { en: string; hi: string }> = {
  "nav.Dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.Attendance": { en: "Attendance", hi: "उपस्थिति" },
  "nav.Check in": { en: "Check in", hi: "चेक इन" },
  "nav.Students": { en: "Students", hi: "विद्यार्थी" },
  "nav.Centres": { en: "Centres", hi: "केंद्र" },
  "nav.Zones": { en: "Zones", hi: "क्षेत्र" },
  "nav.Volunteers": { en: "Volunteers", hi: "स्वयंसेवक" },
  "nav.Curriculum": { en: "Curriculum", hi: "पाठ्यक्रम" },
  "nav.Assessments": { en: "Assessments", hi: "मूल्यांकन" },
  "nav.Analytics": { en: "Analytics", hi: "विश्लेषण" },
  "nav.UpayGPT": { en: "UpayGPT", hi: "UpayGPT" },
  "nav.Certificates": { en: "Certificates", hi: "प्रमाणपत्र" },
  "nav.Data import": { en: "Data import", hi: "डेटा आयात" },
  "nav.People & roles": { en: "People & roles", hi: "लोग और भूमिकाएँ" },

  "group.Operations": { en: "Operations", hi: "संचालन" },
  "group.Programme": { en: "Programme", hi: "कार्यक्रम" },
  "group.Insight": { en: "Insight", hi: "अंतर्दृष्टि" },
  "group.Administration": { en: "Administration", hi: "प्रशासन" },

  "action.signOut": { en: "Sign out", hi: "साइन आउट" },
  "action.save": { en: "Save", hi: "सहेजें" },
  "action.cancel": { en: "Cancel", hi: "रद्द करें" },
  "action.takePhoto": { en: "Take class photo", hi: "कक्षा की फोटो लें" },
  "action.markAttendance": { en: "Mark attendance", hi: "उपस्थिति दर्ज करें" },
  "action.checkIn": { en: "Check in", hi: "चेक इन करें" },
  "action.checkOut": { en: "Check out", hi: "चेक आउट करें" },

  "label.present": { en: "Present", hi: "उपस्थित" },
  "label.absent": { en: "Absent", hi: "अनुपस्थित" },
  "label.today": { en: "Today", hi: "आज" },
  "label.centre": { en: "Centre", hi: "केंद्र" },
  "label.recognised": { en: "Recognised", hi: "पहचाना गया" },
  "label.notRecognised": { en: "Not recognised", hi: "पहचाना नहीं गया" },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("upay-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("upay-lang", l);
    document.documentElement.lang = l;
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Falls back to the key's text after the dot, so a missing entry still reads. */
export function useT() {
  const { lang } = useLang();
  return (key: string) => DICT[key]?.[lang] ?? key.split(".").slice(1).join(".") ?? key;
}
