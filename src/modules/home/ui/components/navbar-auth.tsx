"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { useSession } from "@/hooks/use-session";

export const NavbarAuth = () => {
  const { isSignedIn, isLoaded } = useSession();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserControl showName />;
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
};
