import Image from "next/image";
import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Initializing sandbox...",
  "Analyzing your request...",
  "Planning the architecture...",
  "Writing code...",
  "Installing packages...",
  "Running commands...",
  "Almost ready...",
];

interface Props {
  status?: string | null;
}

export const MessageLoading = ({ status }: Props) => {
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [dot, setDot] = useState(".");

  useEffect(() => {
    if (status) return;
    const interval = setInterval(() => {
      setFallbackIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDot((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const displayText = status ?? DEFAULT_MESSAGES[fallbackIndex];

  return (
    <div className="flex flex-col group px-2 pb-4">
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          src="/logo.svg"
          alt="Vibe"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Vibe</span>
      </div>
      <div className="pl-8.5 flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base text-muted-foreground">
            {displayText}{dot}
          </span>
        </div>
      </div>
    </div>
  );
};
