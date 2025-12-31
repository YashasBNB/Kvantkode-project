/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableValue, transaction } from './base.js';
import { derived } from './derived.js';
export class ObservableLazy {
    /**
     * The cached value.
     * Does not force a computation of the value.
     */
    get cachedValue() {
        return this._value;
    }
    constructor(_computeValue) {
        this._computeValue = _computeValue;
        this._value = observableValue(this, undefined);
    }
    /**
     * Returns the cached value.
     * Computes the value if the value has not been cached yet.
     */
    getValue() {
        let v = this._value.get();
        if (!v) {
            v = this._computeValue();
            this._value.set(v, undefined);
        }
        return v;
    }
}
/**
 * A promise whose state is observable.
 */
export class ObservablePromise {
    static fromFn(fn) {
        return new ObservablePromise(fn());
    }
    constructor(promise) {
        this._value = observableValue(this, undefined);
        /**
         * The current state of the promise.
         * Is `undefined` if the promise didn't resolve yet.
         */
        this.promiseResult = this._value;
        this.promise = promise.then((value) => {
            transaction((tx) => {
                /** @description onPromiseResolved */
                this._value.set(new PromiseResult(value, undefined), tx);
            });
            return value;
        }, (error) => {
            transaction((tx) => {
                /** @description onPromiseRejected */
                this._value.set(new PromiseResult(undefined, error), tx);
            });
            throw error;
        });
    }
}
export class PromiseResult {
    constructor(
    /**
     * The value of the resolved promise.
     * Undefined if the promise rejected.
     */
    data, 
    /**
     * The error in case of a rejected promise.
     * Undefined if the promise resolved.
     */
    error) {
        this.data = data;
        this.error = error;
    }
    /**
     * Returns the value if the promise resolved, otherwise throws the error.
     */
    getDataOrThrow() {
        if (this.error) {
            throw this.error;
        }
        return this.data;
    }
}
/**
 * A lazy promise whose state is observable.
 */
export class ObservableLazyPromise {
    constructor(_computePromise) {
        this._computePromise = _computePromise;
        this._lazyValue = new ObservableLazy(() => new ObservablePromise(this._computePromise()));
        /**
         * Does not enforce evaluation of the promise compute function.
         * Is undefined if the promise has not been computed yet.
         */
        this.cachedPromiseResult = derived(this, (reader) => this._lazyValue.cachedValue.read(reader)?.promiseResult.read(reader));
    }
    getPromise() {
        return this._lazyValue.getValue().promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9wcm9taXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBZSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFdEMsTUFBTSxPQUFPLGNBQWM7SUFHMUI7OztPQUdHO0lBQ0gsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsWUFBNkIsYUFBc0I7UUFBdEIsa0JBQWEsR0FBYixhQUFhLENBQVM7UUFWbEMsV0FBTSxHQUFHLGVBQWUsQ0FBZ0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBVW5CLENBQUM7SUFFdkQ7OztPQUdHO0lBQ0ksUUFBUTtRQUNkLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQ3RCLE1BQU0sQ0FBQyxNQUFNLENBQUksRUFBb0I7UUFDM0MsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQWVELFlBQVksT0FBbUI7UUFiZCxXQUFNLEdBQUcsZUFBZSxDQUErQixJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFPeEY7OztXQUdHO1FBQ2Esa0JBQWEsR0FBOEMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUdyRixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQzFCLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDVCxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIscUNBQXFDO2dCQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDekQsQ0FBQyxDQUFDLENBQUE7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsRUFDRCxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ1QsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2xCLHFDQUFxQztnQkFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVELENBQUMsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxLQUFLLENBQUE7UUFDWixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFhO0lBQ3pCO0lBQ0M7OztPQUdHO0lBQ2EsSUFBbUI7SUFFbkM7OztPQUdHO0lBQ2EsS0FBMEI7UUFOMUIsU0FBSSxHQUFKLElBQUksQ0FBZTtRQU1uQixVQUFLLEdBQUwsS0FBSyxDQUFxQjtJQUN4QyxDQUFDO0lBRUo7O09BRUc7SUFDSSxjQUFjO1FBQ3BCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSyxDQUFBO0lBQ2xCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQWFqQyxZQUE2QixlQUFpQztRQUFqQyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFaN0MsZUFBVSxHQUFHLElBQUksY0FBYyxDQUMvQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUNuRCxDQUFBO1FBRUQ7OztXQUdHO1FBQ2Esd0JBQW1CLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzlELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUNwRSxDQUFBO0lBRWdFLENBQUM7SUFFM0QsVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFBO0lBQzFDLENBQUM7Q0FDRCJ9