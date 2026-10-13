import Link from 'next/link';
import { CircleAlert, MailCheck, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { AdminFrame } from '../AdminFrame';

const ERRORS: Record<string, string> = {
  email: 'Das sieht nicht wie eine E-Mail-Adresse aus.',
  config: 'Der Login ist hier noch nicht eingerichtet (Supabase oder ADMIN_EMAILS fehlt).',
  rate: 'Zu viele Links in kurzer Zeit. Warte eine Minute und versuch es noch mal.',
  send: 'Der Link konnte nicht verschickt werden. Versuch es gleich noch mal.',
  link: 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an.',
  browser:
    'Öffne den Link im selben Browser, in dem du ihn angefordert hast. Oder fordere hier einen neuen an.',
  denied: 'Diese Adresse hat keinen Admin-Zugang.',
  expired: 'Deine Anmeldung ist abgelaufen. Fordere einen neuen Link an.',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Admin login (C-020c): one field, a magic link by email. Works without JavaScript. */
export default async function AdminLogin({ searchParams }: Props) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === 'string' ? params[k] : undefined);
  const error = ERRORS[one('error') ?? ''];
  const sent = one('sent') === '1';
  const out = one('out') === '1';

  return (
    <AdminFrame>
      <Card variant="float" className="flex flex-col gap-5">
        {sent ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-good-soft text-good-ink">
              <Icon icon={MailCheck} size={24} />
            </span>
            <h1 className="text-h3">Schau in dein Postfach</h1>
            <p className="text-muted-ink">
              Wenn die Adresse freigeschaltet ist, kommt gleich ein Link. Er gilt eine Stunde und
              funktioniert nur in diesem Browser.
            </p>
            <Link
              href="/admin/login"
              className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              Andere Adresse eingeben
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-h3">Anmelden</h1>
              <p className="text-muted-ink">
                {out
                  ? 'Du bist abgemeldet. Neuer Link?'
                  : 'Wir schicken dir einen Link per E-Mail. Kein Passwort nötig.'}
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-cell bg-bad-soft px-3.5 py-3 text-[14px] font-semibold text-bad-ink"
              >
                <Icon icon={CircleAlert} size={16} className="mt-[2px]" />
                {error}
              </p>
            )}
            <form method="post" action="/admin/auth/login" className="flex flex-col gap-4">
              <TextField
                id="admin-email"
                name="email"
                type="email"
                label="E-Mail"
                autoComplete="email"
                required
                leading={<Icon icon={Mail} size={18} />}
              />
              <Button type="submit" size="lg" block>
                Link senden
              </Button>
            </form>
          </>
        )}
      </Card>
    </AdminFrame>
  );
}
