import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">{t('common.pageNotFound')}</p>
      <Button asChild>
        <Link to="/">{t('common.goHome')}</Link>
      </Button>
    </div>
  );
}
