import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/global.scss";
import "./i18n.ts";
import App from "./App.tsx";
import React from "react";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<React.Suspense fallback={<div>Loading DAIA...</div>}>
			<App />
		</React.Suspense>
	</StrictMode>,
);
