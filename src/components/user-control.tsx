"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, UserIcon, ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  showName?: boolean;
}

export const UserControl = ({ showName }: Props) => {
  const { user } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-md h-8 px-2">
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
            <UserIcon className="size-4 text-primary" />
          </div>
          {showName && (
            <>
              <span className="text-sm font-medium">{user.name}</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOutIcon className="size-4 mr-2" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
