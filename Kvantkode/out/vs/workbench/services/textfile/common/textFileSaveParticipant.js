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
import { localize } from '../../../../nls.js';
import { NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
let TextFileSaveParticipant = class TextFileSaveParticipant extends Disposable {
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
    async participate(model, context, progress, token) {
        const cts = new CancellationTokenSource(token);
        // undoStop before participation
        model.textEditorModel?.pushStackElement();
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
            delay: model.isDirty() ? 5000 : 3000,
        }, async (progress) => {
            const participants = Array.from(this.saveParticipants).sort((a, b) => {
                const aValue = a.ordinal ?? 0;
                const bValue = b.ordinal ?? 0;
                return aValue - bValue;
            });
            for (const saveParticipant of participants) {
                if (cts.token.isCancellationRequested || !model.textEditorModel /* disposed */) {
                    break;
                }
                try {
                    const promise = saveParticipant.participate(model, context, progress, cts.token);
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
        model.textEditorModel?.pushStackElement();
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
TextFileSaveParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IProgressService)
], TextFileSaveParticipant);
export { TextFileSaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEZpbGVTYXZlUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sZ0JBQWdCLEdBR2hCLE1BQU0sa0RBQWtELENBQUE7QUFNekQsT0FBTyxFQUFlLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5GLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUd0RCxZQUNjLFVBQXdDLEVBQ25DLGVBQWtEO1FBRXBFLEtBQUssRUFBRSxDQUFBO1FBSHVCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBSnBELHFCQUFnQixHQUFHLElBQUksVUFBVSxFQUE0QixDQUFBO0lBTzlFLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxXQUFxQztRQUN2RCxNQUFNLE1BQU0s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