'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EarningsChart } from '@/components/defi/EarningsChart';
import { StakePanel } from '@/components/defi/StakePanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useATokenBalance } from '@/hooks/useATokenBalance';
import { useAuth } from '@/hooks/useAuth';
import { useMTBalance } from '@/hooks/useMTBalance';
import { getAavePositions, getMyAuthored } from '@/lib/api';
import { formatCoursePrice } from '@/lib/course';
import { formatTokenAmount, USDT_DECIMALS } from '@/lib/token';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi';

function OverviewCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EarningsPageClient() {
  const t = useTranslations('earnings');
  const tCourse = useTranslations('course');
  const tAave = useTranslations('aave');
  const { isLoggedIn } = useAuth();
  const { formattedBalance: formattedMtBalance, isLoading: isMtBalanceLoading } = useMTBalance();
  const { formattedBalance: formattedATokenBalance, isLoading: isATokenLoading } = useATokenBalance();

  const authoredQuery = useQuery({
    queryKey: ['users', 'me', 'authored', 'earnings'],
    queryFn: () => getMyAuthored({ page: 1, pageSize: 100 }),
    enabled: isLoggedIn,
    retry: false,
  });

  const positionsQuery = useQuery({
    queryKey: ['aave', 'positions'],
    queryFn: getAavePositions,
    enabled: isLoggedIn,
    retry: false,
  });

  const totalEarned = useMemo(() => {
    if (authoredQuery.data?.totalEarned) {
      return authoredQuery.data.totalEarned;
    }

    return (authoredQuery.data?.items ?? []).reduce((sum, item) => {
      return (BigInt(sum) + BigInt(item.totalEarned ?? '0')).toString();
    }, '0');
  }, [authoredQuery.data?.items, authoredQuery.data?.totalEarned]);

  const totalStakedAmount = useMemo(() => {
    return (positionsQuery.data?.positions ?? []).reduce((sum, item) => {
      const direction = item.action === 'withdraw' ? BigInt(-1) : BigInt(1);
      return sum + BigInt(item.amount) * direction;
    }, BigInt(0));
  }, [positionsQuery.data?.positions]);

  return (
    <AuthGuard>
      <div className="space-y-8">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t('page_title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('page_description')}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            hint={t('overview_revenue_hint', { count: authoredQuery.data?.total ?? 0 })}
            label={t('overview_total_earnings')}
            value={authoredQuery.isPending ? '--' : formatCoursePrice(totalEarned || '0')}
          />
          <OverviewCard
            label={t('overview_mt_balance')}
            value={isMtBalanceLoading ? '--' : `${formattedMtBalance} MT`}
          />
          <OverviewCard
            hint={tAave('current_balance')}
            label={t('overview_staked_balance')}
            value={isATokenLoading ? '--' : `${formattedATokenBalance} aUSDT`}
          />
          <OverviewCard
            hint={t('overview_stake_hint', { count: positionsQuery.data?.positions.length ?? 0 })}
            label={t('overview_total_staked')}
            value={`${formatTokenAmount(
              totalStakedAmount > BigInt(0) ? totalStakedAmount : BigInt(0),
              USDT_DECIMALS
            )} USDT`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <StakePanel />
          <EarningsChart data={authoredQuery.data?.dailyEarnings ?? []} />
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold">{t('course_table_title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('course_table_description')}</p>
          </div>

          {authoredQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-14 rounded-2xl" key={index} />
              ))}
            </div>
          ) : authoredQuery.isError ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {t('load_authored_failed')}
            </p>
          ) : (authoredQuery.data?.items.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 font-medium">{t('course_col_title')}</th>
                    <th className="px-3 py-3 font-medium">{tCourse('price')}</th>
                    <th className="px-3 py-3 font-medium">{tCourse('students')}</th>
                    <th className="px-3 py-3 font-medium">{t('course_col_revenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {authoredQuery.data?.items.map((course) => (
                    <tr className="border-b border-border/70 last:border-0" key={course.courseId}>
                      <td className="px-3 py-3 font-medium">{course.title}</td>
                      <td className="px-3 py-3">{formatCoursePrice(course.price)}</td>
                      <td className="px-3 py-3">{course.purchaseCount}</td>
                      <td className="px-3 py-3">{formatCoursePrice(course.totalEarned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              {t('empty_authored')}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold">{t('positions_title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('positions_description')}</p>
          </div>

          {positionsQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-14 rounded-2xl" key={index} />
              ))}
            </div>
          ) : positionsQuery.isError ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {t('load_positions_failed')}
            </p>
          ) : (positionsQuery.data?.positions.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 font-medium">{t('positions_col_action')}</th>
                    <th className="px-3 py-3 font-medium">{t('positions_col_asset')}</th>
                    <th className="px-3 py-3 font-medium">{t('positions_col_amount')}</th>
                    <th className="px-3 py-3 font-medium">{t('positions_col_time')}</th>
                    <th className="px-3 py-3 font-medium">{t('positions_col_tx')}</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsQuery.data?.positions.map((position) => (
                    <tr className="border-b border-border/70 last:border-0" key={position.id}>
                      <td className="px-3 py-3 capitalize">{position.action}</td>
                      <td className="px-3 py-3">
                        {position.asset.toLowerCase() === CONTRACT_ADDRESSES.USDT_TOKEN.toLowerCase()
                          ? 'USDT'
                          : position.asset}
                      </td>
                      <td className="px-3 py-3">
                        {formatTokenAmount(BigInt(position.amount), USDT_DECIMALS)} USDT
                      </td>
                      <td className="px-3 py-3">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(position.createdAt))}
                      </td>
                      <td className="px-3 py-3">
                        <a
                          className="font-mono text-primary underline-offset-4 hover:underline"
                          href={`https://sepolia.etherscan.io/tx/${position.txHash}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {position.txHash.slice(0, 8)}...{position.txHash.slice(-6)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              {t('empty_positions')}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
