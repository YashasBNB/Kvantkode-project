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
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { RegisteredEditorPriority, IEditorResolverService, } from '../../../services/editor/common/editorResolverService.js';
import { ITextEditorService } from '../../../services/textfile/common/textEditorService.js';
import { DEFAULT_SETTINGS_EDITOR_SETTING, FOLDER_SETTINGS_PATH, IPreferencesService, USE_SPLIT_JSON_SETTING, } from '../../../services/preferences/common/preferences.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SettingsFileSystemProvider } from './settingsFilesystemProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let PreferencesContribution = class PreferencesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.preferences'; }
    constructor(fileService, instantiationService, preferencesService, userDataProfileService, workspaceService, configurationService, editorResolverService, textEditorService) {
        super();
        this.instantiationService = instantiationService;
        this.preferencesService = preferencesService;
        this.userDataProfileService = userDataProfileService;
        this.workspaceService = workspaceService;
        this.configurationService = configurationService;
        this.editorResolverService = editorResolverService;
        this.textEditorService = textEditorService;
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(USE_SPLIT_JSON_SETTING) ||
                e.affectsConfiguration(DEFAULT_SETTINGS_EDITOR_SETTING)) {
                this.handleSettingsEditorRegistration();
            }
        }));
        this.handleSettingsEditorRegistration();
        const fileSystemProvider = this._register(this.instantiationService.createInstance(SettingsFileSystemProvider));
        this._register(fileService.registerProvider(SettingsFileSystemProvider.SCHEMA, fileSystemProvider));
    }
    handleSettingsEditorRegistration() {
        // dispose any old listener we had
        dispose(this.editorOpeningListener);
        // install editor opening listener unless user has disabled this
        if (!!this.configurationService.getValue(USE_SPLIT_JSON_SETTING) ||
            !!this.configurationService.getValue(DEFAULT_SETTINGS_EDITOR_SETTING)) {
            this.editorOpeningListener = this.editorResolverService.registerEditor('**/settings.json', {
                id: SideBySideEditorInput.ID,
                label: nls.localize('splitSettingsEditorLabel', 'Split Settings Editor'),
                priority: RegisteredEditorPriority.builtin,
            }, {}, {
                createEditorInput: ({ resource, options }) => {
                    // Global User Settings File
                    if (isEqual(resource, this.userDataProfileService.currentProfile.settingsResource)) {
                        return {
                            editor: this.preferencesService.createSplitJsonEditorInput(3 /* ConfigurationTarget.USER_LOCAL */, resource),
                            options,
                        };
                    }
                    // Single Folder Workspace Settings File
                    const state = this.workspaceService.getWorkbenchState();
                    if (state === 2 /* WorkbenchState.FOLDER */) {
                        const folders = this.workspaceService.getWorkspace().folders;
                        if (isEqual(resource, folders[0].toResource(FOLDER_SETTINGS_PATH))) {
                            return {
                                editor: this.preferencesService.createSplitJsonEditorInput(5 /* ConfigurationTarget.WORKSPACE */, resource),
                                options,
                            };
                        }
                    }
                    // Multi Folder Workspace Settings File
                    else if (state === 3 /* WorkbenchState.WORKSPACE */) {
                        const folders = this.workspaceService.getWorkspace().folders;
                        for (const folder of folders) {
                            if (isEqual(resource, folder.toResource(FOLDER_SETTINGS_PATH))) {
                                return {
                                    editor: this.preferencesService.createSplitJsonEditorInput(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, resource),
                                    options,
                                };
                            }
                        }
                    }
                    return { editor: this.textEditorService.createTextEditor({ resource }), options };
                },
            });
        }
    }
    dispose() {
        dispose(this.editorOpeningListener);
        super.dispose();
    }
};
PreferencesContribution = __decorate([
    __param(0, IFileService),
    __param(1, IInstantiationService),
    __param(2, IPreferencesService),
    __param(3, IUserDataProfileService),
    __param(4, IWorkspaceContextService),
    __param(5, IConfigurationService),
    __param(6, IEditorResolverService),
    __param(7, ITextEditorService)
], PreferencesContribution);
export { PreferencesContribution };
const registry = Registry.as(Extensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.settings.enableNaturalLanguageSearch': {
            type: 'boolean',
            description: nls.localize('enableNaturalLanguageSettingsSearch', 'Controls whether to enable the natural language search mode for settings. The natural language search is provided by a Microsoft online service.'),
            default: true,
            scope: 4 /* ConfigurationScope.WINDOW */,
            tags: ['usesOnlineServices'],
        },
        'workbench.settings.settingsSearchTocBehavior': {
            type: 'string',
            enum: ['hide', 'filter'],
            enumDescriptions: [
                nls.localize('settingsSearchTocBehavior.hide', 'Hide the Table of Contents while searching.'),
                nls.localize('settingsSearchTocBehavior.filter', 'Filter the Table of Contents to just categories that have matching settings. Clicking on a category will filter the results to that category.'),
            ],
            description: nls.localize('settingsSearchTocBehavior', 'Controls the behavior of the Settings editor Table of Contents while searching. If this setting is being changed in the Settings editor, the setting will take effect after the search query is modified.'),
            default: 'filter',
            scope: 4 /* ConfigurationScope.WINDOW */,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHNCQUFzQixHQUN0QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0Isb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixzQkFBc0IsR0FDdEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsWUFBWSxF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