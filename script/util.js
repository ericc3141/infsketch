let { Observable, merge } = rxjs;
let { groupBy } = rxjs;

export let withKey = (key) => (observable) => observable.pipe(
    groupBy((_) => key),
);

export let forever = (value) => new Observable((subscriber) => {
    subscriber.next(value);
});

export let asObservable = (value) => {
    if (typeof value.subscribe === "function") {
        return value;
    } else if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
        let children = [];
        for (let i in value) {
            children.push([i, asObservable(value[i])]);
        }
        return merge(...children.map(([k, v]) => withKey(k)(v)));
    } else {
        return forever(value);
    }
};

export let withLatest = (...others) => (observable) => {
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

export let range = (start, end = null, step = 1) => {
    [start, end] = end === null ? [0, start] : [start, end];
    return Array(Math.floor((end - start) / step))
        .fill(null)
        .map((_, idx) => start + idx * step);
};
