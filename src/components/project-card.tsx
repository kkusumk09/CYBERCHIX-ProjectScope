import Link from "next/link";

import { Tag, Card, CardBody } from "@/components/ui";
import type { ProjectRow } from "@/lib/projects";
import { cn, truncate } from "@/lib/utils";

export function ProjectCard({
  project,
  selectable = false,
  selected = false,
  onToggle,
}: {
  project: ProjectRow;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const awardLabel = project.award
    ? `${project.award}${project.awardVerified ? " (verified)" : " (stated, not verified)"}`
    : null;

  return (
    <Card
      className={cn(
        "flex h-full flex-col transition-shadow hover:shadow-md",
        selected && "border-[3px] border-ink ring-2 ring-punch",
      )}
    >
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone="paper">{project.platform}</Tag>
              {project.domain ? <Tag tone="paper">{project.domain}</Tag> : null}
              {project.isSaved ? <Tag tone="mint">saved</Tag> : null}
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-ink">
              <Link
                href={`/projects/${project.id}`}
                className="hover:text-punch"
              >
                {project.title}
              </Link>
            </h3>
          </div>

          {selectable ? (
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-ink/60">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle?.(project.id)}
                className="border-[3px] h-4 w-4 rounded border-ink text-punch focus:ring-punch"
              />
              compare
            </label>
          ) : null}
        </div>

        <p className="text-sm text-ink/70">
          {truncate(project.summary, 220)}
        </p>

        <dl className="grid gap-2 text-xs">
          {project.problemAddressed ? (
            <div>
              <dt className="font-semibold text-ink/60">Problem addressed</dt>
              <dd className="text-ink/80">
                {truncate(project.problemAddressed, 160)}
              </dd>
            </div>
          ) : null}
          {project.proposedSolution ? (
            <div>
              <dt className="font-semibold text-ink/60">Proposed solution</dt>
              <dd className="text-ink/80">
                {truncate(project.proposedSolution, 160)}
              </dd>
            </div>
          ) : null}
          {project.targetUsers ? (
            <div>
              <dt className="font-semibold text-ink/60">Target users</dt>
              <dd className="text-ink/80">{project.targetUsers}</dd>
            </div>
          ) : null}
        </dl>

        {project.technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 6).map((technology) => (
              <Tag key={technology} tone="paper">
                {technology}
              </Tag>
            ))}
            {project.technologies.length > 6 ? (
              <Tag tone="paper">+{project.technologies.length - 6}</Tag>
            ) : null}
          </div>
        ) : null}

        {awardLabel ? (
          <p className="text-xs">
            <span className="font-semibold text-ink/60">Award/ranking: </span>
            <span className="text-ink/80">{awardLabel}</span>
          </p>
        ) : null}

        <div className="border-[3px] mt-auto flex items-end justify-between gap-3 border-t-[3px] border-ink pt-3">
          <div className="min-w-0 text-xs text-ink/60">
            <p className="truncate" title={project.attribution}>
              {project.attribution}
            </p>
            <p className="mt-0.5">
              relevance {Math.round(project.relevance * 100)}%
            </p>
          </div>
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="shrink-0 text-xs font-semibold text-punch hover:underline"
          >
            Source ↗
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
