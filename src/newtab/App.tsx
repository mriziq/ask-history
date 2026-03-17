import { useState, useEffect, lazy, Suspense } from "react";
import { Settings } from "./components/Settings";
import { Onboarding } from "./components/Onboarding";

const ChatApp = lazy(() => import("./ChatApp"));

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["openaiApiKey", "theme", "onboardingDone"], (result) => {
      setApiKey(result.openaiApiKey ?? null);
      setOnboardingDone(!!result.onboardingDone);
      const saved = result.theme === "light" ? "light" : "dark";
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      setReady(true);
    });
  }, []);

  function applyTheme(t: "dark" | "light") {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    chrome.storage.local.set({ theme: t });
  }

  if (!ready) return null;

  if (!onboardingDone && !apiKey) {
    return (
      <div className="h-screen" style={{ background: "var(--ink)", color: "var(--cream)" }}>
        <Onboarding onComplete={(key) => { setApiKey(key); setOnboardingDone(true); }} />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-screen" style={{ background: "var(--ink)", color: "var(--cream)" }}>
        <Settings onSave={setApiKey} indexedCount={0} />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <ChatApp
        apiKey={apiKey}
        theme={theme}
        onThemeChange={applyTheme}
        onSignOut={() => {
          chrome.storage.local.remove(["openaiApiKey"]);
          setApiKey(null);
          setOnboardingDone(true);
        }}
        onChangeKey={(key) => {
          chrome.storage.local.set({ openaiApiKey: key });
          setApiKey(key);
        }}
      />
    </Suspense>
  );
}
