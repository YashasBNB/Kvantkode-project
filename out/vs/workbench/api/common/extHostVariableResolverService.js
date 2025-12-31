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
import { Lazy } from '../../../base/common/lazy.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import * as process from '../../../base/common/process.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { CustomEditorTabInput, NotebookDiffEditorTabInput, NotebookEditorTabInput, TextDiffTabInput, TextTabInput, } from './extHostTypes.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { AbstractVariableResolverService } from '../../services/configurationResolver/common/variableResolver.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
export const IExtHostVariableResolverProvider = createDecorator('IExtHostVariableResolverProvider');
class ExtHostVariableResolverService extends AbstractVariableResolverService {
    constructor(extensionService, workspaceService, editorService, editorTabs, configProvider, context, homeDir) {
        function getActiveUri() {
            if (editorService) {
                const activeEditor = editorService.activeEditor();
                if (activeEditor) {
                    return activeEditor.document.uri;
                }
                const activeTab = editorTabs.tabGroups.all.find((group) => group.isActive)?.activeTab;
                if (activeTab !== undefined) {
                    // Resolve a resource from the tab
                    if (activeTab.input instanceof TextDiffTabInput ||
                        activeTab.input instanceof NotebookDiffEditorTabInput) {
                        return activeTab.input.modified;
                    }
                    else if (activeTab.input instanceof TextTabInput ||
                        activeTab.input instanceof NotebookEditorTabInput ||
                        activeTab.input instanceof CustomEditorTabInput) {
                        return activeTab.input.uri;
                    }
                }
            }
            return undefined;
        }
        super({
            getFolderUri: (folderName) => {
                const found = context.folders.filter((f) => f.name === folderName);
                if (found && found.length > 0) {
                    return found[0].uri;
                }
                return undefined;
            },
            getWorkspaceFolderCount: () => {
                return context.folders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return configProvider.getConfiguration(undefined, folderUri).get(section);
            },
            getAppRoot: () => {
                return process.cwd();
            },
            getExecPath: () => {
                return process.env['VSCODE_EXEC_PATH'];
            },
            getFilePath: () => {
                const activeUri = getActiveUri();
                if (activeUri) {
                    return path.normalize(activeUri.fsPath);
                }
                return undefined;
            },
            getWorkspaceFolderPathForFile: () => {
                if (workspaceService) {
                    const activeUri = getActiveUri();
                    if (activeUri) {
                        const ws = workspaceService.getWorkspaceFolder(activeUri);
                        if (ws) {
                            return path.normalize(ws.uri.fsPath);
                        }
                    }
                }
                return undefined;
            },
            getSelectedText: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor && !activeEditor.selection.isEmpty) {
                        return activeEditor.document.getText(activeEditor.selection);
                    }
                }
                return undefined;
            },
            getLineNumber: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor) {
                        return String(activeEditor.selection.end.line + 1);
                    }
                }
                return undefined;
            },
            getColumnNumber: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor) {
                        return String(activeEditor.selection.end.character + 1);
                    }
                }
                return undefined;
            },
            getExtension: (id) => {
                return extensionService.getExtension(id);
            },
        }, undefined, homeDir ? Promise.resolve(homeDir) : undefined, Promise.resolve(process.env));
    }
}
let ExtHostVariableResolverProviderService = class ExtHostVariableResolverProviderService extends Disposable {
    constructor(extensionService, workspaceService, editorService, configurationService, editorTabs) {
        super();
        this.extensionService = extensionService;
        this.workspaceService = workspaceService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.editorTabs = editorTabs;
        this._resolver = new Lazy(async () => {
            const configProvider = await this.configurationService.getConfigProvider();
            const folders = (await this.workspaceService.getWorkspaceFolders2()) || [];
            const dynamic = { folders };
            this._register(this.workspaceService.onDidChangeWorkspace(async (e) => {
                dynamic.folders = (await this.workspaceService.getWorkspaceFolders2()) || [];
            }));
            return new ExtHostVariableResolverService(this.extensionService, this.workspaceService, this.editorService, this.editorTabs, configProvider, dynamic, this.homeDir());
        });
    }
    getResolver() {
        return this._resolver.value;
    }
    homeDir() {
        return undefined;
    }
};
ExtHostVariableResolverProviderService = __decorate([
    __param(0, IExtHostExtensionService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostDocumentsAndEditors),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostEditorTabs)
], ExtHostVariableResolverProviderService);
export { ExtHostVariableResolverProviderService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXpELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRWpILE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU94RixNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQzlELGtDQUFrQyxDQUNsQyxDQUFBO0FBTUQsTUFBTSw4QkFBK0IsU0FBUSwrQkFBK0I7SUFD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