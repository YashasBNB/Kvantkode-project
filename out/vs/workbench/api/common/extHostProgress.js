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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQWlCLE1BQU0sK0NBQStDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTFFLE1BQU0sT0FBTyxlQUFlO0lBSzNCLFlBQVksS0FBOEI7UUFIbEMsYUFBUSxHQUFXLENBQUMsQ0FBQTtRQUNwQixtQ0FBOEIsR0FBeUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUd2RixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtJQUNwQixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FDakIsU0FBZ0MsRUFDaEMsT0FBd0IsRUFDeEIsSUFBa0Y7UUFFbEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzlCLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQTtRQUNoRCxNQUFNLE1BQU0sR0FBRztZQUNkLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJO1lBQzlDLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUs7U0FDOUIsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNO2FBQ1QsY0FB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