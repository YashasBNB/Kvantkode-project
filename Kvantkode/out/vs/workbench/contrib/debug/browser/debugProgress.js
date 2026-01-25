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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdQcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Byb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sRUFBRSxhQUFhLEVBQWlCLFVBQVUsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5QjtJQUdyQyxZQUNnQixZQUEyQixFQUN4QixlQUFpQyxFQUNwQyxZQUEyQjtRQUxuQyxjQUFTLEdBQWtCLEVBQUUsQ0FBQTtRQU9wQyxJQUFJLGdCQUF5QyxDQUFBO1FBQzdDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxPQUFrQyxFQUFFLEVBQUU7WUFDL0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDMUIsZ0JBQWdCLEdBQUcsU0FBUyxDQUFBO1lBQzdCLENBQUM7WUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsRUFBRTtvQkFDMUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDdkMscUVBQXFFO3dCQUNyRSxNQUFNLFFBQVEs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