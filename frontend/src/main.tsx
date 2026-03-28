import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
} from "@fluentui/react-components";
import { Events } from "@wailsio/runtime";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const unsubscribe = Events.On("theme:changed", (event) => {
      const newTheme = event.data as "light" | "dark";
      setTheme(newTheme);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      <div style={{ height: "100vh", width: "100vw" }}>{/* App content */}</div>
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
