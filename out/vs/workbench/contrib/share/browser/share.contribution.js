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
var ShareWorkbenchContribution_1;
import './share.css';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { Extensions } from '../../../common/contributions.js';
import { ShareProviderCountContext, ShareService } from './shareService.js';
import { IShareService } from '../common/share.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
const targetMenus = [
    MenuId.EditorContextShare,
    MenuId.SCMResourceContextShare,
    MenuId.OpenEditorsContextShare,
    MenuId.EditorTitleContextShare,
    MenuId.MenubarShare,
    // MenuId.EditorLineNumberContext, // todo@joyceerhl add share
    MenuId.ExplorerContextShare,
];
let ShareWorkbenchContribution = class ShareWorkbenchContribution extends Disposable {
    static { ShareWorkbenchContribution_1 = this; }
    static { this.SHARE_ENABLED_SETTING = 'workbench.experimental.share.enabled'; }
    constructor(shareService, configurationService) {
        super();
        this.shareService = shareService;
        this.configurationService = configurationService;
        if (this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
            this.registerActions();
        }
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
                const settingValue = this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING);
                if (settingValue === true && this._disposables === undefined) {
                    this.registerActions();
                }
                else if (settingValue === false && this._disposables !== undefined) {
                    this._disposables?.clear();
                    this._disposables = undefined;
                }
            }
        }));
    }
    dispose() {
        super.dispose();
        this._disposables?.dispose();
    }
    registerActions() {
        if (!this._disposables) {
            this._disposables = new DisposableStore();
        }
        this._disposables.add(registerAction2(class ShareAction extends Action2 {
            static { this.ID = 'workbench.action.share'; }
            static { this.LABEL = localize2('share', 'Share...'); }
            constructor() {
                super({
                    id: ShareAction.ID,
                    title: ShareAction.LABEL,
                    f1: true,
                    icon: Codicon.linkExternal,
                    precondition: ContextKeyExpr.and(ShareProviderCountContext.notEqualsTo(0), WorkspaceFolderCountContext.notEqualsTo(0)),
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */,
                    },
                    menu: [{ id: MenuId.CommandCenter, order: 1000 }],
                });
            }
            async run(accessor, ...args) {
                const shareService = accessor.get(IShareService);
                const activeEditor = accessor.get(IEditorService)?.activeEditor;
                const resourceUri = (activeEditor &&
                    EditorResourceAccessor.getOriginalUri(activeEditor, {
                        supportSideBySide: SideBySideEditor.PRIMARY,
                    })) ??
                    accessor.get(IWorkspaceContextService).getWorkspace().folders[0].uri;
                const clipboardService = accessor.get(IClipboardService);
                const dialogService = accessor.get(IDialogService);
                const urlService = accessor.get(IOpenerService);
                const progressService = accessor.get(IProgressService);
                const selection = accessor.get(ICodeEditorService).getActiveCodeEditor()?.getSelection() ?? undefined;
                const result = await progressService.withProgress({
                    location: 10 /* ProgressLocation.Window */,
                    detail: localize('generating link', 'Generating link...'),
                }, async () => shareService.provideShare({ resourceUri, selection }, CancellationToken.None));
                if (result) {
                    const uriText = result.toString();
                    const isResultText = typeof result === 'string';
                    await clipboardService.writeText(uriText);
                    dialogService.prompt({
                        type: Severity.Info,
                        message: isResultText
                            ? localize('shareTextSuccess', 'Copied text to clipboard!')
                            : localize('shareSuccess', 'Copied link to clipboard!'),
                        custom: {
                            icon: Codicon.check,
                            markdownDetails: [
                                {
                                    markdown: new MarkdownString(`<div aria-label='${uriText}'>${uriText}</div>`, { supportHtml: true }),
                                    classes: [
                                        isResultText ? 'share-dialog-input-text' : 'share-dialog-input-link',
                                    ],
                                },
                            ],
                        },
                        cancelButton: localize('close', 'Close'),
                        buttons: isResultText
                            ? []
                            : [
                                {
                                    label: localize('open link', 'Open Link'),
                                    run: () => {
                                        urlService.open(result, { openExternal: true });
                                    },
                                },
                            ],
                    });
                }
            }
        }));
        const actions = this.shareService.getShareActions();
        for (const menuId of targetMenus) {
            for (const action of actions) {
                // todo@joyceerhl avoid duplicates
                this._disposables.add(MenuRegistry.appendMenuItem(menuId, action));
            }
        }
    }
};
ShareWorkbenchContribution = ShareWorkbenchContribution_1 = __decorate([
    __param(0, IShareService),
    __param(1, IConfigurationService)
], ShareWorkbenchContribution);
registerSingleton(IShareService, ShareService, 1 /* InstantiationType.Delayed */);
const workbenchContributionsRegistry = Registry.as(Extensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(ShareWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.experimental.share.enabled': {
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            markdownDescription: localize('experimental.share.enabled', 'Controls whether to render the Share action next to the command center when {0} is {1}.', '`#window.commandCenter#`', '`true`'),
            restricted: false,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2hhcmUvYnJvd3Nlci9zaGFyZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFHaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RB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