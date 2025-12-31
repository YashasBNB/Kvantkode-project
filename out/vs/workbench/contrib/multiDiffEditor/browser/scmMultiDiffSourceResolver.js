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
var ScmMultiDiffSourceResolver_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent, ValueWithChangeEventFromObservable, waitForState, } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize2 } from '../../../../nls.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem, } from './multiDiffSourceResolverService.js';
let ScmMultiDiffSourceResolver = class ScmMultiDiffSourceResolver {
    static { ScmMultiDiffSourceResolver_1 = this; }
    static { this._scheme = 'scm-multi-diff-source'; }
    static getMultiDiffSourceUri(repositoryUri, groupId) {
        return URI.from({
            scheme: ScmMultiDiffSourceResolver_1._scheme,
            query: JSON.stringify({ repositoryUri, groupId }),
        });
    }
    static parseUri(uri) {
        if (uri.scheme !== ScmMultiDiffSourceResolver_1._scheme) {
            return undefined;
        }
        let query;
        try {
            query = JSON.parse(uri.query);
        }
        catch (e) {
            return undefined;
        }
        if (typeof query !== 'object' || query === null) {
            return undefined;
        }
        const { repositoryUri, groupId } = query;
        if (typeof repositoryUri !== 'string' || typeof groupId !== 'string') {
            return undefined;
        }
        return { repositoryUri: URI.parse(repositoryUri), groupId };
    }
    constructor(_scmService, _activityService) {
        this._scmService = _scmService;
        this._activityService = _activityService;
    }
    canHandleUri(uri) {
        return ScmMultiDiffSourceResolver_1.parseUri(uri) !== undefined;
    }
    async resolveDiffSource(uri) {
        const { repositoryUri, groupId } = ScmMultiDiffSourceResolver_1.parseUri(uri);
        const repository = await waitForState(observableFromEvent(this, this._scmService.onDidAddRepository, () => [...this._scmService.repositories].find((r) => r.provider.rootUri?.toString() === repositoryUri.toString())));
        const group = await waitForState(observableFromEvent(this, repository.provider.onDidChangeResourceGroups, () => repository.provider.groups.find((g) => g.id === groupId)));
        const scmActivities = observableFromEvent(this._activityService.onDidChangeActivity, () => [
            ...this._activityService.getViewContainerActivities('workbench.view.scm'),
        ]);
        const scmViewHasNoProgressBadge = scmActivities.map((activities) => !activities.some((a) => a.badge instanceof ProgressBadge));
        await waitForState(scmViewHasNoProgressBadge, (v) => v);
        return new ScmResolvedMultiDiffSource(group, repository);
    }
};
ScmMultiDiffSourceResolver = ScmMultiDiffSourceResolver_1 = __decorate([
    __param(0, ISCMService),
    __param(1, IActivityService)
], ScmMultiDiffSourceResolver);
export { ScmMultiDiffSourceResolver };
class ScmResolvedMultiDiffSource {
    constructor(_group, _repository) {
        this._group = _group;
        this._repository = _repository;
        this._resources = observableFromEvent(this._group.onDidChangeResources, () => 
        /** @description resources */ this._group.resources.map((e) => new MultiDiffEditorItem(e.multiDiffEditorOriginalUri, e.multiDiffEditorModifiedUri, e.sourceUri)));
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            scmResourceGroup: this._group.id,
            scmProvider: this._repository.provider.contextValue,
        };
    }
}
let ScmMultiDiffSourceResolverContribution = class ScmMultiDiffSourceResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.scmMultiDiffSourceResolver'; }
    constructor(instantiationService, multiDiffSourceResolverService) {
        super();
        this._register(multiDiffSourceResolverService.registerResolver(instantiationService.createInstance(ScmMultiDiffSourceResolver)));
    }
};
ScmMultiDiffSourceResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService)
], ScmMultiDiffSourceResolverContribution);
export { ScmMultiDiffSourceResolverContribution };
export class OpenScmGroupAction extends Action2 {
    static async openMultiFileDiffEditor(editorService, label, repositoryRootUri, resourceGroupId, options) {
        if (!repositoryRootUri) {
            return;
        }
        const multiDiffSource = ScmMultiDiffSourceResolver.getMultiDiffSourceUri(repositoryRootUri.toString(), resourceGroupId);
        return await editorService.openEditor({ label, multiDiffSource, options });
    }
    constructor() {
        super({
            id: '_workbench.openScmMultiDiffEditor',
            title: localize2('openChanges', 'Open Changes'),
            f1: false,
        });
    }
    async run(accessor, options) {
        const editorService = accessor.get(IEditorService);
        await OpenScmGroupAction.openMultiFileDiffEditor(editorService, options.title, URI.revive(options.repositoryUri), options.resourceGroupId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtTXVsdGlEaWZmU291cmNlUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tdWx0aURpZmZFZGl0b3IvYnJvd3Nlci9zY21NdWx0aURpZmZTb3VyY2VSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsa0NBQWtDLEVBQ2xDLFlBQVksR0FDWixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV4RSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQXFDLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hGLE9BQU8sRUFFTiwrQkFBK0IsRUFFL0IsbUJBQW1CLEdBQ25CLE1BQU0scUNBQXFDLENBQUE7QUFFckMsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMEI7O2FBQ2QsWUFBTyxHQUFHLHVCQUF1QixBQUExQixDQUEwQjtJQUVsRCxNQUFNLENBQUMscUJBQXFCLENBQUMsYUFBcUIsRUFBRSxPQUFlO1FBQ3pFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztZQUNmLE1BQU0sRUFBRSw0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