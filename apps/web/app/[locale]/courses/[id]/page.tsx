import { CourseDetailPageClient } from '@/components/course/CourseDetailPageClient';

export default function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CourseDetailPageClient courseId={params.id} />
    </main>
  );
}
