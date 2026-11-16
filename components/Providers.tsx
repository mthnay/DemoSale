"use client";

import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { FeedbackProvider } from "./Feedback";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user": işletim sisteminde "hareketi azalt" açıksa animasyonlar sadeleşir
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
