"use client";

import { useEffect } from "react";

const INJECT_SRC = process.env.NEXT_PUBLIC_BOTPRESS_INJECT_SRC;
const CONFIG_SRC = process.env.NEXT_PUBLIC_BOTPRESS_CONFIG_SRC;

const INJECT_ID = "botpress-inject";
const CONFIG_ID = "botpress-config";

/** Footpathshala Assistant (Botpress). No-ops until both env vars are set. */
export function ChatbotWidget() {
  useEffect(() => {
    if (!INJECT_SRC || !CONFIG_SRC) return;
    if (document.getElementById(INJECT_ID)) return;

    // The config script calls `window.botpress.init(...)`, which only exists
    // once inject.js has run. Dynamically created <script src> elements are
    // async by default, so without `async = false` the much smaller config
    // script can finish downloading — and execute — before the large inject
    // bundle does. Setting async = false restores in-order execution, same
    // as the plain <script>/<script defer> pair Botpress's embed snippet uses.
    const inject = document.createElement("script");
    inject.id = INJECT_ID;
    inject.src = INJECT_SRC;
    inject.async = false;
    document.body.appendChild(inject);

    const config = document.createElement("script");
    config.id = CONFIG_ID;
    config.src = CONFIG_SRC;
    config.async = false;
    document.body.appendChild(config);
  }, []);

  return null;
}
