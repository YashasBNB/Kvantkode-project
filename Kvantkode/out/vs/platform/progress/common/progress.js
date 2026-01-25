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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2dyZXNzL2NvbW1vbi9wcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQU03RSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGlCQUFpQixDQUFDLENBQUE7QUFrQ3BGLE1BQU0sQ0FBTixJQUFrQixnQkFPakI7QUFQRCxXQUFrQixnQkFBZ0I7SUFDakMsK0RBQVksQ0FBQTtJQUNaLHFEQUFPLENBQUE7SUFDUCxtRUFBYyxDQUFBO0lBQ2QsNERBQVcsQ0FBQTtJQUNYLHdFQUFpQixDQUFBO0lBQ2pCLDREQUFXLENBQUE7QUFDWixDQUFDLEVBUGlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFPakM7QUFxREQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBa0I7SUFDakUsS0FBSyxLQUFJLENBQUM7SUFDVixNQUFNLEtBQUksQ0FBQztJQUNYLElBQUksS0FBSSxDQUFDO0NBQ1QsQ0FBQyxDQUFBO0FBTUYsTUFBTSxPQUFPLFFBQVE7YUFDSixTQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBcUIsRUFBRSxNQUFNLEtBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUd6RSxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FB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