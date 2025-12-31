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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixrQkFBa0IsRUFDbEIsZ0JBQWdCLEdBQ2hCLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUc3RixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2pFLE9BQU8sRUFBK0IsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRixPQUFPLEVBQUUsOEJBQThC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