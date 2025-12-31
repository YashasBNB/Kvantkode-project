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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3F1aWNrYWNjZXNzL2dvdG9TeW1ib2xRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBR04sa0JBQWtCLEVBRWxCLGNBQWMsR0FDZCxNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUVOLFVBQVUsSUFBSSxxQkFBcUIsR0FDbkMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQ04scUNBQXFDLEdBRXJDLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHckcsT0FBTyxFQUNOLGVBQWUsRUFFZixZQUFZLEVBQ1osVUFBVSxFQUNWLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUl4RSxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLGlEQUFpRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHFCQUFxQixHQUNyQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsbUJBQW1CLEdBQ25CLE1BQU0sMENBQTBDLENBQUE7QUFFMUMsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxxQ0FBcUM7O0lBR3ZGLFlBQ2lCLGFBQThDLEVBQ3hDLGtCQUF5RCxFQUN4RCxvQkFBNEQsRUFDekQsdUJBQWlELEVBQzFELGNBQWdELEVBQzNDLG1CQUF5QztRQUUvRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUU7WUFDbkQsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUI7U0FDekUsQ0FBQyxDQUFBO1FBVCtCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBQ3ZDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUC9DLHVDQUFrQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUE7SUFhbEcsQ0FBQztJQUVELGdEQUFnRDtJQUVoRCxJQUFZLGFBQWE7UUFDeEIsTUFBTSxZQUFZLEdBQ2pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQWlDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQTtRQUV0RixPQUFPO1lBQ04sZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLEVBQUUsMEJBQTBCLElBQUksQ0FBQyxZQUFZLEVBQUUsYUFBYTtZQUMzRix1QkFBdUIsRUFBRSxZQUFZLEVBQUUsdUJBQXVCO1NBQzlELENBQUE7SUFDRixDQUFDO0lBRUQsSUFBYyx1QkFBdUI7UUFDcEMsc0VBQXNFO1FBQ3RFLHdFQUF3RTtRQUN4RSwyRUFBMkU7UUFDM0UseUNBQXlDO1FBQ3pDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDMUUsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQTtJQUNsRCxDQUFDO0lBRWtCLFlBQVksQ0FDOUIsT0FBc0MsRUFDdEMsT0FLQztRQUVELDJCQUEyQjtRQUMzQixJQUNDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ25CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUNoRSxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUM5QixDQUFDO1lBQ0YsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQSxDQUFDLCtEQUErRDtZQUU1RixNQUFNLGFBQWEsR0FBdUI7Z0JBQ3pDLFNBQVMsRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCO2dCQUN0RSxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWE7YUFDcEMsQ0FBQTtZQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCxpQ0FBaUM7YUFDNUIsQ0FBQztZQUNMLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLDhEQUE4RDthQUV0Qyx5QkFBb0IsR0FBRyxJQUFJLEFBQVAsQ0FBTztJQUVuRCxLQUFLLENBQUMsY0FBYyxDQUNuQixLQUFpQixFQUNqQixNQUFjLEVBQ2QsT0FBeUMsRUFDekMsV0FBNEIsRUFDNUIsS0FBd0I7UUFFeEIsa0VBQWtFO1FBQ2xFLDhEQUE4RDtRQUM5RCw0REFBNEQ7UUFDNUQscURBQXFEO1FBQ3JELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQztZQUNqQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQztZQUN0RCxPQUFPLENBQUMsK0JBQTZCLENBQUMsb0JBQW9CLENBQUM7U0FDM0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUM5QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFDckMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUNwQixPQUFPLEVBQ1AsS0FBSyxFQUNMLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFTyx3QkFBd0IsQ0FDMUMsTUFBcUU7UUFFckUsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0I7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUMzRSxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ1QsQ0FBQztJQUVPLGlCQUFpQixDQUN4QixNQUFxRTtRQUVyRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFBO1FBQ2hELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBRXpDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEQsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFFbEIsSUFBSSxDQUFDLGNBQWM7YUFDakIsYUFBYSxDQUFDLElBQUksbUNBQTJCLEdBQUcsQ0FBQyxLQUFLLENBQUM7YUFDdkQsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDakIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDakIsT0FBTTtZQUNQLENBQUM7WUFFRCxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRXhCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQzVDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDakIsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUV6RSxNQUFNLEtBQUssR0FBK0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDcEUsT0FBTztvQkFDTixJQUFJLHlCQUFpQjtvQkFDckIsS0FBSyxFQUFFLEdBQUc7b0JBQ1YsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNsQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7b0JBQzlCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztvQkFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2lCQUM5QixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixXQUFXLENBQUMsR0FBRyxDQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUN2QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUE7Z0JBQ3BDLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUMvRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO2dCQUM5QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQzNDLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDMUIsb0NBQW9DO3dCQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTt3QkFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTt3QkFDM0IsT0FBTyxJQUFJLENBQUE7b0JBQ1osQ0FBQztvQkFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsS0FBSzt5QkFDL0IsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7eUJBQzlELElBQUksRUFBRSxDQUFBO29CQUNSLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDbkQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUN2QixZQUFZLEVBQ1osWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUMxQixDQUFDLEVBQ0QsV0FBVyxDQUFDLElBQUksRUFDaEIsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFDOUIsQ0FBQyxFQUNELEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FDbkQsQ0FBQTtvQkFFRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ1osT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztvQkFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRzt3QkFDakIsS0FBSyxFQUFFLHFCQUFxQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsSUFBSSxTQUFTO3FCQUNwRSxDQUFBO29CQUNELE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUMsQ0FBQyxDQUFBO2dCQUVGLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO29CQUN0RCxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksNEJBQW1CLEVBQUUsQ0FBQyxDQUFBO29CQUM5RCxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDekIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFBO2dCQUM3QixDQUFDO1lBQ0YsQ0FBQyxDQUFBO1lBQ0QsaUJBQWlCLEVBQUUsQ0FBQTtZQUNuQixXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7WUFFM0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7WUFDakQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBRWxDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtnQkFDN0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7Z0JBQ2xDLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsaUJBQWlCLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDeEUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDO2FBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNiLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUgsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQzs7QUE3UFcsNkJBQTZCO0lBSXZDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG9CQUFvQixDQUFBO0dBVFYsNkJBQTZCLENBOFB6Qzs7QUFFRCxNQUFNLGdCQUFpQixTQUFRLE9BQU87YUFDckIsT0FBRSxHQUFHLDZCQUE2QixDQUFBO0lBRWxEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdCQUFnQixDQUFDLEVBQUU7WUFDdkIsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQztnQkFDdkQsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNuRSw2QkFBNkIsQ0FDN0I7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzRixNQUFNLDZDQUFtQztnQkFDekMsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTthQUNyRDtZQUNELElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWE7b0JBQ3hCLEtBQUssRUFBRSxjQUFjO29CQUNyQixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRO2FBQ04sR0FBRyxDQUFDLGtCQUFrQixDQUFDO2FBQ3ZCLFdBQVcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFO1lBQ3ZELGNBQWMsRUFBRSxjQUFjLENBQUMsSUFBSTtTQUNuQyxDQUFDLENBQUE7SUFDSixDQUFDOztBQUdGLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBRWpDLFFBQVEsQ0FBQyxFQUFFLENBQXVCLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO0lBQ2hHLElBQUksRUFBRSw2QkFBNkI7SUFDbkMsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLE1BQU07SUFDcEQsVUFBVSxFQUFFLHFCQUFxQjtJQUNqQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLHFDQUFxQyxDQUFDO0lBQ2hHLFdBQVcsRUFBRTtRQUNaO1lBQ0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3QkFBd0IsQ0FBQztZQUN4RSxNQUFNLEVBQUUscUNBQXFDLENBQUMsTUFBTTtZQUNwRCxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTtZQUM5QixrQkFBa0IsRUFBRSxFQUFFO1NBQ3RCO1FBQ0Q7WUFDQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixpQ0FBaUMsRUFDakMsb0NBQW9DLENBQ3BDO1lBQ0QsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLGtCQUFrQjtTQUNoRTtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=