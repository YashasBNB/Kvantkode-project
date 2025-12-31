/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseObservable, TransactionImpl, } from './base.js';
import { getLogger } from './logging/logging.js';
/**
 * Holds off updating observers until the value is actually read.
 */
export class LazyObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'LazyObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._isUpToDate = true;
        this._deltas = [];
        this._updateCounter = 0;
        this._value = initialValue;
    }
    get() {
        this._update();
        return this._value;
    }
    _update() {
        if (this._isUpToDate) {
            return;
        }
        this._isUpToDate = true;
        if (this._deltas.length > 0) {
            for (const change of this._deltas) {
                getLogger()?.handleObservableUpdated(this, {
                    change,
                    didChange: true,
                    oldValue: '(unknown)',
                    newValue: this._value,
                    hadValue: true,
                });
                for (const observer of this._observers) {
                    observer.handleChange(this, change);
                }
            }
            this._deltas.length = 0;
        }
        else {
            getLogger()?.handleObservableUpdated(this, {
                change: undefined,
                didChange: true,
                oldValue: '(unknown)',
                newValue: this._value,
                hadValue: true,
            });
            for (const observer of this._observers) {
                observer.handleChange(this, undefined);
            }
        }
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            for (const observer of this._observers) {
                observer.beginUpdate(this);
            }
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._update();
            // End update could change the observer list.
            const observers = [...this._observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
        }
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this._observers.has(observer) && this._updateCounter > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            observer.beginUpdate(this);
        }
    }
    removeObserver(observer) {
        const shouldCallEndUpdate = this._observers.has(observer) && this._updateCounter > 0;
        super.removeObserver(observer);
        if (shouldCallEndUpdate) {
            // Calling end update after removing the observer makes sure endUpdate cannot be called twice here.
            observer.endUpdate(this);
        }
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            this._isUpToDate = false;
            this._setValue(value);
            if (change !== undefined) {
                this._deltas.push(change);
            }
            tx.updateObserver({
                beginUpdate: () => this._beginUpdate(),
                endUpdate: () => this._endUpdate(),
                handleChange: (observable, change) => { },
                handlePossibleChange: (observable) => { },
            }, this);
            if (this._updateCounter > 1) {
                // We already started begin/end update, so we need to manually call handlePossibleChange
                for (const observer of this._observers) {
                    observer.handlePossibleChange(this);
                }
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eU9ic2VydmFibGVWYWx1ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sYXp5T2JzZXJ2YWJsZVZhbHVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixjQUFjLEVBSWQsZUFBZSxHQUNmLE1BQU0sV0FBVyxDQUFBO0FBRWxCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVoRDs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFDWixTQUFRLGNBQTBCO0lBT2xDLElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUE7SUFDdkUsQ0FBQztJQUVELFlBQ2tCLGNBQTZCLEVBQzlDLFlBQWUsRUFDRSxtQkFBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFKVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZTtRQUU3Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBVmxELGdCQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ1QsWUFBTyxHQUFjLEVBQUUsQ0FBQTtRQXNEaEMsbUJBQWMsR0FBRyxDQUFDLENBQUE7UUExQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFBO0lBQzNCLENBQUM7SUFFZSxHQUFHO1FBQ2xCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRU8sT0FBTztRQUNkLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFFdkIsSUFBSSxJQUFJLENBQUMsT0FB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