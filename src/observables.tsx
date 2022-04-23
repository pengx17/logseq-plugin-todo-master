import { Observable, debounceTime, startWith } from "rxjs";

type ChangeEvent = Parameters<Parameters<typeof logseq.DB.onChanged>[0]>[0];

export const change$ = new Observable<ChangeEvent>((sub) => {
  let destroyed = false;
  let listener = (changes: ChangeEvent) => {
    if (!destroyed) {
      sub.next(changes);
    }
  };
  // TODO: onChanged seems not return off hook
  logseq.DB.onChanged(listener);
  return () => {
    console.log('change$ unsubscribe!!!');
    destroyed = true;
  };
})
  .pipe(debounceTime(1000))
  .pipe(startWith(null));
