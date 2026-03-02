"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";

export const NavbarAuth = () => {
  return (
    <>
      <SignedOut>
        <div className="flex gap-2">
          <SignUpButton>
            <Button variant="outline" size="sm">
              Sign up
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button size="sm">
              Sign in
            </Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserControl showName />
      </SignedIn>
    </>
  );
};
