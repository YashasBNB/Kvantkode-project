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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZW52aXJvbm1lbnRDaGFuZ2VzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2Vudmlyb25tZW50Q2hhbmdlcy9icm93c2VyL3Rlcm1pbmFsLmVudmlyb25tZW50Q2hhbmdlcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTiw4QkFBOEIsR0FJOUIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUzRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFcEYsZ0lBQWdJO0FBRWhJLGtCQUFrQjtBQUVsQiw0QkFBNEIsQ0FBQztJQUM1QixFQUFFLCtHQUFnRDtJQUNsRCxLQUFLLEVBQUUsU0FBUyxDQUNmLHdEQUF3RCxFQUN4RCxnQ0FBZ0MsQ0FDaEM7SUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQy9DLE1B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