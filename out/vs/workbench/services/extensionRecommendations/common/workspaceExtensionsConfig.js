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
import { distinct } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isWorkspace, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { ResourceMap } from '../../../../base/common/map.js';
export const EXTENSIONS_CONFIG = '.vscode/extensions.json';
export const IWorkspaceExtensionsConfigService = createDecorator('IWorkspaceExtensionsConfigService');
let WorkspaceExtensionsConfigService = class WorkspaceExtensionsConfigService extends Disposable {
    constructor(workspaceContextService, fileService, quickInputService, modelService, languageService, jsonEditingService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.jsonEditingService = jsonEditingService;
        this._onDidChangeExtensionsConfigs = this._register(new Emitter());
        this.onDidChangeExtensionsConfigs = this._onDidChangeExtensionsConfigs.event;
        this._register(workspaceContextService.onDidChangeWorkspaceFolders((e) => this._onDidChangeExtensionsConfigs.fire()));
        this._register(fileService.onDidFilesChange((e) => {
            const workspace = workspaceContextService.getWorkspace();
            if ((workspace.configuration && e.affects(workspace.configuration)) ||
                workspace.folders.some((folder) => e.affects(folder.toResource(EXTENSIONS_CONFIG)))) {
                this._onDidChangeExtensionsConfigs.fire();
            }
        }));
    }
    async getExtensionsConfigs() {
        const workspace = this.workspaceContextService.getWorkspace();
        const result = [];
        const workspaceExtensionsConfigContent = workspace.configuration
            ? await this.resolveWorkspaceExtensionConfig(workspace.configuration)
            : undefined;
        if (workspaceExtensionsConfigContent) {
            result.push(workspaceExtensionsConfigContent);
        }
        result.push(...(await Promise.all(workspace.folders.map((workspaceFolder) => this.resolveWorkspaceFolderExtensionConfig(workspaceFolder)))));
        return result;
    }
    async getRecommendations() {
        const configs = await this.getExtensionsConfigs();
        return distinct(configs.flatMap((c) => c.recommendations ? c.recommendations.map((c) => c.toLowerCase()) : []));
    }
    async getUnwantedRecommendations() {
        const configs = await this.getExtensionsConfigs();
        return distinct(configs.flatMap((c) => c.unwantedRecommendations ? c.unwantedRecommendations.map((c) => c.toLowerCase()) : []));
    }
    async toggleRecommendation(extensionId) {
        extensionId = extensionId.toLowerCase();
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceExtensionsConfigContent = workspace.configuration
            ? await this.resolveWorkspaceExtensionConfig(workspace.configuration)
            : undefined;
        const workspaceFolderExtensionsConfigContents = new ResourceMap();
        await Promise.all(workspace.folders.map(async (workspaceFolder) => {
            const extensionsConfigContent = await this.resolveWorkspaceFolderExtensionConfig(workspaceFolder);
            workspaceFolderExtensionsConfigContents.set(workspaceFolder.uri, extensionsConfigContent);
        }));
        const isWorkspaceRecommended = workspaceExtensionsConfigContent &&
            workspaceExtensionsConfigContent.recommendations?.some((r) => r.toLowerCase() === extensionId);
        const recommendedWorksapceFolders = workspace.folders.filter((workspaceFolder) => workspaceFolderExtensionsConfigContents
            .get(workspaceFolder.uri)
            ?.recommendations?.some((r) => r.toLowerCase() === extensionId));
        const isRecommended = isWorkspaceRecommended || recommendedWorksapceFolders.length > 0;
        const workspaceOrFolders = isRecommended
            ? await this.pickWorkspaceOrFolders(recommendedWorksapceFolders, isWorkspaceRecommended ? workspace : undefined, localize('select for remove', 'Remove extension recommendation from'))
            : await this.pickWorkspaceOrFolders(workspace.folders, workspace.configuration ? workspace : undefined, localize('select for add', 'Add extension recommendation to'));
        for (const workspaceOrWorkspaceFolder of workspaceOrFolders) {
            if (isWorkspace(workspaceOrWorkspaceFolder)) {
                await this.addOrRemoveWorkspaceRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceExtensionsConfigContent, !isRecommended);
            }
            else {
                await this.addOrRemoveWorkspaceFolderRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceFolderExtensionsConfigContents.get(workspaceOrWorkspaceFolder.uri), !isRecommended);
            }
        }
    }
    async toggleUnwantedRecommendation(extensionId) {
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceExtensionsConfigContent = workspace.configuration
            ? await this.resolveWorkspaceExtensionConfig(workspace.configuration)
            : undefined;
        const workspaceFolderExtensionsConfigContents = new ResourceMap();
        await Promise.all(workspace.folders.map(async (workspaceFolder) => {
            const extensionsConfigContent = await this.resolveWorkspaceFolderExtensionConfig(workspaceFolder);
            workspaceFolderExtensionsConfigContents.set(workspaceFolder.uri, extensionsConfigContent);
        }));
        const isWorkspaceUnwanted = workspaceExtensionsConfigContent &&
            workspaceExtensionsConfigContent.unwantedRecommendations?.some((r) => r === extensionId);
        const unWantedWorksapceFolders = workspace.folders.filter((workspaceFolder) => workspaceFolderExtensionsConfigContents
            .get(workspaceFolder.uri)
            ?.unwantedRecommendations?.some((r) => r === extensionId));
        const isUnwanted = isWorkspaceUnwanted || unWantedWorksapceFolders.length > 0;
        const workspaceOrFolders = isUnwanted
            ? await this.pickWorkspaceOrFolders(unWantedWorksapceFolders, isWorkspaceUnwanted ? workspace : undefined, localize('select for remove', 'Remove extension recommendation from'))
            : await this.pickWorkspaceOrFolders(workspace.folders, workspace.configuration ? workspace : undefined, localize('select for add', 'Add extension recommendation to'));
        for (const workspaceOrWorkspaceFolder of workspaceOrFolders) {
            if (isWorkspace(workspaceOrWorkspaceFolder)) {
                await this.addOrRemoveWorkspaceUnwantedRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceExtensionsConfigContent, !isUnwanted);
            }
            else {
                await this.addOrRemoveWorkspaceFolderUnwantedRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceFolderExtensionsConfigContents.get(workspaceOrWorkspaceFolder.uri), !isUnwanted);
            }
        }
    }
    async addOrRemoveWorkspaceFolderRecommendation(extensionId, workspaceFolder, extensionsConfigContent, add) {
        const values = [];
        if (add) {
            if (Array.isArray(extensionsConfigContent.recommendations)) {
                values.push({ path: ['recommendations', -1], value: extensionId });
            }
            else {
                values.push({ path: ['recommendations'], value: [extensionId] });
            }
            const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
            if (unwantedRecommendationEdit) {
                values.push(unwantedRecommendationEdit);
            }
        }
        else if (extensionsConfigContent.recommendations) {
            const recommendationEdit = this.getEditToRemoveValueFromArray(['recommendations'], extensionsConfigContent.recommendations, extensionId);
            if (recommendationEdit) {
                values.push(recommendationEdit);
            }
        }
        if (values.length) {
            return this.jsonEditingService.write(workspaceFolder.toResource(EXTENSIONS_CONFIG), values, true);
        }
    }
    async addOrRemoveWorkspaceRecommendation(extensionId, workspace, extensionsConfigContent, add) {
        const values = [];
        if (extensionsConfigContent) {
            if (add) {
                const path = ['extensions', 'recommendations'];
                if (Array.isArray(extensionsConfigContent.recommendations)) {
                    values.push({ path: [...path, -1], value: extensionId });
                }
                else {
                    values.push({ path, value: [extensionId] });
                }
                const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
                if (unwantedRecommendationEdit) {
                    values.push(unwantedRecommendationEdit);
                }
            }
            else if (extensionsConfigContent.recommendations) {
                const recommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'recommendations'], extensionsConfigContent.recommendations, extensionId);
                if (recommendationEdit) {
                    values.push(recommendationEdit);
                }
            }
        }
        else if (add) {
            values.push({ path: ['extensions'], value: { recommendations: [extensionId] } });
        }
        if (values.length) {
            return this.jsonEditingService.write(workspace.configuration, values, true);
        }
    }
    async addOrRemoveWorkspaceFolderUnwantedRecommendation(extensionId, workspaceFolder, extensionsConfigContent, add) {
        const values = [];
        if (add) {
            const path = ['unwantedRecommendations'];
            if (Array.isArray(extensionsConfigContent.unwantedRecommendations)) {
                values.push({ path: [...path, -1], value: extensionId });
            }
            else {
                values.push({ path, value: [extensionId] });
            }
            const recommendationEdit = this.getEditToRemoveValueFromArray(['recommendations'], extensionsConfigContent.recommendations, extensionId);
            if (recommendationEdit) {
                values.push(recommendationEdit);
            }
        }
        else if (extensionsConfigContent.unwantedRecommendations) {
            const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
            if (unwantedRecommendationEdit) {
                values.push(unwantedRecommendationEdit);
            }
        }
        if (values.length) {
            return this.jsonEditingService.write(workspaceFolder.toResource(EXTENSIONS_CONFIG), values, true);
        }
    }
    async addOrRemoveWorkspaceUnwantedRecommendation(extensionId, workspace, extensionsConfigContent, add) {
        const values = [];
        if (extensionsConfigContent) {
            if (add) {
                const path = ['extensions', 'unwantedRecommendations'];
                if (Array.isArray(extensionsConfigContent.recommendations)) {
                    values.push({ path: [...path, -1], value: extensionId });
                }
                else {
                    values.push({ path, value: [extensionId] });
                }
                const recommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'recommendations'], extensionsConfigContent.recommendations, extensionId);
                if (recommendationEdit) {
                    values.push(recommendationEdit);
                }
            }
            else if (extensionsConfigContent.unwantedRecommendations) {
                const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
                if (unwantedRecommendationEdit) {
                    values.push(unwantedRecommendationEdit);
                }
            }
        }
        else if (add) {
            values.push({ path: ['extensions'], value: { unwantedRecommendations: [extensionId] } });
        }
        if (values.length) {
            return this.jsonEditingService.write(workspace.configuration, values, true);
        }
    }
    async pickWorkspaceOrFolders(workspaceFolders, workspace, placeHolder) {
        const workspaceOrFolders = workspace ? [...workspaceFolders, workspace] : [...workspaceFolders];
        if (workspaceOrFolders.length === 1) {
            return workspaceOrFolders;
        }
        const folderPicks = workspaceFolders.map((workspaceFolder) => {
            return {
                label: workspaceFolder.name,
                description: localize('workspace folder', 'Workspace Folder'),
                workspaceOrFolder: workspaceFolder,
                iconClasses: getIconClasses(this.modelService, this.languageService, workspaceFolder.uri, FileKind.ROOT_FOLDER),
            };
        });
        if (workspace) {
            folderPicks.push({ type: 'separator' });
            folderPicks.push({
                label: localize('workspace', 'Workspace'),
                workspaceOrFolder: workspace,
            });
        }
        const result = (await this.quickInputService.pick(folderPicks, { placeHolder, canPickMany: true })) || [];
        return result.map((r) => r.workspaceOrFolder);
    }
    async resolveWorkspaceExtensionConfig(workspaceConfigurationResource) {
        try {
            const content = await this.fileService.readFile(workspaceConfigurationResource);
            const extensionsConfigContent = (parse(content.value.toString())['extensions']);
            return extensionsConfigContent
                ? this.parseExtensionConfig(extensionsConfigContent)
                : undefined;
        }
        catch (e) {
            /* Ignore */
        }
        return undefined;
    }
    async resolveWorkspaceFolderExtensionConfig(workspaceFolder) {
        try {
            const content = await this.fileService.readFile(workspaceFolder.toResource(EXTENSIONS_CONFIG));
            const extensionsConfigContent = parse(content.value.toString());
            return this.parseExtensionConfig(extensionsConfigContent);
        }
        catch (e) {
            /* ignore */
        }
        return {};
    }
    parseExtensionConfig(extensionsConfigContent) {
        return {
            recommendations: distinct((extensionsConfigContent.recommendations || []).map((e) => e.toLowerCase())),
            unwantedRecommendations: distinct((extensionsConfigContent.unwantedRecommendations || []).map((e) => e.toLowerCase())),
        };
    }
    getEditToRemoveValueFromArray(path, array, value) {
        const index = array?.indexOf(value);
        if (index !== undefined && index !== -1) {
            return { path: [...path, index], value: undefined };
        }
        return undefined;
    }
};
WorkspaceExtensionsConfigService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IFileService),
    __param(2, IQuickInputService),
    __param(3, IModelService),
    __param(4, ILanguageService),
    __param(5, IJSONEditingService)
], WorkspaceExtensionsConfigService);
export { WorkspaceExtensionsConfigService };
registerSingleton(IWorkspaceExtensionsConfigService, WorkspaceExtensionsConfigService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlRXh0ZW5zaW9uc0NvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL3dvcmtzcGFjZUV4dGVuc2lvbnNDb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQVksS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLFdBQVcsRUFFWCx3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQWMsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRixPQUFP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