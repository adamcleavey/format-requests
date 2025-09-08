import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./styles/globals.css";

let container = document.getElementById("root")!;
let root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
