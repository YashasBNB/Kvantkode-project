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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixzQkFBc0IsR0FDdEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQ04sK0JBQStCLEVBQy9CLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBQ3RCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxN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