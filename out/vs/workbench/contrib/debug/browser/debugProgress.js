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
import { Event } from '../../../../base/common/event.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IDebugService, VIEWLET_ID } from '../common/debug.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
let DebugProgressContribution = class DebugProgressContribution {
    constructor(debugService, progressService, viewsService) {
        this.toDispose = [];
        let progressListener;
        const listenOnProgress = (session) => {
            if (progressListener) {
                progressListener.dispose();
                progressListener = undefined;
            }
            if (session) {
                progressListener = session.onDidProgressStart(async (progressStartEvent) => {
                    const promise = new Promise((r) => {
                        // Show progress until a progress end event comes or the session ends
                        const listener = Event.any(Event.filter(session.onDidProgressEnd, (e) => e.body.progressId === progressStartEvent.body.progressId), session.onDidEndAdapter)(() => {
                            listener.dispose();
                            r();
                        });
                    });
                    if (viewsService.isViewContainerVisible(VIEWLET_ID)) {
                        progressService.withProgress({ location: VIEWLET_ID }, () => promise);
                    }
                    const source = debugService
                        .getAdapterManager()
                        .getDebuggerLabel(session.configuration.type);
                    progressService.withProgress({
                        location: 15 /* ProgressLocation.Notification */,
                        title: progressStartEvent.body.title,
                        cancellable: progressStartEvent.body.cancellable,
                        source,
                        delay: 500,
                    }, (progressStep) => {
                        let total = 0;
                        const reportProgress = (progress) => {
                            let increment = undefined;
                            if (typeof progress.percentage === 'number') {
                                increment = progress.percentage - total;
                                total += increment;
                            }
                            progressStep.report({
                                message: progress.message,
                                increment,
                                total: typeof increment === 'number' ? 100 : undefined,
                            });
                        };
                        if (progressStartEvent.body.message) {
                            reportProgress(progressStartEvent.body);
                        }
                        const progressUpdateListener = session.onDidProgressUpdate((e) => {
                            if (e.body.progressId === progressStartEvent.body.progressId) {
                                reportProgress(e.body);
                            }
                        });
                        return promise.then(() => progressUpdateListener.dispose());
                    }, () => session.cancel(progressStartEvent.body.progressId));
                });
            }
        };
        this.toDispose.push(debugService.getViewModel().onDidFocusSession(listenOnProgress));
        listenOnProgress(debugService.getViewModel().focusedSession);
        this.toDispose.push(debugService.onWillNewSession((session) => {
            if (!progressListener) {
                listenOnProgress(session);
            }
        }));
    }
    dispose() {
        dispose(this.toDispose);
    }
};
DebugProgressContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IProgressService),
    __param(2, IViewsService)
], DebugProgressContribution);
export { DebugProgressContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdQcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdQcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsYUFBYSxFQUFpQixVQUFVLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdkUsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBeUI7SUFHckMsWUFDZ0IsWUFBMkIsRUFDeEIsZUFBaUMsRUFDcEMsWUFBMkI7UUFMbkMsY0FBUyxHQUFrQixFQUFFLENBQUE7UUFPcEMsSUFBSSxnQkFBeUMsQ0FBQTtRQUM3QyxNQUFNLGdCQUFnQixHQUFHLENBQUMsT0FBa0MsRUFBRSxFQUFFO1lBQy9ELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQzFCLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixnQkFBZ0IsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEVBQUU7b0JBQzFFLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUU7d0JBQ3ZDLHFFQUFxRTt3QkFDckUsTUFBTSxRQUFRLEdBQUcs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