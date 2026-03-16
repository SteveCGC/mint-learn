'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PurchaseFlow } from '@/components/course/PurchaseFlow';
import { Link } from '@/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCoursePrice, shortenAddress } from '@/lib/course';
import { getCourseById } from '@/lib/api';

type CourseDetailPageClientProps = {
  courseId: string;
};

export function CourseDetailPageClient({ courseId }: CourseDetailPageClientProps) {
  const tCourse = useTranslations('course');
  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourseById(courseId),
  });

  if (courseQuery.isPending) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{tCourse('detail_load_failed')}</p>
      </section>
    );
  }

  const course = courseQuery.data;
  const authorName =
    (course.authorNickname && course.authorNickname.trim()) || tCourse('anonymous_author');
  const publishedAt = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(course.createdAt));
  const metaHashExplorerUrl = `https://sepolia.etherscan.io/search?f=0&q=${encodeURIComponent(course.metaHash)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-muted">
          <Image
            alt={course.title}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 70vw, 100vw"
            src={course.coverImageUrl ?? '/course-placeholder.svg'}
          />
        </div>

        <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <p>
                {tCourse('author')}: {authorName}
              </p>
              <p>
                {tCourse('price')}: {formatCoursePrice(course.price)}
              </p>
              <p>
                {tCourse('students')}: {course.purchaseCount}
              </p>
              <p>
                {tCourse('published_at')}: {publishedAt}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{tCourse('description_title')}</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {course.description || tCourse('description_empty')}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{tCourse('author_section_title')}</h2>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {authorName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <Link className="font-medium hover:text-primary" href={`/u/${course.authorAddress}`}>
                {authorName}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {shortenAddress(course.authorAddress)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{tCourse('proof_title')}</h2>
            <a
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              href={metaHashExplorerUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {tCourse('view_on_etherscan')}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 break-all rounded-2xl bg-muted px-4 py-3 font-mono text-sm">
            {course.metaHash}
          </p>
        </section>
      </div>

      <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <p className="text-sm font-medium text-muted-foreground">{tCourse('purchase_panel_title')}</p>
        <p className="mt-4 text-2xl font-semibold text-primary">{formatCoursePrice(course.price)}</p>
        <div className="mt-6">
          <PurchaseFlow
            chainCourseId={course.chainId ? BigInt(course.chainId) : null}
            courseId={course.id}
            price={BigInt(course.price)}
          />
        </div>
      </aside>
    </div>
  );
}
