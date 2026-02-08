import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Lesson } from "@/lib/academy/types";

type Props = {
  lesson: Lesson;
  href: string;
  ctaLabel: string;
  progress?: number;
  progressLabel?: string;
};

export function LessonCard({ lesson, href, ctaLabel, progress, progressLabel }: Props) {
  const showProgress = typeof progress === "number";

  return (
    <Card className="academy-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="academy-h3 text-slate-50">{lesson.title}</h3>
          <p className="mt-2 text-sm text-slate-200/70">{lesson.subtitle}</p>
        </div>
        <Badge className="shrink-0">{lesson.level}</Badge>
      </div>

      <p className="academy-clamp-3 mt-2 text-sm leading-6 text-slate-200/70">{lesson.summary}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200/60">
        <span>{lesson.readTime}</span>
        <span>·</span>
        <span>{lesson.updatedAt}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {lesson.tags.slice(0, 3).map((tag) => (
          <Badge key={`${lesson.id}-${tag}`} className="text-[11px]">
            {tag}
          </Badge>
        ))}
      </div>

      {showProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-200/60">
            <span>{progressLabel ?? "Progress"}</span>
            <span>{Math.round(progress ?? 0)}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-sky-400/80 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <ButtonLink href={href} size="sm">
          {ctaLabel}
        </ButtonLink>
      </div>
    </Card>
  );
}
