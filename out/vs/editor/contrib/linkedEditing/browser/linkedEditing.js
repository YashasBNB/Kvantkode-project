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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmtlZEVkaXRpbmcvYnJvd3Nlci9saW5rZWRFZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUJBQWlCLEVBQ2pCLHlCQUF5QixHQUN6QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFDTixZQUFZLEVBQ1osYUFBYSxFQUViLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIsMEJBQTBCLEVBQzFCLCtCQUErQixHQUUvQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRW5GLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFN0Qs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