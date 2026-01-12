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
import { Emitter } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { listInvalidItemForeground, listDeemphasizedForeground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { explorerRootErrorEmitter } from './explorerViewer.js';
import { IExplorerService } from '../files.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
export function provideDecorations(fileStat) {
    if (fileStat.isRoot && fileStat.error) {
        return {
            tooltip: localize('canNotResolve', 'Unable to resolve workspace folder ({0})', toErrorMessage(fileStat.error)),
            letter: '!',
            color: listInvalidItemForeground,
        };
    }
    if (fileStat.isSymbolicLink) {
        return {
            tooltip: localize('symbolicLlink', 'Symbolic Link'),
            letter: '\u2937',
        };
    }
    if (fileStat.isUnknown) {
        return {
            tooltip: localize('unknown', 'Unknown File Type'),
            letter: '?',
        };
    }
    if (fileStat.isExcluded) {
        return {
            color: listDeemphasizedForeground,
        };
    }
    return undefined;
}
let ExplorerDecorationsProvider = class ExplorerDecorationsProvider {
    constructor(explorerService, contextService) {
        this.explorerService = explorerService;
        this.label = localize('label', 'Explorer');
        this._onDidChange = new Emitter();
        this.toDispose = new DisposableStore();
        this.toDispose.add(this._onDidChange);
        this.toDispose.add(contextService.onDidChangeWorkspaceFolders((e) => {
            this._onDidChange.fire(e.changed.concat(e.added).map((wf) => wf.uri));
        }));
        this.toDispose.add(explorerRootErrorEmitter.event((resource) => {
            this._onDidChange.fire([resource]);
        }));
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    async provideDecorations(resource) {
        const fileStat = this.explorerService.findClosest(resource);
        if (!fileStat) {
            throw new Error('ExplorerItem not found');
        }
        return provideDecorations(fileStat);
    }
    dispose() {
        this.toDispose.dispose();
    }
};
ExplorerDecorationsProvider = __decorate([
    __param(0, IExplorerService),
    __param(1, IWorkspaceContextService)
], ExplorerDecorationsProvider);
export { ExplorerDecorationsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJEZWNvcmF0aW9uc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3ZpZXdzL2V4cGxvcmVyRGVjb3JhdGlvbnNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBS2hHLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsMEJBQTBCLEdBQzFCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFM0UsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFFBQXNCO0lBQ3hELElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkMsT0FBTztZQUNOLE9BQU8sRUFBRSxRQUFRLENBQ2hCLGVBQWUsRUFDZiwwQ0FBMEMsRUFDMUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FDOUI7WUFDRCxNQUFNLEVBQUUsR0FBRztZQUNYLEtBQUssRUFBRSx5QkFBeUI7U0FDaEMsQ0FBQTtJQUNGLENBQUM7SUFDRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztR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