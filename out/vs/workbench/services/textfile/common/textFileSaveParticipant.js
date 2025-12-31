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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvY29tbW9uL3RleHRGaWxlU2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUVOLGdCQUFnQixHQUdoQixNQUFNLGtEQUFrRCxDQUFBO0FBTXpELE9BQU8sRUFBZSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFHdEQsWUFDYyxVQUF3QyxFQUNuQyxlQUFrRDtRQUVwRSxLQUFLLEVBQUUsQ0FBQTtRQUh1QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2xCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUpwRCxxQkFBZ0IsR0FBRyxJQUFJLFVBQVUsRUFBNEIsQ0FBQTtJQU85RSxDQUFDO0lBRUQsa0JBQWtCLENBQUMsV0FBcUM7UUFDdkQsTUFBTSxNQUFNLEdBQUcs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