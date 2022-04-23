import { Observable, debounceTime, startWith } from "rxjs";

type ChangeEvent = Parameters<Parameters<typeof logseq.DB.onChanged>[0]>[0];

export const change$ = new Observable<ChangeEvent>((sub) => {
  let destroyed = false;
  // TODO: onChanged seems not return off hook
  logseq.DB.onChanged((args) => {
    if (!destroyed) {
      sub.next(args);
    }
  });
  return () => {
    destroyed = true;
  };
})
  .pipe(debounceTime(1000))
  .pipe(startWith(null));
