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
var GotoSymbolQuickAccessProvider_1;
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService, ItemActivation, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as QuickaccessExtensions, } from '../../../../../platform/quickinput/common/quickAccess.js';
import { AbstractGotoSymbolQuickAccessProvider, } from '../../../../../editor/contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { DisposableStore, toDisposable, Disposable, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { registerAction2, Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { prepareQuery } from '../../../../../base/common/fuzzyScorer.js';
import { fuzzyScore } from '../../../../../base/common/filters.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { IOutlineService } from '../../../../services/outline/browser/outline.js';
import { isCompositeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewIsShown, } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { matchesFuzzyIconAware, parseLabelWithIcons, } from '../../../../../base/common/iconLabels.js';
let GotoSymbolQuickAccessProvider = class GotoSymbolQuickAccessProvider extends AbstractGotoSymbolQuickAccessProvider {
    static { GotoSymbolQuickAccessProvider_1 = this; }
    constructor(editorService, editorGroupService, configurationService, languageFeaturesService, outlineService, outlineModelService) {
        super(languageFeaturesService, outlineModelService, {
            openSideBySideDirection: () => this.configuration.openSideBySideDirection,
        });
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.outlineService = outlineService;
        this.onDidActiveTextEditorControlChange = this.editorService.onDidActiveEditorChange;
    }
    //#region DocumentSymbols (text editor required)
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection,
        };
    }
    get activeTextEditorControl() {
        // TODO: this distinction should go away by adopting `IOutlineService`
        // for all editors (either text based ones or not). Currently text based
        // editors are not yet using the new outline service infrastructure but the
        // "classical" document symbols approach.
        if (isCompositeEditor(this.editorService.activeEditorPane?.getControl())) {
            return undefined;
        }
        return this.editorService.activeTextEditorControl;
    }
    gotoLocation(context, options) {
        // Check for sideBySide use
        if ((options.keyMods.alt ||
            (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) ||
            options.forceSideBySide) &&
            this.editorService.activeEditor) {
            context.restoreViewState?.(); // since we open to the side, restore view state in this editor
            const editorOptions = {
                selection: options.range,
                pinned: options.keyMods.ctrlCmd || this.configuration.openEditorPinned,
                preserveFocus: options.preserveFocus,
            };
            this.editorGroupService.sideGroup.openEditor(this.editorService.activeEditor, editorOptions);
        }
        // Otherwise let parent handle it
        else {
            super.gotoLocation(context, options);
        }
    }
    //#endregion
    //#region public methods to use this picker from other pickers
    static { this.SYMBOL_PICKS_TIMEOUT = 8000; }
    async getSymbolPicks(model, filter, options, disposables, token) {
        // If the registry does not know the model, we wait for as long as
        // the registry knows it. This helps in cases where a language
        // registry was not activated yet for providing any symbols.
        // To not wait forever, we eventually timeout though.
        const result = await Promise.race([
            this.waitForLanguageSymbolRegistry(model, disposables),
            timeout(GotoSymbolQuickAccessProvider_1.SYMBOL_PICKS_TIMEOUT),
        ]);
        if (!result || token.isCancellationRequested) {
            return [];
        }
        return this.doGetSymbolPicks(this.getDocumentSymbols(model, token), prepareQuery(filter), options, token, model);
    }
    //#endregion
    provideWithoutTextEditor(picker) {
        if (this.canPickWithOutlineService()) {
            return this.doGetOutlinePicks(picker);
        }
        return super.provideWithoutTextEditor(picker);
    }
    canPickWithOutlineService() {
        return this.editorService.activeEditorPane
            ? this.outlineService.canCreateOutline(this.editorService.activeEditorPane)
            : false;
    }
    doGetOutlinePicks(picker) {
        const pane = this.editorService.activeEditorPane;
        if (!pane) {
            return Disposable.None;
        }
        const cts = new CancellationTokenSource();
        const disposables = new DisposableStore();
        disposables.add(toDisposable(() => cts.dispose(true)));
        picker.busy = true;
        this.outlineService
            .createOutline(pane, 4 /* OutlineTarget.QuickPick */, cts.token)
            .then((outline) => {
            if (!outline) {
                return;
            }
            if (cts.token.isCancellationRequested) {
                outline.dispose();
                return;
            }
            disposables.add(outline);
            const viewState = outline.captureViewState();
            disposables.add(toDisposable(() => {
                if (picker.selectedItems.length === 0) {
                    viewState.dispose();
                }
            }));
            const entries = outline.config.quickPickDataSource.getQuickPickElements();
            const items = entries.map((entry, idx) => {
                return {
                    kind: 0 /* SymbolKind.File */,
                    index: idx,
                    score: 0,
                    label: entry.label,
                    description: entry.description,
                    ariaLabel: entry.ariaLabel,
                    iconClasses: entry.iconClasses,
                };
            });
            disposables.add(picker.onDidAccept(() => {
                picker.hide();
                const [entry] = picker.selectedItems;
                if (entry && entries[entry.index]) {
                    outline.reveal(entries[entry.index].element, {}, false, false);
                }
            }));
            const updatePickerItems = () => {
                const filteredItems = items.filter((item) => {
                    if (picker.value === '@') {
                        // default, no filtering, scoring...
                        item.score = 0;
                        item.highlights = undefined;
                        return true;
                    }
                    const trimmedQuery = picker.value
                        .substring(AbstractGotoSymbolQuickAccessProvider.PREFIX.length)
                        .trim();
                    const parsedLabel = parseLabelWithIcons(item.label);
                    const score = fuzzyScore(trimmedQuery, trimmedQuery.toLowerCase(), 0, parsedLabel.text, parsedLabel.text.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
                    if (!score) {
                        return false;
                    }
                    item.score = score[1];
                    item.highlights = {
                        label: matchesFuzzyIconAware(trimmedQuery, parsedLabel) ?? undefined,
                    };
                    return true;
                });
                if (filteredItems.length === 0) {
                    const label = localize('empty', 'No matching entries');
                    picker.items = [{ label, index: -1, kind: 14 /* SymbolKind.String */ }];
                    picker.ariaLabel = label;
                }
                else {
                    picker.items = filteredItems;
                }
            };
            updatePickerItems();
            disposables.add(picker.onDidChangeValue(updatePickerItems));
            const previewDisposable = new MutableDisposable();
            disposables.add(previewDisposable);
            disposables.add(picker.onDidChangeActive(() => {
                const [entry] = picker.activeItems;
                if (entry && entries[entry.index]) {
                    previewDisposable.value = outline.preview(entries[entry.index].element);
                }
                else {
                    previewDisposable.clear();
                }
            }));
        })
            .catch((err) => {
            onUnexpectedError(err);
            picker.hide();
        })
            .finally(() => {
            picker.busy = false;
        });
        return disposables;
    }
};
GotoSymbolQuickAccessProvider = GotoSymbolQuickAccessProvider_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ILanguageFeaturesService),
    __param(4, IOutlineService),
    __param(5, IOutlineModelService)
], GotoSymbolQuickAccessProvider);
export { GotoSymbolQuickAccessProvider };
class GotoSymbolAction extends Action2 {
    static { this.ID = 'workbench.action.gotoSymbol'; }
    constructor() {
        super({
            id: GotoSymbolAction.ID,
            title: {
                ...localize2('gotoSymbol', 'Go to Symbol in Editor...'),
                mnemonicTitle: localize({ key: 'miGotoSymbolInEditor', comment: ['&& denotes a mnemonic'] }, 'Go to &&Symbol in Editor...'),
            },
            f1: true,
            keybinding: {
                when: ContextKeyExpr.and(accessibleViewIsShown.negate(), accessibilityHelpIsShown.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
            },
            menu: [
                {
                    id: MenuId.MenubarGoMenu,
                    group: '4_symbol_nav',
                    order: 1,
                },
            ],
        });
    }
    run(accessor) {
        accessor
            .get(IQuickInputService)
            .quickAccess.show(GotoSymbolQuickAccessProvider.PREFIX, {
            itemActivation: ItemActivation.NONE,
        });
    }
}
registerAction2(GotoSymbolAction);
Registry.as(QuickaccessExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: GotoSymbolQuickAccessProvider,
    prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
    contextKey: 'inFileSymbolsPicker',
    placeholder: localize('gotoSymbolQuickAccessPlaceholder', 'Type the name of a symbol to go to.'),
    helpEntries: [
        {
            description: localize('gotoSymbolQuickAccess', 'Go to Symbol in Editor'),
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
            commandId: GotoSymbolAction.ID,
            commandCenterOrder: 40,
        },
        {
            description: localize('gotoSymbolByCategoryQuickAccess', 'Go to Symbol in Editor by Category'),
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY,
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvcXVpY2thY2Nlc3MvZ290b1N5bWJvbFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFHTixrQkFBa0IsRUFFbEIsY0FBYyxHQUNkLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sVUFBVSxJQUFJLHFCQUFxQixHQUNuQyxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixxQ0FBcUMsR0FFckMsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUdyRyxPQUFPLEVBQ04sZUFBZSxFQUVmLFlBQVksRUFDWixVQUFVLEVBQ1YsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1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