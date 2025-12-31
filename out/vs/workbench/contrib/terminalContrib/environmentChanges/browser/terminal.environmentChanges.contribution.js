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
var EnvironmentCollectionProvider_1;
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EnvironmentVariableMutatorType, } from '../../../../../platform/terminal/common/environmentVariable.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
// TODO: The rest of the terminal environment changes feature should move here https://github.com/microsoft/vscode/issues/177241
// #region Actions
registerActiveInstanceAction({
    id: "workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */,
    title: localize2('workbench.action.terminal.showEnvironmentContributions', 'Show Environment Contributions'),
    run: async (activeInstance, c, accessor, arg) => {
        const collection = activeInstance.extEnvironmentVariableCollection;
        if (collection) {
            const scope = arg;
            const instantiationService = accessor.get(IInstantiationService);
            const outputProvider = instantiationService.createInstance(EnvironmentCollectionProvider);
            const editorService = accessor.get(IEditorService);
            const timestamp = new Date().getTime();
            const scopeDesc = scope?.workspaceFolder ? ` - ${scope.workspaceFolder.name}` : '';
            const textContent = await outputProvider.provideTextContent(URI.from({
                scheme: EnvironmentCollectionProvider.scheme,
                path: `Environment changes${scopeDesc}`,
                fragment: describeEnvironmentChanges(collection, scope),
                query: `environment-collection-${timestamp}`,
            }));
            if (textContent) {
                await editorService.openEditor({
                    resource: textContent.uri,
                });
            }
        }
    },
});
// #endregion
function describeEnvironmentChanges(collection, scope) {
    let content = `# ${localize('envChanges', 'Terminal Environment Changes')}`;
    const globalDescriptions = collection.getDescriptionMap(undefined);
    const workspaceDescriptions = collection.getDescriptionMap(scope);
    for (const [ext, coll] of collection.collections) {
        content += `\n\n## ${localize('extension', 'Extension: {0}', ext)}`;
        content += '\n';
        const globalDescription = globalDescriptions.get(ext);
        if (globalDescription) {
            content += `\n${globalDescription}\n`;
        }
        const workspaceDescription = workspaceDescriptions.get(ext);
        if (workspaceDescription) {
            // Only show '(workspace)' suffix if there is already a description for the extension.
            const workspaceSuffix = globalDescription
                ? ` (${localize('ScopedEnvironmentContributionInfo', 'workspace')})`
                : '';
            content += `\n${workspaceDescription}${workspaceSuffix}\n`;
        }
        for (const mutator of coll.map.values()) {
            if (filterScope(mutator, scope) === false) {
                continue;
            }
            content += `\n- \`${mutatorTypeLabel(mutator.type, mutator.value, mutator.variable)}\``;
        }
    }
    return content;
}
function filterScope(mutator, scope) {
    if (!mutator.scope) {
        return true;
    }
    // Only mutators which are applicable on the relevant workspace should be shown.
    if (mutator.scope.workspaceFolder &&
        scope?.workspaceFolder &&
        mutator.scope.workspaceFolder.index === scope.workspaceFolder.index) {
        return true;
    }
    return false;
}
function mutatorTypeLabel(type, value, variable) {
    switch (type) {
        case EnvironmentVariableMutatorType.Prepend:
            return `${variable}=${value}\${env:${variable}}`;
        case EnvironmentVariableMutatorType.Append:
            return `${variable}=\${env:${variable}}${value}`;
        default:
            return `${variable}=${value}`;
    }
}
let EnvironmentCollectionProvider = class EnvironmentCollectionProvider {
    static { EnvironmentCollectionProvider_1 = this; }
    static { this.scheme = 'ENVIRONMENT_CHANGES_COLLECTION'; }
    constructor(textModelResolverService, _modelService) {
        this._modelService = _modelService;
        textModelResolverService.registerTextModelContentProvider(EnvironmentCollectionProvider_1.scheme, this);
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, { languageId: 'markdown', onDidChange: Event.None }, resource, false);
    }
};
EnvironmentCollectionProvider = EnvironmentCollectionProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], EnvironmentCollectionProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZW52aXJvbm1lbnRDaGFuZ2VzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9lbnZpcm9ubWVudENoYW5nZXMvYnJvd3Nlci90ZXJtaW5hbC5lbnZpcm9ubWVudENoYW5nZXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sOEJBQThCLEdBSTlCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLGdJQUFnSTtBQUVoSSxrQkFBa0I7QUFFbEIsNEJBQTRCLENBQUM7SUFDNUIsRUFBRSwrR0FBZ0Q7SUFDbEQsS0FBSyxFQUFFLFNBQVMsQ0FDZix3REFBd0QsRUFDeEQsZ0NBQWdDLENBQ2hDO0lBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUMvQyxNQUFNLFVB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