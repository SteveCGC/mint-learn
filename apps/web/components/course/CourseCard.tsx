import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { formatCoursePrice, shortenAddress } from '@/lib/course';
import { cn } from '@/lib/utils';

type CourseCardProps = {
  id: string;
  href?: string;
  title: string;
  coverImageUrl: string | null;
  authorNickname: string | null;
  authorAddress: string;
  price: string;
  purchaseCount: number;
  isPurchased?: boolean;
  className?: string;
};

export function CourseCard({
  id,
  href,
  title,
  coverImageUrl,
  authorNickname,
  authorAddress,
  price,
  purchaseCount,
  isPurchased = false,
  className,
}: CourseCardProps) {
  const tCourse = useTranslations('course');

  return (
    <Link
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg',
        className
      )}
      href={href ?? `/courses/${id}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Image
          alt={title}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          src={coverImageUrl ?? '/course-placeholder.svg'}
        />
        {isPurchased ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {tCourse('purchased')}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 min-h-12 text-lg font-semibold leading-6">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {(authorNickname && authorNickname.trim()) || tCourse('anonymous_author')} ·{' '}
            {shortenAddress(authorAddress)}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className="text-xl font-semibold text-primary">{formatCoursePrice(price)}</p>
          <p className="text-sm text-muted-foreground">
            {purchaseCount} {tCourse('students')}
          </p>
        </div>
      </div>
    </Link>
  );
}
