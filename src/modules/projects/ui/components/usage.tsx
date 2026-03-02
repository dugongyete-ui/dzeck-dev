import { useMemo } from "react";
import { ZapIcon } from "lucide-react";
import { formatDuration, intervalToDuration } from "date-fns";

interface Props {
  points: number;
  msBeforeNext: number;
}

export const Usage = ({ points, msBeforeNext }: Props) => {
  const resetTime = useMemo(() => {
    try {
      return formatDuration(
        intervalToDuration({
          start: new Date(),
          end: new Date(Date.now() + msBeforeNext),
        }),
        { format: ["months", "days", "hours"] }
      );
    } catch (error) {
      console.error("Error formatting duration ", error);
      return "unknown";
    }
  }, [msBeforeNext]);

  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      <div className="flex items-center gap-x-2">
        <ZapIcon className="size-4 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {points.toLocaleString()} credits remaining
          </p>
          <p className="text-xs text-muted-foreground">
            Resets in {resetTime}
          </p>
        </div>
      </div>
    </div>
  );
};
