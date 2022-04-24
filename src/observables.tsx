import { Observable, debounceTime, startWith } from "rxjs";

// @ts-expect-error fix SDK type
type ChangeEvent = Parameters<Parameters<typeof logseq.DB.onChanged>[0]>[0];

export const change$ = new Observable<ChangeEvent>((sub) => {
  let destroyed = false;
  let listener = (changes: ChangeEvent) => {
    if (!destroyed) {
      sub.next(changes);
    }
  };
  // TODO: onChanged seems not return off hook
  // @ts-expect-error fix SDK type
  const unsubscribe = logseq.DB.onChanged(listener);
  return () => {
    unsubscribe();
    destroyed = true;
  };
})
  .pipe(debounceTime(1000))
  .pipe(startWith(null));
