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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJEZWNvcmF0aW9uc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9leHBsb3JlckRlY29yYXRpb25zUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUtoRyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLDBCQUEwQixHQUMxQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTNFLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxRQUFzQjtJQUN4RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZDLE9BQU87WUFDTixPQUFPLEVBQUUsUUFBUSxDQUNoQixlQUFlLEVBQ2YsMENBQTBDLEVBQzFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQzlCO1lBQ0QsTUFBTSxFQUFFLEdBQUc7WUFDWCxLQUFLLEVBQUUseUJBQXlCO1NBQ2hDLENBQUE7SUFDRixDQUFDO0lBQ0QsSUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDN0IsT0FBTztZQUNOLE9BQU8sRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQztZQUNuRCxNQUFNLEVBQUUsUUFBUTtTQUNoQixDQUFBO0lBQ0YsQ0FBQztJQUNELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLE9BQU87WUFDTixPQUFPLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQztZQUNqRCxNQUFNLEVBQUUsR0FBRztTQUNYLENBQUE7SUFDRixDQUFDO0lBQ0QsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDekIsT0FBTztZQUNOLEtBQUssRUFBRSwwQkFBMEI7U0FDakMsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRU0sSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7SUFLdkMsWUFDbUIsZUFBeUMsRUFDakMsY0FBd0M7UUFEeEMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBTG5ELFVBQUssR0FBVyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVMsQ0FBQTtRQUNuQyxjQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU1qRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDakIsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ25DLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWE7UUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0NBQ0QsQ0FBQTtBQXRDWSwyQkFBMkI7SUFNckMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHdCQUF3QixDQUFBO0dBUGQsMkJBQTJCLENBc0N2QyJ9