import "./index.css";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
} from "@fluentui/react-components";
import { Events } from "@wailsio/runtime";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { Layout } from "./components/Layout";
import { ViewRenderer } from "./views/ViewRenderer";
import { initialiseEventListeners } from "./events";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Initialise all event listeners once at startup
    initialiseEventListeners();

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
      <Layout>
        <ViewRenderer />
      </Layout>
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
