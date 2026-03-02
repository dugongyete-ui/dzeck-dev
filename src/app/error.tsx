"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: Props) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <div className="p-3 rounded-full bg-destructive/10">
          <AlertTriangleIcon className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCwIcon className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
