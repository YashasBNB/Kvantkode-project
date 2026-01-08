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
import { localize, localize2 } from '../../../../nls.js';
import { GettingStartedInputSerializer, GettingStartedPage, inWelcomeContext, } from './gettingStarted.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IWalkthroughsService } from './gettingStartedService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isLinux, isMacintosh, isWindows, } from '../../../../base/common/platform.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { StartupPageEditorResolverContribution, StartupPageRunnerContribution, } from './startupPage.js';
import { ExtensionsInput } from '../../extensions/common/extensionsInput.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { GettingStartedAccessibleView } from './gettingStartedAccessibleView.js';
export * as icons from './gettingStartedIcons.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openWalkthrough',
            title: localize2('miWelcome', 'Welcome'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 1,
            },
            metadata: {
                description: localize2('minWelcomeDescription', 'Opens a Walkthrough to help you get started in VS Code.'),
            },
        });
    }
    run(accessor, walkthroughID, optionsOrToSide) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const instantiationService = accessor.get(IInstantiationService);
        const editorService = accessor.get(IEditorService);
        const commandService = accessor.get(ICommandService);
        const toSide = typeof optionsOrToSide === 'object' ? optionsOrToSide.toSide : optionsOrToSide;
        const inactive = typeof optionsOrToSide === 'object' ? optionsOrToSide.inactive : false;
        if (walkthroughID) {
            const selectedCategory = typeof walkthroughID === 'string' ? walkthroughID : walkthroughID.category;
            let selectedStep;
            if (typeof walkthroughID === 'object' &&
                'category' in walkthroughID &&
                'step' in walkthroughID) {
                selectedStep = `${walkthroughID.category}#${walkthroughID.step}`;
            }
            else {
                selectedStep = undefined;
            }
            // We're trying to open the welcome page from the Help menu
            if (!selectedCategory && !selectedStep) {
                editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options: { preserveFocus: toSide ?? false, inactive },
                }, toSide ? SIDE_GROUP : undefined);
                return;
            }
            // Try first to select the walkthrough on an active welcome page with no selected walkthrough
            for (const group of editorGroupsService.groups) {
                if (group.activeEditor instanceof GettingStartedInput) {
                    const activeEditor = group.activeEditor;
                    activeEditor.showWelcome = false;
                    group.activeEditorPane.makeCategoryVisibleWhenAvailable(selectedCategory, selectedStep);
                    return;
                }
            }
            // Otherwise, try to find a welcome input somewhere with no selected walkthrough, and open it to this one.
            const result = editorService.findEditors({
                typeId: GettingStartedInput.ID,
                editorId: undefined,
                resource: GettingStartedInput.RESOURCE,
            });
            for (const { editor, groupId } of result) {
                if (editor instanceof GettingStartedInput) {
                    const group = editorGroupsService.getGroup(groupId);
                    if (!editor.selectedCategory && group) {
                        editor.selectedCategory = selectedCategory;
                        editor.selectedStep = selectedStep;
                        editor.showWelcome = false;
                        group.openEditor(editor, { revealIfOpened: true, inactive });
                        return;
                    }
                }
            }
            const activeEditor = editorService.activeEditor;
            // If the walkthrough is already open just reveal the step
            if (selectedStep &&
                activeEditor instanceof GettingStartedInput &&
                activeEditor.selectedCategory === selectedCategory) {
                activeEditor.showWelcome = false;
                commandService.executeCommand('walkthroughs.selectStep', selectedStep);
                return;
            }
            // If it's the extension install page then lets replace it with the getting started page
            if (activeEditor instanceof ExtensionsInput) {
                const activeGroup = editorGroupsService.activeGroup;
                activeGroup.replaceEditors([
                    {
                        editor: activeEditor,
                        replacement: instantiationService.createInstance(GettingStartedInput, {
                            selectedCategory: selectedCategory,
                            selectedStep: selectedStep,
                            showWelcome: false,
                        }),
                    },
                ]);
            }
            else {
                // else open respecting toSide
                const options = {
                    selectedCategory: selectedCategory,
                    selectedStep: selectedStep,
                    showWelcome: false,
                    preserveFocus: toSide ?? false,
                    inactive,
                };
                editorService
                    .openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options,
                }, toSide ? SIDE_GROUP : undefined)
                    .then((editor) => {
                    ;
                    editor?.makeCategoryVisibleWhenAvailable(selectedCategory, selectedStep);
                });
            }
        }
        else {
            editorService.openEditor({
                resource: GettingStartedInput.RESOURCE,
                options: { preserveFocus: toSide ?? false, inactive },
            }, toSide ? SIDE_GROUP : undefined);
        }
    }
});
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(GettingStartedInput.ID, GettingStartedInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(GettingStartedPage, GettingStartedPage.ID, localize('welcome', 'Welcome')), [new SyncDescriptor(GettingStartedInput)]);
const category = localize2('welcome', 'Welcome');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.goBack',
            title: localize2('welcome.goBack', 'Go Back'),
            category,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: inWelcomeContext,
            },
            precondition: ContextKeyExpr.equals('activeEditor', 'gettingStartedPage'),
            f1: true,
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.escape();
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'walkthroughs.selectStep',
    handler: (accessor, stepID) => {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.selectStepLoose(stepID);
        }
        else {
            console.error('Cannot run walkthroughs.selectStep outside of walkthrough context');
        }
    },
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepComplete',
            title: localize('welcome.markStepComplete', 'Mark Step Complete'),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.progressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepIncomplete',
            title: localize('welcome.markStepInomplete', 'Mark Step Incomplete'),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.deprogressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showAllWalkthroughs',
            title: localize2('welcome.showAllWalkthroughs', 'Open Walkthrough...'),
            category,
            f1: true,
        });
    }
    async getQuickPickItems(contextService, gettingStartedService) {
        const categories = await gettingStartedService.getWalkthroughs();
        return categories
            .filter((c) => contextService.contextMatchesRules(c.when))
            .map((x) => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        }));
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const contextService = accessor.get(IContextKeyService);
        const quickInputService = accessor.get(IQuickInputService);
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const extensionService = accessor.get(IExtensionService);
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick());
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.placeholder = localize('pickWalkthroughs', 'Select a walkthrough to open');
        quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        quickPick.busy = true;
        disposables.add(quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0];
            if (selection) {
                commandService.executeCommand('workbench.action.openWalkthrough', selection.id);
            }
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        await extensionService.whenInstalledExtensionsRegistered();
        gettingStartedService.onDidAddWalkthrough(async () => {
            quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        });
        quickPick.show();
        quickPick.busy = false;
    }
});
export const WorkspacePlatform = new RawContextKey('workspacePlatform', undefined, localize('workspacePlatform', 'The platform of the current workspace, which in remote or serverless contexts may be different from the platform of the UI'));
let WorkspacePlatformContribution = class WorkspacePlatformContribution {
    static { this.ID = 'workbench.contrib.workspacePlatform'; }
    constructor(extensionManagementServerService, remoteAgentService, contextService) {
        this.extensionManagementServerService = extensionManagementServerService;
        this.remoteAgentService = remoteAgentService;
        this.contextService = contextService;
        this.remoteAgentService.getEnvironment().then((env) => {
            const remoteOS = env?.os;
            const remotePlatform = remoteOS === 2 /* OS.Macintosh */
                ? 'mac'
                : remoteOS === 1 /* OS.Windows */
                    ? 'windows'
                    : remoteOS === 3 /* OS.Linux */
                        ? 'linux'
                        : undefined;
            if (remotePlatform) {
                WorkspacePlatform.bindTo(this.contextService).set(remotePlatform);
            }
            else if (this.extensionManagementServerService.localExtensionManagementServer) {
                if (isMacintosh) {
                    WorkspacePlatform.bindTo(this.contextService).set('mac');
                }
                else if (isLinux) {
                    WorkspacePlatform.bindTo(this.contextService).set('linux');
                }
                else if (isWindows) {
                    WorkspacePlatform.bindTo(this.contextService).set('windows');
                }
            }
            else if (this.extensionManagementServerService.webExtensionManagementServer) {
                WorkspacePlatform.bindTo(this.contextService).set('webworker');
            }
            else {
                console.error('Error: Unable to detect workspace platform');
            }
        });
    }
};
WorkspacePlatformContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IRemoteAgentService),
    __param(2, IContextKeyService)
], WorkspacePlatformContribution);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.welcomePage.walkthroughs.openOnInstall': {
            scope: 2 /* ConfigurationScope.MACHINE */,
            type: 'boolean',
            default: true,
            description: localize('workbench.welcomePage.walkthroughs.openOnInstall', "When enabled, an extension's walkthrough will open upon install of the extension."),
        },
        'workbench.startupEditor': {
            scope: 5 /* ConfigurationScope.RESOURCE */,
            type: 'string',
            enum: [
                'none',
                'welcomePage',
                'readme',
                'newUntitledFile',
                'welcomePageInEmptyWorkbench',
                'terminal',
            ],
            enumDescriptions: [
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.none',
                }, 'Start without an editor.'),
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.welcomePage',
                }, 'Open the Welcome page, with content to aid in getting started with VS Code and extensions.'),
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.readme',
                }, "Open the README when opening a folder that contains one, fallback to 'welcomePage' otherwise. Note: This is only observed as a global configuration, it will be ignored if set in a workspace or folder configuration."),
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.newUntitledFile',
                }, 'Open a new untitled text file (only applies when opening an empty window).'),
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.welcomePageInEmptyWorkbench',
                }, 'Open the Welcome page when opening an empty workbench.'),
                localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'workbench.startupEditor.terminal',
                }, 'Open a new terminal in the editor area.'),
            ],
            default: 'welcomePage',
            description: localize('workbench.startupEditor', 'Controls which editor is shown at startup, if none are restored from the previous session.'),
        },
        'workbench.welcomePage.preferReducedMotion': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            deprecationMessage: localize('deprecationMessage', 'Deprecated, use the global `workbench.reduceMotion`.'),
            description: localize('workbench.welcomePage.preferReducedMotion', 'When enabled, reduce motion in welcome page.'),
        },
    },
});
registerWorkbenchContribution2(WorkspacePlatformContribution.ID, WorkspacePlatformContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(StartupPageEditorResolverContribution.ID, StartupPageEditorResolverContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(StartupPageRunnerContribution.ID, StartupPageRunnerContribution, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new GettingStartedAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FDaEIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDakUsT0FBTyxFQUErQixtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNGLE9BQU8sRUFBRSw4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