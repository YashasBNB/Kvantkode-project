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
var LinkedEditingContribution_1;
import * as arrays from '../../../../base/common/arrays.js';
import { Delayer, first } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Color } from '../../../../base/common/color.js';
import { isCancellationError, onUnexpectedError, onUnexpectedExternalError, } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, registerModelAndPositionCommand, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import './linkedEditing.css';
export const CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE = new RawContextKey('LinkedEditingInputVisible', false);
const DECORATION_CLASS_NAME = 'linked-editing-decoration';
let LinkedEditingContribution = class LinkedEditingContribution extends Disposable {
    static { LinkedEditingContribution_1 = this; }
    static { this.ID = 'editor.contrib.linkedEditing'; }
    static { this.DECORATION = ModelDecorationOptions.register({
        description: 'linked-editing',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        className: DECORATION_CLASS_NAME,
    }); }
    static get(editor) {
        return editor.getContribution(LinkedEditingContribution_1.ID);
    }
    constructor(editor, contextKeyService, languageFeaturesService, languageConfigurationService, languageFeatureDebounceService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._syncRangesToken = 0;
        this._localToDispose = this._register(new DisposableStore());
        this._editor = editor;
        this._providers = languageFeaturesService.linkedEditingRangeProvider;
        this._enabled = false;
        this._visibleContextKey = CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE.bindTo(contextKeyService);
        this._debounceInformation = languageFeatureDebounceService.for(this._providers, 'Linked Editing', { max: 200 });
        this._currentDecorations = this._editor.createDecorationsCollection();
        this._languageWordPattern = null;
        this._currentWordPattern = null;
        this._ignoreChangeEvent = false;
        this._localToDispose = this._register(new DisposableStore());
        this._rangeUpdateTriggerPromise = null;
        this._rangeSyncTriggerPromise = null;
        this._currentRequestCts = null;
        this._currentRequestPosition = null;
        this._currentRequestModelVersion = null;
        this._register(this._editor.onDidChangeModel(() => this.reinitialize(true)));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(71 /* EditorOption.linkedEditing */) || e.hasChanged(98 /* EditorOption.renameOnType */)) {
                this.reinitialize(false);
            }
        }));
        this._register(this._providers.onDidChange(() => this.reinitialize(false)));
        this._register(this._editor.onDidChangeModelLanguage(() => this.reinitialize(true)));
        this.reinitialize(true);
    }
    reinitialize(forceRefresh) {
        const model = this._editor.getModel();
        const isEnabled = model !== null &&
            (this._editor.getOption(71 /* EditorOption.linkedEditing */) ||
                this._editor.getOption(98 /* EditorOption.renameOnType */)) &&
            this._providers.has(model);
        if (isEnabled === this._enabled && !forceRefresh) {
            return;
        }
        this._enabled = isEnabled;
        this.clearRanges();
        this._localToDispose.clear();
        if (!isEnabled || model === null) {
            return;
        }
        this._localToDispose.add(Event.runAndSubscribe(model.onDidChangeLanguageConfiguration, () => {
            this._languageWordPattern = this.languageConfigurationService
                .getLanguageConfiguration(model.getLanguageId())
                .getWordDefinition();
        }));
        const rangeUpdateScheduler = new Delayer(this._debounceInformation.get(model));
        const triggerRangeUpdate = () => {
            this._rangeUpdateTriggerPromise = rangeUpdateScheduler.trigger(() => this.updateRanges(), this._debounceDuration ?? this._debounceInformation.get(model));
        };
        const rangeSyncScheduler = new Delayer(0);
        const triggerRangeSync = (token) => {
            this._rangeSyncTriggerPromise = rangeSyncScheduler.trigger(() => this._syncRanges(token));
        };
        this._localToDispose.add(this._editor.onDidChangeCursorPosition(() => {
            triggerRangeUpdate();
        }));
        this._localToDispose.add(this._editor.onDidChangeModelContent((e) => {
            if (!this._ignoreChangeEvent) {
                if (this._currentDecorations.length > 0) {
                    const referenceRange = this._currentDecorations.getRange(0);
                    if (referenceRange && e.changes.every((c) => referenceRange.intersectRanges(c.range))) {
                        triggerRangeSync(this._syncRangesToken);
                        return;
                    }
                }
            }
            triggerRangeUpdate();
        }));
        this._localToDispose.add({
            dispose: () => {
                rangeUpdateScheduler.dispose();
                rangeSyncScheduler.dispose();
            },
        });
        this.updateRanges();
    }
    _syncRanges(token) {
        // delayed invocation, make sure we're still on
        if (!this._editor.hasModel() ||
            token !== this._syncRangesToken ||
            this._currentDecorations.length === 0) {
            // nothing to do
            return;
        }
        const model = this._editor.getModel();
        const referenceRange = this._currentDecorations.getRange(0);
        if (!referenceRange || referenceRange.startLineNumber !== referenceRange.endLineNumber) {
            return this.clearRanges();
        }
        const referenceValue = model.getValueInRange(referenceRange);
        if (this._currentWordPattern) {
            const match = referenceValue.match(this._currentWordPattern);
            const matchLength = match ? match[0].length : 0;
            if (matchLength !== referenceValue.length) {
                return this.clearRanges();
            }
        }
        const edits = [];
        for (let i = 1, len = this._currentDecorations.length; i < len; i++) {
            const mirrorRange = this._currentDecorations.getRange(i);
            if (!mirrorRange) {
                continue;
            }
            if (mirrorRange.startLineNumber !== mirrorRange.endLineNumber) {
                edits.push({
                    range: mirrorRange,
                    text: referenceValue,
                });
            }
            else {
                let oldValue = model.getValueInRange(mirrorRange);
                let newValue = referenceValue;
                let rangeStartColumn = mirrorRange.startColumn;
                let rangeEndColumn = mirrorRange.endColumn;
                const commonPrefixLength = strings.commonPrefixLength(oldValue, newValue);
                rangeStartColumn += commonPrefixLength;
                oldValue = oldValue.substr(commonPrefixLength);
                newValue = newValue.substr(commonPrefixLength);
                const commonSuffixLength = strings.commonSuffixLength(oldValue, newValue);
                rangeEndColumn -= commonSuffixLength;
                oldValue = oldValue.substr(0, oldValue.length - commonSuffixLength);
                newValue = newValue.substr(0, newValue.length - commonSuffixLength);
                if (rangeStartColumn !== rangeEndColumn || newValue.length !== 0) {
                    edits.push({
                        range: new Range(mirrorRange.startLineNumber, rangeStartColumn, mirrorRange.endLineNumber, rangeEndColumn),
                        text: newValue,
                    });
                }
            }
        }
        if (edits.length === 0) {
            return;
        }
        try {
            this._editor.popUndoStop();
            this._ignoreChangeEvent = true;
            const prevEditOperationType = this._editor._getViewModel().getPrevEditOperationType();
            this._editor.executeEdits('linkedEditing', edits);
            this._editor._getViewModel().setPrevEditOperationType(prevEditOperationType);
        }
        finally {
            this._ignoreChangeEvent = false;
        }
    }
    dispose() {
        this.clearRanges();
        super.dispose();
    }
    clearRanges() {
        this._visibleContextKey.set(false);
        this._currentDecorations.clear();
        if (this._currentRequestCts) {
            this._currentRequestCts.cancel();
            this._currentRequestCts = null;
            this._currentRequestPosition = null;
        }
    }
    get currentUpdateTriggerPromise() {
        return this._rangeUpdateTriggerPromise || Promise.resolve();
    }
    get currentSyncTriggerPromise() {
        return this._rangeSyncTriggerPromise || Promise.resolve();
    }
    async updateRanges(force = false) {
        if (!this._editor.hasModel()) {
            this.clearRanges();
            return;
        }
        const position = this._editor.getPosition();
        if ((!this._enabled && !force) || this._editor.getSelections().length > 1) {
            // disabled or multicursor
            this.clearRanges();
            return;
        }
        const model = this._editor.getModel();
        const modelVersionId = model.getVersionId();
        if (this._currentRequestPosition && this._currentRequestModelVersion === modelVersionId) {
            if (position.equals(this._currentRequestPosition)) {
                return; // same position
            }
            if (this._currentDecorations.length > 0) {
                const range = this._currentDecorations.getRange(0);
                if (range && range.containsPosition(position)) {
                    return; // just moving inside the existing primary range
                }
            }
        }
        // Clear existing decorations while we compute new ones
        this.clearRanges();
        this._currentRequestPosition = position;
        this._currentRequestModelVersion = modelVersionId;
        const currentRequestCts = (this._currentRequestCts = new CancellationTokenSource());
        try {
            const sw = new StopWatch(false);
            const response = await getLinkedEditingRanges(this._providers, model, position, currentRequestCts.token);
            this._debounceInformation.update(model, sw.elapsed());
            if (currentRequestCts !== this._currentRequestCts) {
                return;
            }
            this._currentRequestCts = null;
            if (modelVersionId !== model.getVersionId()) {
                return;
            }
            let ranges = [];
            if (response?.ranges) {
                ranges = response.ranges;
            }
            this._currentWordPattern = response?.wordPattern || this._languageWordPattern;
            let foundReferenceRange = false;
            for (let i = 0, len = ranges.length; i < len; i++) {
                if (Range.containsPosition(ranges[i], position)) {
                    foundReferenceRange = true;
                    if (i !== 0) {
                        const referenceRange = ranges[i];
                        ranges.splice(i, 1);
                        ranges.unshift(referenceRange);
                    }
                    break;
                }
            }
            if (!foundReferenceRange) {
                // Cannot do linked editing if the ranges are not where the cursor is...
                this.clearRanges();
                return;
            }
            const decorations = ranges.map((range) => ({
                range: range,
                options: LinkedEditingContribution_1.DECORATION,
            }));
            this._visibleContextKey.set(true);
            this._currentDecorations.set(decorations);
            this._syncRangesToken++; // cancel any pending syncRanges call
        }
        catch (err) {
            if (!isCancellationError(err)) {
                onUnexpectedError(err);
            }
            if (this._currentRequestCts === currentRequestCts || !this._currentRequestCts) {
                // stop if we are still the latest request
                this.clearRanges();
            }
        }
    }
    // for testing
    setDebounceDuration(timeInMS) {
        this._debounceDuration = timeInMS;
    }
};
LinkedEditingContribution = LinkedEditingContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ILanguageFeaturesService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeatureDebounceService)
], LinkedEditingContribution);
export { LinkedEditingContribution };
export class LinkedEditingAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.linkedEditing',
            label: nls.localize2('linkedEditing.label', 'Start Linked Editing'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasRenameProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 60 /* KeyCode.F2 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    runCommand(accessor, args) {
        const editorService = accessor.get(ICodeEditorService);
        const [uri, pos] = (Array.isArray(args) && args) || [undefined, undefined];
        if (URI.isUri(uri) && Position.isIPosition(pos)) {
            return editorService
                .openCodeEditor({ resource: uri }, editorService.getActiveCodeEditor())
                .then((editor) => {
                if (!editor) {
                    return;
                }
                editor.setPosition(pos);
                editor.invokeWithinContext((accessor) => {
                    this.reportTelemetry(accessor, editor);
                    return this.run(accessor, editor);
                });
            }, onUnexpectedError);
        }
        return super.runCommand(accessor, args);
    }
    run(_accessor, editor) {
        const controller = LinkedEditingContribution.get(editor);
        if (controller) {
            return Promise.resolve(controller.updateRanges(true));
        }
        return Promise.resolve();
    }
}
const LinkedEditingCommand = EditorCommand.bindToContribution(LinkedEditingContribution.get);
registerEditorCommand(new LinkedEditingCommand({
    id: 'cancelLinkedEditingInput',
    precondition: CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE,
    handler: (x) => x.clearRanges(),
    kbOpts: {
        kbExpr: EditorContextKeys.editorTextFocus,
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
function getLinkedEditingRanges(providers, model, position, token) {
    const orderedByScore = providers.ordered(model);
    // in order of score ask the linked editing range provider
    // until someone response with a good result
    // (good = not null)
    return first(orderedByScore.map((provider) => async () => {
        try {
            return await provider.provideLinkedEditingRanges(model, position, token);
        }
        catch (e) {
            onUnexpectedExternalError(e);
            return undefined;
        }
    }), (result) => !!result && arrays.isNonEmptyArray(result?.ranges));
}
export const editorLinkedEditingBackground = registerColor('editor.linkedEditingBackground', {
    dark: Color.fromHex('#f00').transparent(0.3),
    light: Color.fromHex('#f00').transparent(0.3),
    hcDark: Color.fromHex('#f00').transparent(0.3),
    hcLight: Color.white,
}, nls.localize('editorLinkedEditingBackground', 'Background color when the editor auto renames on type.'));
registerModelAndPositionCommand('_executeLinkedEditingProvider', (_accessor, model, position) => {
    const { linkedEditingRangeProvider } = _accessor.get(ILanguageFeaturesService);
    return getLinkedEditingRanges(linkedEditingRangeProvider, model, position, CancellationToken.None);
});
registerEditorContribution(LinkedEditingContribution.ID, LinkedEditingContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(LinkedEditingAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGlua2VkRWRpdGluZy9icm93c2VyL2xpbmtlZEVkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIseUJBQXlCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBRWIsb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsRUFDMUIsK0JBQStCLEdBRS9CLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFbkYsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtB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