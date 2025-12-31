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
import { raceCancellation } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
let StoredFileWorkingCopySaveParticipant = class StoredFileWorkingCopySaveParticipant extends Disposable {
    get length() {
        return this.saveParticipants.size;
    }
    constructor(logService, progressService) {
        super();
        this.logService = logService;
        this.progressService = progressService;
        this.saveParticipants = new LinkedList();
    }
    addSaveParticipant(participant) {
        const remove = this.saveParticipants.push(participant);
        return toDisposable(() => remove());
    }
    async participate(workingCopy, context, progress, token) {
        const cts = new CancellationTokenSource(token);
        // undoStop before participation
        workingCopy.model?.pushStackElement();
        // report to the "outer" progress
        progress.report({
            message: localize('saveParticipants1', 'Running Code Actions and Formatters...'),
        });
        let bubbleCancel = false;
        // create an "inner" progress to allow to skip over long running save participants
        await this.progressService.withProgress({
            priority: NotificationPriority.URGENT,
            location: 15 /* ProgressLocation.Notification */,
            cancellable: localize('skip', 'Skip'),
            delay: workingCopy.isDirty() ? 5000 : 3000,
        }, async (progress) => {
            const participants = Array.from(this.saveParticipants).sort((a, b) => {
                const aValue = a.ordinal ?? 0;
                const bValue = b.ordinal ?? 0;
                return aValue - bValue;
            });
            for (const saveParticipant of participants) {
                if (cts.token.isCancellationRequested || workingCopy.isDisposed()) {
                    break;
                }
                try {
                    const promise = saveParticipant.participate(workingCopy, context, progress, cts.token);
                    await raceCancellation(promise, cts.token);
                }
                catch (err) {
                    if (!isCancellationError(err)) {
                        this.logService.error(err);
                    }
                    else if (!cts.token.isCancellationRequested) {
                        // we see a cancellation error BUT the token didn't signal it
                        // this means the participant wants the save operation to be cancelled
                        cts.cancel();
                        bubbleCancel = true;
                    }
                }
            }
        }, () => {
            cts.cancel();
        });
        // undoStop after participation
        workingCopy.model?.pushStackElement();
        cts.dispose();
        if (bubbleCancel) {
            throw new CancellationError();
        }
    }
    dispose() {
        this.saveParticipants.clear();
        super.dispose();
    }
};
StoredFileWorkingCopySaveParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IProgressService)
], StoredFileWorkingCopySaveParticipant);
export { StoredFileWorkingCopySaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5U2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi9zdG9yZWRGaWxlV29ya2luZ0NvcHlTYXZlUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sZ0JBQWdCLEdBR2hCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFlLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU01RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXRDLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQXFDLFNBQVEsVUFBVTtJQUduRSxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUE7SUFDbEMsQ0FBQztJQUVELFlBQ2MsVUFBd0MsRUFDbkMsZUFBa0Q7UUFFcEUsS0FBSyxFQUFFLENBQUE7UUFIdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNsQixvQkFBZSxHQUFmLGVBQWUsQ0FB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