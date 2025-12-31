/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DeferredPromise } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IProgressService = createDecorator('progressService');
export var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["Explorer"] = 1] = "Explorer";
    ProgressLocation[ProgressLocation["Scm"] = 3] = "Scm";
    ProgressLocation[ProgressLocation["Extensions"] = 5] = "Extensions";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
    ProgressLocation[ProgressLocation["Dialog"] = 20] = "Dialog";
})(ProgressLocation || (ProgressLocation = {}));
export const emptyProgressRunner = Object.freeze({
    total() { },
    worked() { },
    done() { },
});
export class Progress {
    static { this.None = Object.freeze({ report() { } }); }
    get value() {
        return this._value;
    }
    constructor(callback) {
        this.callback = callback;
    }
    report(item) {
        this._value = item;
        this.callback(this._value);
    }
}
export class AsyncProgress {
    get value() {
        return this._value;
    }
    constructor(callback) {
        this.callback = callback;
    }
    report(item) {
        if (!this._asyncQueue) {
            this._asyncQueue = [item];
        }
        else {
            this._asyncQueue.push(item);
        }
        this._processAsyncQueue();
    }
    async _processAsyncQueue() {
        if (this._processingAsyncQueue) {
            return;
        }
        try {
            this._processingAsyncQueue = true;
            while (this._asyncQueue && this._asyncQueue.length) {
                const item = this._asyncQueue.shift();
                this._value = item;
                await this.callback(this._value);
            }
        }
        finally {
            this._processingAsyncQueue = false;
            const drainListener = this._drainListener;
            this._drainListener = undefined;
            drainListener?.();
        }
    }
    drain() {
        if (this._processingAsyncQueue) {
            return new Promise((resolve) => {
                const prevListener = this._drainListener;
                this._drainListener = () => {
                    prevListener?.();
                    resolve();
                };
            });
        }
        return Promise.resolve();
    }
}
/**
 * RAII-style progress instance that allows imperative reporting and hides
 * once `dispose()` is called.
 */
let UnmanagedProgress = class UnmanagedProgress extends Disposable {
    constructor(options, progressService) {
        super();
        this.deferred = new DeferredPromise();
        progressService.withProgress(options, (reporter) => {
            this.reporter = reporter;
            if (this.lastStep) {
                reporter.report(this.lastStep);
            }
            return this.deferred.p;
        });
        this._register(toDisposable(() => this.deferred.complete()));
    }
    report(step) {
        if (this.reporter) {
            this.reporter.report(step);
        }
        else {
            this.lastStep = step;
        }
    }
};
UnmanagedProgress = __decorate([
    __param(1, IProgressService)
], UnmanagedProgress);
export { UnmanagedProgress };
export class LongRunningOperation extends Disposable {
    constructor(progressIndicator) {
        super();
        this.progressIndicator = progressIndicator;
        this.currentOperationId = 0;
        this.currentOperationDisposables = this._register(new DisposableStore());
    }
    start(progressDelay) {
        // Stop any previous operation
        this.stop();
        // Start new
        const newOperationId = ++this.currentOperationId;
        const newOperationToken = new CancellationTokenSource();
        this.currentProgressTimeout = setTimeout(() => {
            if (newOperationId === this.currentOperationId) {
                this.currentProgressRunner = this.progressIndicator.show(true);
            }
        }, progressDelay);
        this.currentOperationDisposables.add(toDisposable(() => clearTimeout(this.currentProgressTimeout)));
        this.currentOperationDisposables.add(toDisposable(() => newOperationToken.cancel()));
        this.currentOperationDisposables.add(toDisposable(() => this.currentProgressRunner ? this.currentProgressRunner.done() : undefined));
        return {
            id: newOperationId,
            token: newOperationToken.token,
            stop: () => this.doStop(newOperationId),
            isCurrent: () => this.currentOperationId === newOperationId,
        };
    }
    stop() {
        this.doStop(this.currentOperationId);
    }
    doStop(operationId) {
        if (this.currentOperationId === operationId) {
            this.currentOperationDisposables.clear();
        }
    }
}
export const IEditorProgressService = createDecorator('editorProgressService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9ncmVzcy9jb21tb24vcHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFNN0UsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFBO0FBa0NwRixNQUFNLENBQU4sSUFBa0IsZ0JBT2pCO0FBUEQsV0FBa0IsZ0JBQWdCO0lBQ2pDLCtEQUFZLENBQUE7SUFDWixxREFBTyxDQUFBO0lBQ1AsbUVBQWMsQ0FBQTtJQUNkLDREQUFXLENBQUE7SUFDWCx3RUFBaUIsQ0FBQTtJQUNqQiw0REFBVyxDQUFBO0FBQ1osQ0FBQyxFQVBpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBT2pDO0FBcURELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQWtCO0lBQ2pFLEtBQUssS0FBSSxDQUFDO0lBQ1YsTUFBTSxLQUFJLENBQUM7SUFDWCxJQUFJLEtBQUksQ0FBQztDQUNULENBQUMsQ0FBQTtBQU1GLE1BQU0sT0FBTyxRQUFRO2FBQ0osU0FBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQXFCLEVBQUUsTUFBTSxLQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFHekUsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFB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