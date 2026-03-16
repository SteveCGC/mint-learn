'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getContentUrl, getCourseById } from '@/lib/api';
import { shortenAddress } from '@/lib/course';
import { Link, useRouter } from '@/navigation';

const CONTENT_REFRESH_MS = 840_000;

type ContentAccessState = {
  url: string;
  key: string;
  expiresIn: number;
};

type CourseLearningPageClientProps = {
  courseId: string;
};

function getFileExtension(key: string, url: string) {
  let source = key;

  if (!source) {
    try {
      source = new URL(url).pathname;
    } catch {
      source = url;
    }
  }

  const cleanSource = source.split('?')[0];
  const extension = cleanSource.split('.').pop();
  return extension?.toLowerCase() ?? '';
}

export function CourseLearningPageClient({ courseId }: CourseLearningPageClientProps) {
  const tCommon = useTranslations('common');
  const tCourse = useTranslations('course');
  const tProfile = useTranslations('profile');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [contentAccess, setContentAccess] = useState<ContentAccessState | null>(null);
  const [isFetchingContent, setIsFetchingContent] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourseById(courseId),
  });

  const fetchContentUrl = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsFetchingContent(true);
      }

      setContentError(null);

      try {
        const nextContent = await getContentUrl(courseId);
        setContentAccess(nextContent);
      } catch (error) {
        const status = (error as { status?: number }).status;

        if (status === 401) {
          await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
          return;
        }

        if (status === 403) {
          toast({
            description: tProfile('purchase_required'),
            variant: 'destructive',
          });
          router.replace(`/courses/${courseId}`);
          return;
        }

        setContentError(tErrors('course_access_failed'));
      } finally {
        if (!silent) {
          setIsFetchingContent(false);
        }
      }
    },
    [courseId, queryClient, router, tErrors, tProfile, toast]
  );

  useEffect(() => {
    void fetchContentUrl();
  }, [fetchContentUrl]);

  useEffect(() => {
    if (!contentAccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchContentUrl({ silent: true });
    }, CONTENT_REFRESH_MS);

    return () => window.clearTimeout(timer);
  }, [contentAccess, fetchContentUrl]);

  const contentType = useMemo(() => {
    if (!contentAccess) {
      return 'unknown';
    }

    const extension = getFileExtension(contentAccess.key, contentAccess.url);

    if (extension === 'mp4') {
      return 'video';
    }

    if (extension === 'pdf') {
      return 'pdf';
    }

    return 'download';
  }, [contentAccess]);

  return (
    <AuthGuard>
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
          <Button className="w-full justify-start" onClick={() => router.push('/profile')} type="button" variant="outline">
            <span>{tProfile('back_to_profile')}</span>
          </Button>

          <div className="mt-6 space-y-4">
            {courseQuery.isPending ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : courseQuery.data ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{tProfile('course_sidebar_title')}</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">{courseQuery.data.title}</h1>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {tCourse('author')}
                  </p>
                  <p className="mt-2 font-semibold">
                    {(courseQuery.data.authorNickname && courseQuery.data.authorNickname.trim()) ||
                      tCourse('anonymous_author')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shortenAddress(courseQuery.data.authorAddress)}
                  </p>
                  <Link
                    className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                    href={`/courses/${courseId}`}
                  >
                    {tCommon('view_detail')}
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{tCourse('detail_load_failed')}</p>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          {isFetchingContent && !contentAccess ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="aspect-video w-full rounded-2xl" />
            </div>
          ) : contentError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              {contentError}
            </div>
          ) : contentAccess ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{tProfile('content_ready')}</span>
                {isFetchingContent ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              </div>

              {contentType === 'video' ? (
                <video
                  className="w-full rounded-2xl bg-black"
                  controls
                  preload="metadata"
                  src={contentAccess.url}
                />
              ) : null}

              {contentType === 'pdf' ? (
                <iframe
                  className="h-[75vh] w-full rounded-2xl border border-border"
                  src={contentAccess.url}
                  title={courseQuery.data?.title ?? 'Course PDF'}
                />
              ) : null}

              {contentType === 'download' ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <p className="text-lg font-semibold">{tProfile('download_only_title')}</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {tProfile('download_only_description')}
                  </p>
                  <a
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    download
                    href={contentAccess.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {tProfile('download_content')}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </AuthGuard>
  );
}
