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
import { ProgressLocation } from './extHostTypeConverters.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { CancellationTokenSource, CancellationToken } from '../../../base/common/cancellation.js';
import { throttle } from '../../../base/common/decorators.js';
import { onUnexpectedExternalError } from '../../../base/common/errors.js';
export class ExtHostProgress {
    constructor(proxy) {
        this._handles = 0;
        this._mapHandleToCancellationSource = new Map();
        this._proxy = proxy;
    }
    async withProgress(extension, options, task) {
        const handle = this._handles++;
        const { title, location, cancellable } = options;
        const source = {
            label: extension.displayName || extension.name,
            id: extension.identifier.value,
        };
        this._proxy
            .$startProgress(handle, { location: ProgressLocation.from(location), title, source, cancellable }, !extension.isUnderDevelopment ? extension.identifier.value : undefined)
            .catch(onUnexpectedExternalError);
        return this._withProgress(handle, task, !!cancellable);
    }
    _withProgress(handle, task, cancellable) {
        let source;
        if (cancellable) {
            source = new CancellationTokenSource();
            this._mapHandleToCancellationSource.set(handle, source);
        }
        const progressEnd = (handle) => {
            this._proxy.$progressEnd(handle);
            this._mapHandleToCancellationSource.delete(handle);
            source?.dispose();
        };
        let p;
        try {
            p = task(new ProgressCallback(this._proxy, handle), cancellable && source ? source.token : CancellationToken.None);
        }
        catch (err) {
            progressEnd(handle);
            throw err;
        }
        p.then((result) => progressEnd(handle), (err) => progressEnd(handle));
        return p;
    }
    $acceptProgressCanceled(handle) {
        const source = this._mapHandleToCancellationSource.get(handle);
        if (source) {
            source.cancel();
            this._mapHandleToCancellationSource.delete(handle);
        }
    }
}
function mergeProgress(result, currentValue) {
    result.message = currentValue.message;
    if (typeof currentValue.increment === 'number') {
        if (typeof result.increment === 'number') {
            result.increment += currentValue.increment;
        }
        else {
            result.increment = currentValue.increment;
        }
    }
    return result;
}
class ProgressCallback extends Progress {
    constructor(_proxy, _handle) {
        super((p) => this.throttledReport(p));
        this._proxy = _proxy;
        this._handle = _handle;
    }
    throttledReport(p) {
        this._proxy.$progressReport(this._handle, p);
    }
}
__decorate([
    throttle(100, (result, currentValue) => mergeProgress(result, currentValue), () => Object.create(null))
], ProgressCallback.prototype, "throttledReport", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0UHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBaUIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFMUUsTUFBTSxPQUFPLGVBQWU7SUFLM0IsWUFBWSxLQUE4QjtRQUhsQyxhQUFRLEdBQVcsQ0FBQyxDQUFBO1FBQ3BCLG1DQUE4QixHQUF5QyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBR3ZGLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixTQUFnQyxFQUNoQyxPQUF3QixFQUN4QixJQUFrRjtRQUVsRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDOUIsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFBO1FBQ2hELE1BQU0sTUFBTSxHQUFHO1lBQ2QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUk7WUFDOUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSztTQUM5QixDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU07YUFD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