import { saveAuditTestAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { AUDIT_EXTRAS } from '@/lib/admin/audit';

type Option = { id: number; name: string };

/** German or English euro amount, as `parseEuroCents` accepts it. */
const EURO_PATTERN = String.raw`\s*(\d{1,3}(\.\d{3})+(,\d{1,2})?|\d{1,3}(,\d{3})+(\.\d{1,2})?|\d+([.,]\d{1,2})?)\s*€?\s*`;

const selectClass =
  'min-h-[60px] w-full rounded-card border border-line bg-field px-3.5 text-[16px] font-bold text-fg hover:border-line-strong focus:border-accent focus:bg-surface focus:shadow-halo focus:outline-none';

function Select({
  id,
  label,
  children,
  defaultValue,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-1 text-[12.5px] font-semibold text-muted-ink">
        {label}
      </label>
      <select id={id} name={id} required defaultValue={defaultValue ?? ''} className={selectClass}>
        {children}
      </select>
    </div>
  );
}

/**
 * The checkout test form (C-032), built for a phone and under 60 seconds: native controls, the
 * number keypad for prices, extras as tap targets, the outcome computed from the prices.
 * Works without JavaScript.
 */
export function AuditForm({
  hotels,
  providers,
  today,
}: {
  hotels: Option[];
  providers: Option[];
  today: string;
}) {
  return (
    <form action={saveAuditTestAction} className="flex flex-col gap-4">
      <Select id="hotel_id" label="Hotel">
        <option value="" disabled>
          Hotel wählen
        </option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
      <Select id="provider_id" label="Anbieter">
        <option value="" disabled>
          Anbieter wählen
        </option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <TextField id="check_in" name="check_in" type="date" label="Anreise" min={today} required />
        <TextField
          id="check_out"
          name="check_out"
          type="date"
          label="Abreise"
          min={today}
          required
        />
      </div>
      <Select id="adults" label="Gäste" defaultValue="2">
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? 'Erwachsener' : 'Erwachsene'}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="listed"
          name="listed"
          label="Preis bei Google"
          inputMode="decimal"
          placeholder="1.184"
          pattern={EURO_PATTERN}
          required
          autoComplete="off"
        />
        <TextField
          id="checkout"
          name="checkout"
          label="Preis an der Kasse"
          inputMode="decimal"
          placeholder="1.212"
          pattern={EURO_PATTERN}
          autoComplete="off"
          hint="Leer lassen, wenn nicht buchbar."
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 px-1 text-[12.5px] font-semibold text-muted-ink">
          Was war anders?
        </legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AUDIT_EXTRAS).map(([value, label]) => (
            <label
              key={value}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            >
              <input type="checkbox" name="extras" value={value} className="size-4 accent-accent" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="px-1 text-[12.5px] font-semibold text-muted-ink">
          Notiz (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          className="w-full rounded-card border border-line bg-field px-3.5 py-3 text-[16px] text-fg hover:border-line-strong focus:border-accent focus:bg-surface focus:shadow-halo focus:outline-none"
        />
      </div>
      <Button type="submit" size="lg" block>
        Test speichern
      </Button>
    </form>
  );
}
