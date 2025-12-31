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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { OpenFileAction, OpenFileFolderAction, OpenFolderAction, } from '../../../browser/actions/workspaceActions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions, IViewDescriptorService, ViewContentGroups, } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE, IDebugService, } from '../common/debug.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_START_COMMAND_ID } from './debugCommands.js';
const debugStartLanguageKey = 'debugStartLanguage';
const CONTEXT_DEBUG_START_LANGUAGE = new RawContextKey(debugStartLanguageKey, undefined);
const CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR = new RawContextKey('debuggerInterestedInActiveEditor', false);
let WelcomeView = class WelcomeView extends ViewPane {
    static { this.ID = 'workbench.debug.welcome'; }
    static { this.LABEL = localize2('run', 'Run'); }
    constructor(options, themeService, keybindingService, contextMenuService, configurationService, contextKeyService, debugService, editorService, instantiationService, viewDescriptorService, openerService, storageSevice, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.debugStartLanguageContext = CONTEXT_DEBUG_START_LANGUAGE.bindTo(contextKeyService);
        this.debuggerInterestedContext =
            CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.bindTo(contextKeyService);
        const lastSetLanguage = storageSevice.get(debugStartLanguageKey, 1 /* StorageScope.WORKSPACE */);
        this.debugStartLanguageContext.set(lastSetLanguage);
        const setContextKey = () => {
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                const model = editorControl.getModel();
                const language = model ? model.getLanguageId() : undefined;
                if (language &&
                    this.debugService.getAdapterManager().someDebuggerInterestedInLanguage(language)) {
                    this.debugStartLanguageContext.set(language);
                    this.debuggerInterestedContext.set(true);
                    storageSevice.store(debugStartLanguageKey, language, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    return;
                }
            }
            this.debuggerInterestedContext.set(false);
        };
        const disposables = new DisposableStore();
        this._register(disposables);
        this._register(editorService.onDidActiveEditorChange(() => {
            disposables.clear();
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                disposables.add(editorControl.onDidChangeModelLanguage(setContextKey));
            }
            setContextKey();
        }));
        this._register(this.debugService.getAdapterManager().onDidRegisterDebugger(setContextKey));
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible) {
                setContextKey();
            }
        }));
        setContextKey();
        const debugKeybinding = this.keybindingService.lookupKeybinding(DEBUG_START_COMMAND_ID);
        debugKeybindingLabel = debugKeybinding ? ` (${debugKeybinding.getLabel()})` : '';
    }
    shouldShowWelcome() {
        return true;
    }
};
WelcomeView = __decorate([
    __param(1, IThemeService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IDebugService),
    __param(7, IEditorService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IStorageService),
    __param(12, IHoverService)
], WelcomeView);
export { WelcomeView };
const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'openAFileWhichCanBeDebugged',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}',
        ],
    }, '[Open a file](command:{0}) which can be debugged or run.', isMacintosh && !isWeb ? OpenFileFolderAction.ID : OpenFileAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.toNegated()),
    group: ViewContentGroups.Open,
});
let debugKeybindingLabel = '';
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: `[${localize('runAndDebugAction', 'Run and Debug')}${debugKeybindingLabel}](command:${DEBUG_START_COMMAND_ID})`,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
    group: ViewContentGroups.Debug,
    // Allow inserting more buttons directly after this one (by setting order to 1).
    order: 1,
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebug',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}',
        ],
    }, 'To customize Run and Debug [create a launch.json file](command:{0}).', `${DEBUG_CONFIGURE_COMMAND_ID}?${encodeURIComponent(JSON.stringify([{ addNew: true }]))}`),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.notEqualsTo('empty')),
    group: ViewContentGroups.Debug,
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebugOpenFolder',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            'Please do not translate "launch.json", it is the specific configuration file name',
            '{Locked="](command:{0})"}',
        ],
    }, 'To customize Run and Debug, [open a folder](command:{0}) and create a launch.json file.', isMacintosh && !isWeb ? OpenFileFolderAction.ID : OpenFolderAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.isEqualTo('empty')),
    group: ViewContentGroups.Debug,
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize('allDebuggersDisabled', 'All debug extensions are disabled. Enable a debug extension or install a new one from the Marketplace.'),
    when: CONTEXT_DEBUG_EXTENSION_AVAILABLE.toNegated(),
    group: ViewContentGroups.Debug,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3dlbGNvbWVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsb0JB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