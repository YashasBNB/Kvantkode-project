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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VmFyaWFibGVSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsMEJBQTBCLEVBQzFCLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFDaEIsWUFBWSxHQUNaLE1BQU0sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFekQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFFakgsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBT3hGLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FDOUQsa0NBQWtDLENBQ2xDLENBQUE7QUFNRCxNQUFN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