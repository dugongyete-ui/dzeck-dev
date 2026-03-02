import Image from "next/image";
import { ZapIcon, InfinityIcon, ShieldCheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Page = () => {
  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full px-4">
      <section className="space-y-8 pt-[16vh] 2xl:pt-48 pb-16">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Vibe"
            width={50}
            height={50}
            className="hidden md:block"
          />
          <h1 className="text-xl md:text-3xl font-bold text-center">Vibe Platform</h1>
          <p className="text-muted-foreground text-center text-sm md:text-base">
            AI-powered development environment for building amazing apps
          </p>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-sm border-primary/30 shadow-none relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Admin Plan</CardTitle>
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-end gap-1 pt-2">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-muted-foreground mb-1">/ forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <ZapIcon className="size-4 text-primary shrink-0" />
                <span>10,000 AI generation credits per month</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <InfinityIcon className="size-4 text-primary shrink-0" />
                <span>Unlimited projects</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheckIcon className="size-4 text-primary shrink-0" />
                <span>Full admin access</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Page;
