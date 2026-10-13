/** Today's date (`YYYY-MM-DD`) in German time: stays, charts and "Stand" all count in Berlin days. */
export function berlinToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
