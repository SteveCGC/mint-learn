import { CourseLearningPageClient } from '@/components/profile/CourseLearningPageClient';

export default function ProfileCoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CourseLearningPageClient courseId={params.courseId} />
    </main>
  );
}
