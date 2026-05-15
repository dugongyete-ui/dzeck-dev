"use client";

import { Suspense, useState } from "react";
import { EyeIcon, CodeIcon, MessageSquareIcon } from "lucide-react";

import { Fragment } from "@/generated/prisma";
import { UserControl } from "@/components/user-control";
import { FileExplorer } from "@/components/file-explorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { FragmentWeb } from "../components/fragment-web";
import { ProjectHeader } from "../components/project-header";
import { MessagesContainer } from "../components/messages-container";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const chatPanel = (
    <ErrorBoundary fallback={<div className="p-4 text-sm text-destructive">Failed to load messages.</div>}>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground animate-pulse">Loading messages...</div>}>
        <MessagesContainer
          projectId={projectId}
          activeFragment={activeFragment}
          setActiveFragment={(fragment) => {
            setActiveFragment(fragment);
            setMobileTab("preview");
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );

  const previewPanel = (
    <Tabs
      className="h-full gap-y-0"
      defaultValue="preview"
      value={tabState}
      onValueChange={(value) => setTabState(value as "preview" | "code")}
    >
      <div className="w-full flex items-center p-2 border-b gap-x-2">
        <TabsList className="h-8 p-0 border rounded-md">
          <TabsTrigger value="preview" className="rounded-md">
            <EyeIcon /> <span>Demo</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="rounded-md">
            <CodeIcon /> <span>Code</span>
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-x-2">
          <UserControl />
        </div>
      </div>
      <TabsContent value="preview" className="h-[calc(100%-44px)]">
        {activeFragment ? (
          <FragmentWeb data={activeFragment} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Your app preview will appear here
          </div>
        )}
      </TabsContent>
      <TabsContent value="code" className="min-h-0 h-[calc(100%-44px)]">
        {activeFragment?.files ? (
          <FileExplorer
            files={activeFragment.files as { [path: string]: string }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Generated code will appear here
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="h-screen flex flex-col">
      <ErrorBoundary fallback={<div className="p-4 text-sm text-destructive">Failed to load project.</div>}>
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground animate-pulse">Loading project...</div>}>
          <ProjectHeader projectId={projectId} />
        </Suspense>
      </ErrorBoundary>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35} minSize={20} className="flex flex-col min-h-0">
            {chatPanel}
          </ResizablePanel>
          <ResizableHandle className="hover:bg-primary transition-colors" />
          <ResizablePanel defaultSize={65} minSize={50}>
            {previewPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col">
        <div className="flex border-b">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
              mobileTab === "chat"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("chat")}
          >
            <MessageSquareIcon className="size-4" />
            Chat
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
              mobileTab === "preview"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("preview")}
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === "chat" ? (
            <div className="h-full flex flex-col">{chatPanel}</div>
          ) : (
            <div className="h-full">{previewPanel}</div>
          )}
        </div>
      </div>
    </div>
  );
};
