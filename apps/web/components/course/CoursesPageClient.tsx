'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/course/CourseCard';
import { CourseCardSkeleton } from '@/components/course/CourseCardSkeleton';
import { Pagination } from '@/components/course/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/hooks/useAuth';
import { type CourseSort, getCourses, getMyCourses } from '@/lib/api';

const PAGE_SIZE = 6;

export function CoursesPageClient() {
  const tCourse = useTranslations('course');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CourseSort>('createdAt_desc');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort]);

  const coursesQuery = useQuery({
    queryKey: ['courses', page, debouncedSearch, sort],
    queryFn: () =>
      getCourses({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sort,
      }),
    placeholderData: keepPreviousData,
  });

  const purchasedCoursesQuery = useQuery({
    queryKey: ['users', 'me', 'courses'],
    queryFn: () => getMyCourses({ page: 1, pageSize: 100 }),
    enabled: isLoggedIn,
    retry: false,
  });

  const purchasedCourseIds = new Set(
    (purchasedCoursesQuery.data?.items ?? []).map((course) => course.courseId)
  );
  const totalPages = Math.max(1, Math.ceil((coursesQuery.data?.total ?? 0) / PAGE_SIZE));
  const isInitialLoading = coursesQuery.isPending && !coursesQuery.data;
  const hasItems = (coursesQuery.data?.items.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {tCourse('square_title')}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {tCourse('square_description')}
        </p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tCourse('search_placeholder')}
            value={search}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{tCourse('sort_label')}</span>
          <select
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            onChange={(event) => setSort(event.target.value as CourseSort)}
            value={sort}
          >
            <option value="createdAt_desc">{tCourse('sort_latest')}</option>
            <option value="price_asc">{tCourse('sort_price_asc')}</option>
            <option value="price_desc">{tCourse('sort_price_desc')}</option>
          </select>
        </label>
      </section>

      {isInitialLoading ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </section>
      ) : coursesQuery.isError ? (
        <section className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{tCourse('load_failed')}</p>
        </section>
      ) : hasItems ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {coursesQuery.data?.items.map((course) => (
              <CourseCard
                authorAddress={course.authorAddress}
                authorNickname={course.authorNickname}
                coverImageUrl={course.coverImageUrl}
                id={course.id}
                isPurchased={purchasedCourseIds.has(course.id)}
                key={course.id}
                price={course.price}
                purchaseCount={course.purchaseCount}
                title={course.title}
              />
            ))}
          </div>

          <Pagination onPageChange={setPage} page={page} totalPages={totalPages} />
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <h2 className="text-xl font-semibold">{tCourse('empty_title')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tCourse('empty_description')}</p>
        </section>
      )}
    </div>
  );
}
