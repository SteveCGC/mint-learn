'use client';

import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Locale } from '@/i18n';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { Link, usePathname, useRouter } from '@/navigation';

const navItems = [
  { href: '/', key: 'home' },
  { href: '/courses', key: 'courses' },
  { href: '/publish', key: 'publish' },
] as const;

export function Navbar() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLocaleChange = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link className="text-xl font-semibold tracking-tight" href="/">
            {tCommon('brand_name')}
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                href={item.href}
                key={item.key}
              >
                {tNav(item.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <label className="sr-only" htmlFor="locale-switcher">
            {tCommon('language')}
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            id="locale-switcher"
            onChange={(event) => handleLocaleChange(event.target.value as Locale)}
            value={locale}
          >
            <option value="zh">{tCommon('chinese')}</option>
            <option value="en">{tCommon('english')}</option>
          </select>
          <ConnectButton />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ConnectButton />
          <Button onClick={() => setMobileOpen(true)} size="icon" type="button" variant="ghost">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{tNav('menu')}</SheetTitle>
          </SheetHeader>
          <div className="mt-8 space-y-6">
            <nav className="space-y-3">
              {navItems.map((item) => (
                <Link
                  className="block text-base font-medium"
                  href={item.href}
                  key={item.key}
                  onClick={() => setMobileOpen(false)}
                >
                  {tNav(item.key)}
                </Link>
              ))}
            </nav>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="mobile-locale-switcher">
                {tCommon('language')}
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="mobile-locale-switcher"
                onChange={(event) => handleLocaleChange(event.target.value as Locale)}
                value={locale}
              >
                <option value="zh">{tCommon('chinese')}</option>
                <option value="en">{tCommon('english')}</option>
              </select>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
