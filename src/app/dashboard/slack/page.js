"use client";

import { Suspense } from "react";
import SlackContent from "./SlackContent";

export default function SlackPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading Slack settings...</p>
        </div>
      }
    >
      <SlackContent />
    </Suspense>
  );
}
