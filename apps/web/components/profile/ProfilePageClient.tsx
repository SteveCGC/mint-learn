'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, LoaderCircle, Pencil, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { CourseCard } from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useMTBalance } from '@/hooks/useMTBalance';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { formatCoursePrice, shortenAddress } from '@/lib/course';
import { getMyAuthored, getMyCourses } from '@/lib/api';
import { Link } from '@/navigation';

export function ProfilePageClient() {
  const tCommon = useTranslations('common');
  const tCourse = useTranslations('course');
  const tProfile = useTranslations('profile');
  const { toast } = useToast();
  const { isLoggedIn } = useAuth();
  const { profile, isLoading, isError, updateNickname, isUpdatingNickname } = useProfile();
  const { formattedBalance, isLoading: isBalanceLoading } = useMTBalance();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');

  const purchasedCoursesQuery = useQuery({
    queryKey: ['users', 'me', 'courses', 'profile'],
    queryFn: () => getMyCourses({ page: 1, pageSize: 100 }),
    enabled: isLoggedIn,
    retry: false,
  });

  const authoredCoursesQuery = useQuery({
    queryKey: ['users', 'me', 'authored'],
    queryFn: () => getMyAuthored({ page: 1, pageSize: 100 }),
    enabled: isLoggedIn,
    retry: false,
  });

  const totalEarned = useMemo(() => {
    if (profile?.totalEarnings) {
      return profile.totalEarnings;
    }

    return (authoredCoursesQuery.data?.items ?? []).reduce((sum, course) => {
      return (BigInt(sum) + BigInt(course.totalEarned ?? '0')).toString();
    }, '0');
  }, [authoredCoursesQuery.data?.items, profile?.totalEarnings]);

  const startEditNickname = () => {
    setNicknameDraft(profile?.nickname ?? '');
    setIsEditingNickname(true);
  };

  const cancelEditNickname = () => {
    setNicknameDraft(profile?.nickname ?? '');
    setIsEditingNickname(false);
  };

  const handleSaveNickname = async () => {
    const nextNickname = nicknameDraft.trim();

    if (nextNickname.length < 1 || nextNickname.length > 30) {
      toast({
        description: tProfile('nickname_invalid'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateNickname(nextNickname);
      setIsEditingNickname(false);
      toast({ description: tProfile('save_success') });
    } catch {
      toast({
        description: tProfile('save_failed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError || !profile ? (
              <p className="text-sm text-destructive">{tProfile('load_failed')}</p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {tProfile('profile_card_title')}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight">{tProfile('page_title')}</h1>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Wallet
                  </p>
                  <p className="mt-2 break-all font-mono text-sm sm:text-base">{profile.address}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {tProfile('nickname_label')}
                    </p>
                    {isEditingNickname ? (
                      <input
                        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        maxLength={30}
                        onChange={(event) => setNicknameDraft(event.target.value)}
                        placeholder={tProfile('nickname_placeholder')}
                        value={nicknameDraft}
                      />
                    ) : (
                      <p className="mt-2 text-lg font-semibold">
                        {profile.nickname?.trim() || tProfile('nickname_empty')}
                      </p>
                    )}
                  </div>

                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={isUpdatingNickname}
                        onClick={handleSaveNickname}
                        size="icon"
                        type="button"
                      >
                        {isUpdatingNickname ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button onClick={cancelEditNickname} size="icon" type="button" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={startEditNickname} size="icon" type="button" variant="outline">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{tCourse('balance_label')}</p>
              <p className="mt-3 text-3xl font-semibold text-primary">
                {isBalanceLoading ? '--' : `${formattedBalance} MT`}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{tProfile('total_earnings')}</p>
              <p className="mt-3 text-3xl font-semibold">{formatCoursePrice(totalEarned)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {tProfile('published_courses_count', {
                  count: authoredCoursesQuery.data?.total ?? profile?.authoredCoursesCount ?? 0,
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{tProfile('my_courses')}</h2>
              <p className="text-sm text-muted-foreground">{tProfile('my_courses_description')}</p>
            </div>
            <Link className="text-sm font-medium text-primary hover:underline" href="/courses">
              {tProfile('browse_courses')}
            </Link>
          </div>

          {purchasedCoursesQuery.isPending ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="aspect-[16/14] rounded-3xl" key={index} />
              ))}
            </div>
          ) : purchasedCoursesQuery.isError ? (
            <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              {tProfile('courses_load_failed')}
            </section>
          ) : (purchasedCoursesQuery.data?.items.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {purchasedCoursesQuery.data?.items.map((course) => (
                <CourseCard
                  authorAddress={course.authorAddress ?? profile?.address ?? ''}
                  authorNickname={course.authorNickname ?? null}
                  coverImageUrl={course.coverImageUrl ?? null}
                  href={`/profile/${course.courseId}`}
                  id={course.courseId}
                  isPurchased
                  key={course.courseId}
                  price={course.price ?? '0'}
                  purchaseCount={course.purchaseCount ?? 0}
                  title={course.title ?? shortenAddress(course.courseId, 8, 6)}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-base font-semibold">{tProfile('empty_courses_title')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tProfile('empty_courses_description')}</p>
            </section>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">{tProfile('authored_courses')}</h2>
            <p className="text-sm text-muted-foreground">{tProfile('authored_courses_description')}</p>
          </div>

          {authoredCoursesQuery.isPending ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-36 rounded-3xl" key={index} />
              ))}
            </div>
          ) : authoredCoursesQuery.isError ? (
            <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              {tProfile('authored_load_failed')}
            </section>
          ) : (authoredCoursesQuery.data?.items.length ?? 0) > 0 ? (
            <div className="grid gap-4">
              {authoredCoursesQuery.data?.items.map((course) => (
                <Link
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  href={`/courses/${course.courseId}`}
                  key={course.courseId}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold">{course.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            course.isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {course.isActive ? tProfile('status_active') : tProfile('status_inactive')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <p>
                          {tCourse('price')}: {formatCoursePrice(course.price)}
                        </p>
                        <p>
                          {tCourse('students')}: {course.purchaseCount}
                        </p>
                        <p>
                          {tProfile('course_revenue')}: {formatCoursePrice(course.totalEarned)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                      {tCommon('view_detail')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <section className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-base font-semibold">{tProfile('empty_authored_title')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tProfile('empty_authored_description')}</p>
            </section>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
