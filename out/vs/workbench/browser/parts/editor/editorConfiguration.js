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
var DynamicEditorConfigurations_1;
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Event } from '../../../../base/common/event.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ByteSize, getLargeFileConfirmationLimit } from '../../../../platform/files/common/files.js';
let DynamicEditorConfigurations = class DynamicEditorConfigurations extends Disposable {
    static { DynamicEditorConfigurations_1 = this; }
    static { this.ID = 'workbench.contrib.dynamicEditorConfigurations'; }
    static { this.AUTO_LOCK_DEFAULT_ENABLED = new Set([
        'terminalEditor',
        'mainThreadWebview-simpleBrowser.view',
        'mainThreadWebview-browserPreview',
        'workbench.editor.chatSession',
    ]); }
    static { this.AUTO_LOCK_EXTRA_EDITORS = [
        // List some editor input identifiers that are not
        // registered yet via the editor resolver infrastructure
        {
            id: 'workbench.input.interactive',
            label: localize('interactiveWindow', 'Interactive Window'),
            priority: RegisteredEditorPriority.builtin,
        },
        {
            id: 'mainThreadWebview-markdown.preview',
            label: localize('markdownPreview', 'Markdown Preview'),
            priority: RegisteredEditorPriority.builtin,
        },
        {
            id: 'mainThreadWebview-simpleBrowser.view',
            label: localize('simpleBrowser', 'Simple Browser'),
            priority: RegisteredEditorPriority.builtin,
        },
        {
            id: 'mainThreadWebview-browserPreview',
            label: localize('livePreview', 'Live Preview'),
            priority: RegisteredEditorPriority.builtin,
        },
    ]; }
    static { this.AUTO_LOCK_REMOVE_EDITORS = new Set([
        // List some editor types that the above `AUTO_LOCK_EXTRA_EDITORS`
        // already covers to avoid duplicates.
        'vscode-interactive-input',
        'interactive',
        'vscode.markdown.preview.editor',
    ]); }
    constructor(editorResolverService, extensionService, environmentService) {
        super();
        this.editorResolverService = editorResolverService;
        this.environmentService = environmentService;
        this.configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        (async () => {
            await extensionService.whenInstalledExtensionsRegistered();
            this.updateDynamicEditorConfigurations();
            this.registerListeners();
        })();
    }
    registerListeners() {
        // Registered editors (debounced to reduce perf overhead)
        this._register(Event.debounce(this.editorResolverService.onDidChangeEditorRegistrations, (_, e) => e)(() => this.updateDynamicEditorConfigurations()));
    }
    updateDynamicEditorConfigurations() {
        const lockableEditors = [
            ...this.editorResolverService.getEditors(),
            ...DynamicEditorConfigurations_1.AUTO_LOCK_EXTRA_EDITORS,
        ].filter((e) => !DynamicEditorConfigurations_1.AUTO_LOCK_REMOVE_EDITORS.has(e.id));
        const binaryEditorCandidates = this.editorResolverService
            .getEditors()
            .filter((e) => e.priority !== RegisteredEditorPriority.exclusive)
            .map((e) => e.id);
        // Build config from registered editors
        const autoLockGroupConfiguration = Object.create(null);
        for (const editor of lockableEditors) {
            autoLockGroupConfiguration[editor.id] = {
                type: 'boolean',
                default: DynamicEditorConfigurations_1.AUTO_LOCK_DEFAULT_ENABLED.has(editor.id),
                description: editor.label,
            };
        }
        // Build default config too
        const defaultAutoLockGroupConfiguration = Object.create(null);
        for (const editor of lockableEditors) {
            defaultAutoLockGroupConfiguration[editor.id] =
                DynamicEditorConfigurations_1.AUTO_LOCK_DEFAULT_ENABLED.has(editor.id);
        }
        // Register setting for auto locking groups
        const oldAutoLockConfigurationNode = this.autoLockConfigurationNode;
        this.autoLockConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editor.autoLockGroups': {
                    type: 'object',
                    description: localize('workbench.editor.autoLockGroups', 'If an editor matching one of the listed types is opened as the first in an editor group and more than one group is open, the group is automatically locked. Locked groups will only be used for opening editors when explicitly chosen by a user gesture (for example drag and drop), but not by default. Consequently, the active editor in a locked group is less likely to be replaced accidentally with a different editor.'),
                    properties: autoLockGroupConfiguration,
                    default: defaultAutoLockGroupConfiguration,
                    additionalProperties: false,
                },
            },
        };
        // Registers setting for default binary editors
        const oldDefaultBinaryEditorConfigurationNode = this.defaultBinaryEditorConfigurationNode;
        this.defaultBinaryEditorConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editor.defaultBinaryEditor': {
                    type: 'string',
                    default: '',
                    // This allows for intellisense autocompletion
                    enum: [...binaryEditorCandidates, ''],
                    description: localize('workbench.editor.defaultBinaryEditor', 'The default editor for files detected as binary. If undefined, the user will be presented with a picker.'),
                },
            },
        };
        // Registers setting for editorAssociations
        const oldEditorAssociationsConfigurationNode = this.editorAssociationsConfigurationNode;
        this.editorAssociationsConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editorAssociations': {
                    type: 'object',
                    markdownDescription: localize('editor.editorAssociations', 'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) to editors (for example `"*.hex": "hexEditor.hexedit"`). These have precedence over the default behavior.'),
                    patternProperties: {
                        '.*': {
                            type: 'string',
                            enum: binaryEditorCandidates,
                        },
                    },
                },
            },
        };
        // Registers setting for large file confirmation based on environment
        const oldEditorLargeFileConfirmationConfigurationNode = this.editorLargeFileConfirmationConfigurationNode;
        this.editorLargeFileConfirmationConfigurationNode = {
            ...workbenchConfigurationNodeBase,
            properties: {
                'workbench.editorLargeFileConfirmation': {
                    type: 'number',
                    default: getLargeFileConfirmationLimit(this.environmentService.remoteAuthority) / ByteSize.MB,
                    minimum: 1,
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                    markdownDescription: localize('editorLargeFileSizeConfirmation', 'Controls the minimum size of a file in MB before asking for confirmation when opening in the editor. Note that this setting may not apply to all editor types and environments.'),
                },
            },
        };
        this.configurationRegistry.updateConfigurations({
            add: [
                this.autoLockConfigurationNode,
                this.defaultBinaryEditorConfigurationNode,
                this.editorAssociationsConfigurationNode,
                this.editorLargeFileConfirmationConfigurationNode,
            ],
            remove: coalesce([
                oldAutoLockConfigurationNode,
                oldDefaultBinaryEditorConfigurationNode,
                oldEditorAssociationsConfigurationNode,
                oldEditorLargeFileConfirmationConfigurationNode,
            ]),
        });
    }
};
DynamicEditorConfigurations = DynamicEditorConfigurations_1 = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IExtensionService),
    __param(2, IWorkbenchEnvironmentService)
], DynamicEditorConfigurations);
export { DynamicEditorConfigurations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUdyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixzQkFBc0IsRUFFdEIsd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFFakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsUUFBUSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFN0YsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVOzthQUMxQyxPQUFFLEdBQUcsK0NBQStDLEFBQWxELENBQWtEO2FBRTVDLDhCQUF5QixHQUFHLElBQUksR0FBRyxDQUFTO1FBQ25FLGdCQUFnQjtRQUNoQixzQ0FBc0M7UUFDdEMsa0NBQWtDO1FB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