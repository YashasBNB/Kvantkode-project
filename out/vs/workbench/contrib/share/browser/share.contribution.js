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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zaGFyZS9icm93c2VyL3NoYXJlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8s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