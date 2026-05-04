"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Briefcase, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Notice, PageHeader, WorkspaceCard } from "@/components/ui/workspace";

/**
 * Route preserved for admin nav. Staff Tracker MVP uses manual admin assignment only —
 * no automated matching, voice agent, or algorithm configuration.
 */
export default function AIInfoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <WorkspaceCard className="premium-panel" padding="lg">
        <PageHeader
          eyebrow="Operations model"
          title="Manual assignment workspace"
          description="This MVP routes hospitality shifts through your team: workers apply, admins confirm or assign, and shifts are created. There is no automated matching engine in scope."
        />
      </WorkspaceCard>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Notice tone="blue" title="MVP scope">
          <p>
            Use <strong>Jobs</strong> to review applicants, confirm or reject, and directly assign workers. Each confirmed
            assignment creates the corresponding shift. Self-serve &quot;instant book&quot; and AI call agents are{" "}
            <strong>not</strong> part of this release.
          </p>
        </Notice>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/jobs"
          className="workspace-card group flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Jobs & applicants</p>
              <p className="text-xs font-medium text-muted-foreground">Confirm, assign, unassign</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/dashboard/workers"
          className="workspace-card group flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Workers</p>
              <p className="text-xs font-medium text-muted-foreground">Activation & documents</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <WorkspaceCard padding="md">
        <div className="flex gap-3">
          <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            Future phases may explore assistive tools; anything beyond this page remains out of scope until product and
            compliance sign-off.
          </p>
        </div>
      </WorkspaceCard>
    </div>
  );
}
