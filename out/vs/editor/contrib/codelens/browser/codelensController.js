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
import { createCancelablePromise, disposableTimeout, RunOnceScheduler, } from '../../../../base/common/async.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { getCodeLensModel } from './codelens.js';
import { ICodeLensCache } from './codeLensCache.js';
import { CodeLensHelper, CodeLensWidget } from './codelensWidget.js';
import { localize, localize2 } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
let CodeLensContribution = class CodeLensContribution {
    static { this.ID = 'css.editor.codeLens'; }
    constructor(_editor, _languageFeaturesService, debounceService, _commandService, _notificationService, _codeLensCache) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._codeLensCache = _codeLensCache;
        this._disposables = new DisposableStore();
        this._localToDispose = new DisposableStore();
        this._lenses = [];
        this._oldCodeLensModels = new DisposableStore();
        this._provideCodeLensDebounce = debounceService.for(_languageFeaturesService.codeLensProvider, 'CodeLensProvide', { min: 250 });
        this._resolveCodeLensesDebounce = debounceService.for(_languageFeaturesService.codeLensProvider, 'CodeLensResolve', { min: 250, salt: 'resolve' });
        this._resolveCodeLensesScheduler = new RunOnceScheduler(() => this._resolveCodeLensesInViewport(), this._resolveCodeLensesDebounce.default());
        this._disposables.add(this._editor.onDidChangeModel(() => this._onModelChange()));
        this._disposables.add(this._editor.onDidChangeModelLanguage(() => this._onModelChange()));
        this._disposables.add(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */) ||
                e.hasChanged(19 /* EditorOption.codeLensFontSize */) ||
                e.hasChanged(18 /* EditorOption.codeLensFontFamily */)) {
                this._updateLensStyle();
            }
            if (e.hasChanged(17 /* EditorOption.codeLens */)) {
                this._onModelChange();
            }
        }));
        this._disposables.add(_languageFeaturesService.codeLensProvider.onDidChange(this._onModelChange, this));
        this._onModelChange();
        this._updateLensStyle();
    }
    dispose() {
        this._localDispose();
        this._localToDispose.dispose();
        this._disposables.dispose();
        this._oldCodeLensModels.dispose();
        this._currentCodeLensModel?.dispose();
    }
    _getLayoutInfo() {
        const lineHeightFactor = Math.max(1.3, this._editor.getOption(68 /* EditorOption.lineHeight */) /
            this._editor.getOption(54 /* EditorOption.fontSize */));
        let fontSize = this._editor.getOption(19 /* EditorOption.codeLensFontSize */);
        if (!fontSize || fontSize < 5) {
            fontSize = (this._editor.getOption(54 /* EditorOption.fontSize */) * 0.9) | 0;
        }
        return {
            fontSize,
            codeLensHeight: (fontSize * lineHeightFactor) | 0,
        };
    }
    _updateLensStyle() {
        const { codeLensHeight, fontSize } = this._getLayoutInfo();
        const fontFamily = this._editor.getOption(18 /* EditorOption.codeLensFontFamily */);
        const editorFontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const { style } = this._editor.getContainerDomNode();
        style.setProperty('--vscode-editorCodeLens-lineHeight', `${codeLensHeight}px`);
        style.setProperty('--vscode-editorCodeLens-fontSize', `${fontSize}px`);
        style.setProperty('--vscode-editorCodeLens-fontFeatureSettings', editorFontInfo.fontFeatureSettings);
        if (fontFamily) {
            style.setProperty('--vscode-editorCodeLens-fontFamily', fontFamily);
            style.setProperty('--vscode-editorCodeLens-fontFamilyDefault', EDITOR_FONT_DEFAULTS.fontFamily);
        }
        //
        this._editor.changeViewZones((accessor) => {
            for (const lens of this._lenses) {
                lens.updateHeight(codeLensHeight, accessor);
            }
        });
    }
    _localDispose() {
        this._getCodeLensModelPromise?.cancel();
        this._getCodeLensModelPromise = undefined;
        this._resolveCodeLensesPromise?.cancel();
        this._resolveCodeLensesPromise = undefined;
        this._localToDispose.clear();
        this._oldCodeLensModels.clear();
        this._currentCodeLensModel?.dispose();
    }
    _onModelChange() {
        this._localDispose();
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        if (!this._editor.getOption(17 /* EditorOption.codeLens */) || model.isTooLargeForTokenization()) {
            return;
        }
        const cachedLenses = this._codeLensCache.get(model);
        if (cachedLenses) {
            this._renderCodeLensSymbols(cachedLenses);
        }
        if (!this._languageFeaturesService.codeLensProvider.has(model)) {
            // no provider -> return but check with
            // cached lenses. they expire after 30 seconds
            if (cachedLenses) {
                disposableTimeout(() => {
                    const cachedLensesNow = this._codeLensCache.get(model);
                    if (cachedLenses === cachedLensesNow) {
                        this._codeLensCache.delete(model);
                        this._onModelChange();
                    }
                }, 30 * 1000, this._localToDispose);
            }
            return;
        }
        for (const provider of this._languageFeaturesService.codeLensProvider.all(model)) {
            if (typeof provider.onDidChange === 'function') {
                const registration = provider.onDidChange(() => scheduler.schedule());
                this._localToDispose.add(registration);
            }
        }
        const scheduler = new RunOnceScheduler(() => {
            const t1 = Date.now();
            this._getCodeLensModelPromise?.cancel();
            this._getCodeLensModelPromise = createCancelablePromise((token) => getCodeLensModel(this._languageFeaturesService.codeLensProvider, model, token));
            this._getCodeLensModelPromise.then((result) => {
                if (this._currentCodeLensModel) {
                    this._oldCodeLensModels.add(this._currentCodeLensModel);
                }
                this._currentCodeLensModel = result;
                // cache model to reduce flicker
                this._codeLensCache.put(model, result);
                // update moving average
                const newDelay = this._provideCodeLensDebounce.update(model, Date.now() - t1);
                scheduler.delay = newDelay;
                // render lenses
                this._renderCodeLensSymbols(result);
                // dom.scheduleAtNextAnimationFrame(() => this._resolveCodeLensesInViewport());
                this._resolveCodeLensesInViewportSoon();
            }, onUnexpectedError);
        }, this._provideCodeLensDebounce.get(model));
        this._localToDispose.add(scheduler);
        this._localToDispose.add(toDisposable(() => this._resolveCodeLensesScheduler.cancel()));
        this._localToDispose.add(this._editor.onDidChangeModelContent(() => {
            this._editor.changeDecorations((decorationsAccessor) => {
                this._editor.changeViewZones((viewZonesAccessor) => {
                    const toDispose = [];
                    let lastLensLineNumber = -1;
                    this._lenses.forEach((lens) => {
                        if (!lens.isValid() || lastLensLineNumber === lens.getLineNumber()) {
                            // invalid -> lens collapsed, attach range doesn't exist anymore
                            // line_number -> lenses should never be on the same line
                            toDispose.push(lens);
                        }
                        else {
                            lens.update(viewZonesAccessor);
                            lastLensLineNumber = lens.getLineNumber();
                        }
                    });
                    const helper = new CodeLensHelper();
                    toDispose.forEach((l) => {
                        l.dispose(helper, viewZonesAccessor);
                        this._lenses.splice(this._lenses.indexOf(l), 1);
                    });
                    helper.commit(decorationsAccessor);
                });
            });
            // Ask for all references again
            scheduler.schedule();
            // Cancel pending and active resolve requests
            this._resolveCodeLensesScheduler.cancel();
            this._resolveCodeLensesPromise?.cancel();
            this._resolveCodeLensesPromise = undefined;
        }));
        this._localToDispose.add(this._editor.onDidFocusEditorText(() => {
            scheduler.schedule();
        }));
        this._localToDispose.add(this._editor.onDidBlurEditorText(() => {
            scheduler.cancel();
        }));
        this._localToDispose.add(this._editor.onDidScrollChange((e) => {
            if (e.scrollTopChanged && this._lenses.length > 0) {
                this._resolveCodeLensesInViewportSoon();
            }
        }));
        this._localToDispose.add(this._editor.onDidLayoutChange(() => {
            this._resolveCodeLensesInViewportSoon();
        }));
        this._localToDispose.add(toDisposable(() => {
            if (this._editor.getModel()) {
                const scrollState = StableEditorScrollState.capture(this._editor);
                this._editor.changeDecorations((decorationsAccessor) => {
                    this._editor.changeViewZones((viewZonesAccessor) => {
                        this._disposeAllLenses(decorationsAccessor, viewZonesAccessor);
                    });
                });
                scrollState.restore(this._editor);
            }
            else {
                // No accessors available
                this._disposeAllLenses(undefined, undefined);
            }
        }));
        this._localToDispose.add(this._editor.onMouseDown((e) => {
            if (e.target.type !== 9 /* MouseTargetType.CONTENT_WIDGET */) {
                return;
            }
            let target = e.target.element;
            if (target?.tagName === 'SPAN') {
                target = target.parentElement;
            }
            if (target?.tagName === 'A') {
                for (const lens of this._lenses) {
                    const command = lens.getCommand(target);
                    if (command) {
                        this._commandService
                            .executeCommand(command.id, ...(command.arguments || []))
                            .catch((err) => this._notificationService.error(err));
                        break;
                    }
                }
            }
        }));
        scheduler.schedule();
    }
    _disposeAllLenses(decChangeAccessor, viewZoneChangeAccessor) {
        const helper = new CodeLensHelper();
        for (const lens of this._lenses) {
            lens.dispose(helper, viewZoneChangeAccessor);
        }
        if (decChangeAccessor) {
            helper.commit(decChangeAccessor);
        }
        this._lenses.length = 0;
    }
    _renderCodeLensSymbols(symbols) {
        if (!this._editor.hasModel()) {
            return;
        }
        const maxLineNumber = this._editor.getModel().getLineCount();
        const groups = [];
        let lastGroup;
        for (const symbol of symbols.lenses) {
            const line = symbol.symbol.range.startLineNumber;
            if (line < 1 || line > maxLineNumber) {
                // invalid code lens
                continue;
            }
            else if (lastGroup &&
                lastGroup[lastGroup.length - 1].symbol.range.startLineNumber === line) {
                // on same line as previous
                lastGroup.push(symbol);
            }
            else {
                // on later line as previous
                lastGroup = [symbol];
                groups.push(lastGroup);
            }
        }
        if (!groups.length && !this._lenses.length) {
            // Nothing to change
            return;
        }
        const scrollState = StableEditorScrollState.capture(this._editor);
        const layoutInfo = this._getLayoutInfo();
        this._editor.changeDecorations((decorationsAccessor) => {
            this._editor.changeViewZones((viewZoneAccessor) => {
                const helper = new CodeLensHelper();
                let codeLensIndex = 0;
                let groupsIndex = 0;
                while (groupsIndex < groups.length && codeLensIndex < this._lenses.length) {
                    const symbolsLineNumber = groups[groupsIndex][0].symbol.range.startLineNumber;
                    const codeLensLineNumber = this._lenses[codeLensIndex].getLineNumber();
                    if (codeLensLineNumber < symbolsLineNumber) {
                        this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
                        this._lenses.splice(codeLensIndex, 1);
                    }
                    else if (codeLensLineNumber === symbolsLineNumber) {
                        this._lenses[codeLensIndex].updateCodeLensSymbols(groups[groupsIndex], helper);
                        groupsIndex++;
                        codeLensIndex++;
                    }
                    else {
                        this._lenses.splice(codeLensIndex, 0, new CodeLensWidget(groups[groupsIndex], this._editor, helper, viewZoneAccessor, layoutInfo.codeLensHeight, () => this._resolveCodeLensesInViewportSoon()));
                        codeLensIndex++;
                        groupsIndex++;
                    }
                }
                // Delete extra code lenses
                while (codeLensIndex < this._lenses.length) {
                    this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
                    this._lenses.splice(codeLensIndex, 1);
                }
                // Create extra symbols
                while (groupsIndex < groups.length) {
                    this._lenses.push(new CodeLensWidget(groups[groupsIndex], this._editor, helper, viewZoneAccessor, layoutInfo.codeLensHeight, () => this._resolveCodeLensesInViewportSoon()));
                    groupsIndex++;
                }
                helper.commit(decorationsAccessor);
            });
        });
        scrollState.restore(this._editor);
    }
    _resolveCodeLensesInViewportSoon() {
        const model = this._editor.getModel();
        if (model) {
            this._resolveCodeLensesScheduler.schedule();
        }
    }
    _resolveCodeLensesInViewport() {
        this._resolveCodeLensesPromise?.cancel();
        this._resolveCodeLensesPromise = undefined;
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        const toResolve = [];
        const lenses = [];
        this._lenses.forEach((lens) => {
            const request = lens.computeIfNecessary(model);
            if (request) {
                toResolve.push(request);
                lenses.push(lens);
            }
        });
        if (toResolve.length === 0) {
            return;
        }
        const t1 = Date.now();
        const resolvePromise = createCancelablePromise((token) => {
            const promises = toResolve.map((request, i) => {
                const resolvedSymbols = new Array(request.length);
                const promises = request.map((request, i) => {
                    if (!request.symbol.command && typeof request.provider.resolveCodeLens === 'function') {
                        return Promise.resolve(request.provider.resolveCodeLens(model, request.symbol, token)).then((symbol) => {
                            resolvedSymbols[i] = symbol;
                        }, onUnexpectedExternalError);
                    }
                    else {
                        resolvedSymbols[i] = request.symbol;
                        return Promise.resolve(undefined);
                    }
                });
                return Promise.all(promises).then(() => {
                    if (!token.isCancellationRequested && !lenses[i].isDisposed()) {
                        lenses[i].updateCommands(resolvedSymbols);
                    }
                });
            });
            return Promise.all(promises);
        });
        this._resolveCodeLensesPromise = resolvePromise;
        this._resolveCodeLensesPromise.then(() => {
            // update moving average
            const newDelay = this._resolveCodeLensesDebounce.update(model, Date.now() - t1);
            this._resolveCodeLensesScheduler.delay = newDelay;
            if (this._currentCodeLensModel) {
                // update the cached state with new resolved items
                this._codeLensCache.put(model, this._currentCodeLensModel);
            }
            this._oldCodeLensModels.clear(); // dispose old models once we have updated the UI with the current model
            if (resolvePromise === this._resolveCodeLensesPromise) {
                this._resolveCodeLensesPromise = undefined;
            }
        }, (err) => {
            onUnexpectedError(err); // can also be cancellation!
            if (resolvePromise === this._resolveCodeLensesPromise) {
                this._resolveCodeLensesPromise = undefined;
            }
        });
    }
    async getModel() {
        await this._getCodeLensModelPromise;
        await this._resolveCodeLensesPromise;
        return !this._currentCodeLensModel?.isDisposed ? this._currentCodeLensModel : undefined;
    }
};
CodeLensContribution = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageFeatureDebounceService),
    __param(3, ICommandService),
    __param(4, INotificationService),
    __param(5, ICodeLensCache)
], CodeLensContribution);
export { CodeLensContribution };
registerEditorContribution(CodeLensContribution.ID, CodeLensContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(class ShowLensesInCurrentLine extends EditorAction {
    constructor() {
        super({
            id: 'codelens.showLensesInCurrentLine',
            precondition: EditorContextKeys.hasCodeLensProvider,
            label: localize2('showLensOnLine', 'Show CodeLens Commands for Current Line'),
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const quickInputService = accessor.get(IQuickInputService);
        const commandService = accessor.get(ICommandService);
        const notificationService = accessor.get(INotificationService);
        const lineNumber = editor.getSelection().positionLineNumber;
        const codelensController = editor.getContribution(CodeLensContribution.ID);
        if (!codelensController) {
            return;
        }
        const model = await codelensController.getModel();
        if (!model) {
            // nothing
            return;
        }
        const items = [];
        for (const lens of model.lenses) {
            if (lens.symbol.command && lens.symbol.range.startLineNumber === lineNumber) {
                items.push({
                    label: lens.symbol.command.title,
                    command: lens.symbol.command,
                });
            }
        }
        if (items.length === 0) {
            // We dont want an empty picker
            return;
        }
        const item = await quickInputService.pick(items, {
            canPickMany: false,
            placeHolder: localize('placeHolder', 'Select a command'),
        });
        if (!item) {
            // Nothing picked
            return;
        }
        let command = item.command;
        if (model.isDisposed) {
            // try to find the same command again in-case the model has been re-created in the meantime
            // this is a best attempt approach which shouldn't be needed because eager model re-creates
            // shouldn't happen due to focus in/out anymore
            const newModel = await codelensController.getModel();
            const newLens = newModel?.lenses.find((lens) => lens.symbol.range.startLineNumber === lineNumber &&
                lens.symbol.command?.title === command.title);
            if (!newLens || !newLens.symbol.command) {
                return;
            }
            command = newLens.symbol.command;
        }
        try {
            await commandService.executeCommand(command.id, ...(command.arguments || []));
        }
        catch (err) {
            notificationService.error(err);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZWxlbnMvYnJvd3Nlci9jb2RlbGVuc0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsZ0JBQWdCLEdBQ2hCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQU9oRixPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHeEUsT0FBTyxFQUErQixnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFP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