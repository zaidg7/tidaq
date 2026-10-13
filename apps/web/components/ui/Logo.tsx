import { cn } from '@/lib/cn';

type Props = {
  /** `md` for the navbar (22 px mobile, 24 px desktop), `lg` for the footer and hero. */
  size?: 'md' | 'lg';
  /** Accessible name. Pass `null` when a wrapping link already names it. */
  label?: string | null;
  /** On a dark surface: the dot switches to the light accent (#9C85FF), the base one is too dim. */
  onDark?: boolean;
  className?: string;
};

/*
 * Wordmark `tidaq.` (CRAFT.md §3 Logo). Outlines are Plus Jakarta Sans 800 at −0.04em tracking,
 * converted with fontTools so the mark never depends on the web font loading. The q's descender
 * curls right and ends next to the accent dot: the same "today" dot as in the price chart.
 * viewBox units are font units (1000 = 1 em), so the height in px is 1.04 × the font size.
 */
const LETTERS =
  'M318 766Q219 766 164.5 712.5Q110 659 110 563V344H18V214H23Q65 214 87.5 193Q110 172 110 130V90H260V214H388V344H260V553Q260 581 270 599.5Q280 618 301 627Q322 636 353 636Q360 636 369 635Q378 634 388 633V760Q373 762 354 764Q335 766 318 766Z M436 760V214H586V760ZM436 165V15H586V165Z M913 772Q833 772 770 734Q707 696 670.5 631Q634 566 634 487Q634 407 671 342.5Q708 278 771 240Q834 202 912 202Q972 202 1018.5 224.5Q1065 247 1092 288L1069 318V3H1219V760H1079V660L1093 691Q1065 731 1017 751.5Q969 772 913 772ZM931 637Q972 637 1003 618Q1034 599 1051.5 565Q1069 531 1069 487Q1069 443 1051.5 409Q1034 375 1003 356Q972 337 931 337Q890 337 857.5 356.5Q825 376 807 409.5Q789 443 789 487Q789 531 807 565Q825 599 857.5 618Q890 637 931 637Z M1458 772Q1399 772 1356 753Q1313 734 1290 698.5Q1267 663 1267 614Q1267 568 1288 532.5Q1309 497 1352.5 473Q1396 449 1461 439L1628 412V522L1488 547Q1456 553 1439 567.5Q1422 582 1422 609Q1422 634 1441 648Q1460 662 1488 662Q1525 662 1553 646Q1581 630 1596.5 602.5Q1612 575 1612 542V400Q1612 369 1587.5 348Q1563 327 1521 327Q1481 327 1450.5 349Q1420 371 1406 407L1286 350Q1302 304 1337 271Q1372 238 1421 220Q1470 202 1528 202Q1597 202 1650 227Q1703 252 1732.5 296.5Q1762 341 1762 400V760H1622V672L1656 666Q1632 702 1603 725.5Q1574 749 1538 760.5Q1502 772 1458 772Z M2245 760V660L2269 691Q2241 731 2193 751.5Q2145 772 2089 772Q2009 772 1946 734Q1883 696 1846.5 631Q1810 566 1810 487Q1810 407 1847 342.5Q1884 278 1947 240Q2010 202 2088 202Q2148 202 2194.5 224.5Q2241 247 2268 288L2255 318V214H2395V760ZM2107 637Q2148 637 2179 618Q2210 599 2227.5 565Q2245 531 2245 487Q2245 443 2227.5 409Q2210 375 2179 356Q2148 337 2107 337Q2066 337 2033.5 356.5Q2001 376 1983 409.5Q1965 443 1965 487Q1965 531 1983 565Q2001 599 2033.5 618Q2066 637 2107 637Z';
const TAIL = 'M2320 740V830C2320 925 2367 955 2447 955';

export function Logo({ size = 'md', label = 'Tidaq', onDark = false, className }: Props) {
  return (
    <svg
      viewBox="0 0 2736 1040"
      className={cn(
        'w-auto shrink-0 text-fg',
        size === 'lg' ? 'h-[33px]' : 'h-[23px] lg:h-[25px]',
        className,
      )}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
    >
      <path d={LETTERS} fill="currentColor" />
      <path d={TAIL} fill="none" stroke="currentColor" strokeWidth="150" strokeLinecap="round" />
      <circle cx="2654" cy="955" r="82" className={onDark ? 'fill-[#9c85ff]' : 'fill-accent'} />
    </svg>
  );
}
