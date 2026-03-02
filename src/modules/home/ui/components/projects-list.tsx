"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ProjectsList = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { user, isLoaded } = useSession();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: projects } = useQuery({
    ...trpc.projects.getMany.queryOptions(),
    enabled: !!user,
  });

  const deleteProject = useMutation(trpc.projects.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  }));

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteProject.mutateAsync({ id });
  };

  if (!isLoaded || !user) return null;

  return (
    <div className="w-full bg-white dark:bg-sidebar rounded-xl p-8 border flex flex-col gap-y-6 sm:gap-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {user.name}&apos;s Vibes
        </h2>
        {projects && projects.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {projects?.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-sm text-muted-foreground">
              No projects yet. Start building something amazing above!
            </p>
          </div>
        )}
        {projects?.map((project) => (
          <div key={project.id} className="relative group">
            <Button
              variant="outline"
              className="font-normal h-auto justify-start w-full text-start p-4"
              asChild
            >
              <Link href={`/projects/${project.id}`}>
                <div className="flex items-center gap-x-4 w-full">
                  <Image
                    src="/logo.svg"
                    alt="Vibe"
                    width={32}
                    height={32}
                    className="object-contain shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <h3 className="truncate font-medium">
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(project.updatedAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={deletingId === project.id}
                  onClick={(e) => e.stopPropagation()}
                >
                  {deletingId === project.id ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-3.5" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{project.name}&quot; and all its messages. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(project.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
};
