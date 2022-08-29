let { Observable, of,  fromEvent, concat } = rxjs;
let { map, concatAll, share, first, windowToggle, pairwise } = rxjs;


let fromPointerUp = (element) => new Observable((subscriber) => {
    let listener = (e) => subscriber.next(e);

    element.addEventListener("pointerup", listener);
    element.addEventListener("pointercancel", listener);
    element.addEventListener("pointerout", listener);
    element.addEventListener("pointerleave", listener);

    return () => {
        element.removeEventListener("pointerup", listener);
        element.removeEventListener("pointercancel", listener);
        element.removeEventListener("pointerout", listener);
        element.removeEventListener("pointerleave", listener);
    };
});


let uncoalesce = () => (observable) => observable.pipe(
    map((e) => of(...e.getCoalescedEvents())),
    concatAll(),
);

let clientCoords = () => (observable) => observable.pipe(
    map(({ clientX, clientY }) => [clientX, clientY]),
);

let withLatest = (...others) => (observable) => {
    return new Observable((subscriber) => {
        let values = others.map((_) => undefined);
        let subscription = observable.subscribe({
            next: (v) => subscriber.next([v, ...values]),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
        });
        let subscriptions = others.map((o, idx) => o.subscribe({
            next: (v) => { values[idx] = v },
        }))

        return () => {
            subscription.unsubscribe();
            subscriptions.map((s) => s.unsubscribe());
        };
    });
};

export let brush = (element) => {
    let pointerMove = fromEvent(element, "pointermove").pipe(uncoalesce());
    let pointerDown = fromEvent(element, "pointerdown").pipe(share());
    let pointerUp = fromPointerUp(element);

    let start = concat(
        of([0, 0]),
        pointerDown.pipe(clientCoords())
    );
    let position = pointerMove.pipe(
        clientCoords(),
        pairwise(),
        map(([prev, curr]) => ({ p: curr, d: [curr[0]-prev[0], curr[1]-prev[1]] })),
        withLatest(start),
        map(([pos, start]) => ({...pos, p0: start})),
    );

    return position.pipe(
        windowToggle(pointerDown, (_) => pointerUp.pipe(first())),
    );
};
