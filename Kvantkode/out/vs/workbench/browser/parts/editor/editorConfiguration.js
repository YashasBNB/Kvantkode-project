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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBR3JDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUNOLHNCQUFzQixFQUV0Qix3QkFBd0IsR0FDeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU3RixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7O2FBQzFDLE9BQUUsR0FBRywrQ0FBK0MsQUFBbEQsQ0FBa0Q7YUFFNUMsOEJBQXlCLEdBQUcsSUFBSSxHQUFHLENBQVM7UUFDbkUsZ0JBQWdCO1FBQ2hCLHNDQUFzQztRQUN0QyxrQ0FB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