/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, Delayer, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
import * as languages from '../../../common/languages.js';
import { provideSignatureHelp } from './provideSignatureHelp.js';
var ParameterHintState;
(function (ParameterHintState) {
    let Type;
    (function (Type) {
        Type[Type["Default"] = 0] = "Default";
        Type[Type["Active"] = 1] = "Active";
        Type[Type["Pending"] = 2] = "Pending";
    })(Type = ParameterHintState.Type || (ParameterHintState.Type = {}));
    ParameterHintState.Default = { type: 0 /* Type.Default */ };
    class Pending {
        constructor(request, previouslyActiveHints) {
            this.request = request;
            this.previouslyActiveHints = previouslyActiveHints;
            this.type = 2 /* Type.Pending */;
        }
    }
    ParameterHintState.Pending = Pending;
    class Active {
        constructor(hints) {
            this.hints = hints;
            this.type = 1 /* Type.Active */;
        }
    }
    ParameterHintState.Active = Active;
})(ParameterHintState || (ParameterHintState = {}));
export class ParameterHintsModel extends Disposable {
    static { this.DEFAULT_DELAY = 120; } // ms
    constructor(editor, providers, delay = ParameterHintsModel.DEFAULT_DELAY) {
        super();
        this._onChangedHints = this._register(new Emitter());
        this.onChangedHints = this._onChangedHints.event;
        this.triggerOnType = false;
        this._state = ParameterHintState.Default;
        this._pendingTriggers = [];
        this._lastSignatureHelpResult = this._register(new MutableDisposable());
        this.triggerChars = new CharacterSet();
        this.retriggerChars = new CharacterSet();
        this.triggerId = 0;
        this.editor = editor;
        this.providers = providers;
        this.throttledDelayer = new Delayer(delay);
        this._register(this.editor.onDidBlurEditorWidget(() => this.cancel()));
        this._register(this.editor.onDidChangeConfiguration(() => this.onEditorConfigurationChange()));
        this._register(this.editor.onDidChangeModel((e) => this.onModelChanged()));
        this._register(this.editor.onDidChangeModelLanguage((_) => this.onModelChanged()));
        this._register(this.editor.onDidChangeCursorSelection((e) => this.onCursorChange(e)));
        this._register(this.editor.onDidChangeModelContent((e) => this.onModelContentChange()));
        this._register(this.providers.onDidChange(this.onModelChanged, this));
        this._register(this.editor.onDidType((text) => this.onDidType(text)));
        this.onEditorConfigurationChange();
        this.onModelChanged();
    }
    get state() {
        return this._state;
    }
    set state(value) {
        if (this._state.type === 2 /* ParameterHintState.Type.Pending */) {
            this._state.request.cancel();
        }
        this._state = value;
    }
    cancel(silent = false) {
        this.state = ParameterHintState.Default;
        this.throttledDelayer.cancel();
        if (!silent) {
            this._onChangedHints.fire(undefined);
        }
    }
    trigger(context, delay) {
        const model = this.editor.getModel();
        if (!model || !this.providers.has(model)) {
            return;
        }
        const triggerId = ++this.triggerId;
        this._pendingTriggers.push(context);
        this.throttledDelayer
            .trigger(() => {
            return this.doTrigger(triggerId);
        }, delay)
            .catch(onUnexpectedError);
    }
    next() {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        const length = this.state.hints.signatures.length;
        const activeSignature = this.state.hints.activeSignature;
        const last = activeSignature % length === length - 1;
        const cycle = this.editor.getOption(90 /* EditorOption.parameterHints */).cycle;
        // If there is only one signature, or we're on last signature of list
        if ((length < 2 || last) && !cycle) {
            this.cancel();
            return;
        }
        this.updateActiveSignature(last && cycle ? 0 : activeSignature + 1);
    }
    previous() {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        const length = this.state.hints.signatures.length;
        const activeSignature = this.state.hints.activeSignature;
        const first = activeSignature === 0;
        const cycle = this.editor.getOption(90 /* EditorOption.parameterHints */).cycle;
        // If there is only one signature, or we're on first signature of list
        if ((length < 2 || first) && !cycle) {
            this.cancel();
            return;
        }
        this.updateActiveSignature(first && cycle ? length - 1 : activeSignature - 1);
    }
    updateActiveSignature(activeSignature) {
        if (this.state.type !== 1 /* ParameterHintState.Type.Active */) {
            return;
        }
        this.state = new ParameterHintState.Active({ ...this.state.hints, activeSignature });
        this._onChangedHints.fire(this.state.hints);
    }
    async doTrigger(triggerId) {
        const isRetrigger = this.state.type === 1 /* ParameterHintState.Type.Active */ ||
            this.state.type === 2 /* ParameterHintState.Type.Pending */;
        const activeSignatureHelp = this.getLastActiveHints();
        this.cancel(true);
        if (this._pendingTriggers.length === 0) {
            return false;
        }
        const context = this._pendingTriggers.reduce(mergeTriggerContexts);
        this._pendingTriggers = [];
        const triggerContext = {
            triggerKind: context.triggerKind,
            triggerCharacter: context.triggerCharacter,
            isRetrigger: isRetrigger,
            activeSignatureHelp: activeSignatureHelp,
        };
        if (!this.editor.hasModel()) {
            return false;
        }
        const model = this.editor.getModel();
        const position = this.editor.getPosition();
        this.state = new ParameterHintState.Pending(createCancelablePromise((token) => provideSignatureHelp(this.providers, model, position, triggerContext, token)), activeSignatureHelp);
        try {
            const result = await this.state.request;
            // Check that we are still resolving the correct signature help
            if (triggerId !== this.triggerId) {
                result?.dispose();
                return false;
            }
            if (!result || !result.value.signatures || result.value.signatures.length === 0) {
                result?.dispose();
                this._lastSignatureHelpResult.clear();
                this.cancel();
                return false;
            }
            else {
                this.state = new ParameterHintState.Active(result.value);
                this._lastSignatureHelpResult.value = result;
                this._onChangedHints.fire(this.state.hints);
                return true;
            }
        }
        catch (error) {
            if (triggerId === this.triggerId) {
                this.state = ParameterHintState.Default;
            }
            onUnexpectedError(error);
            return false;
        }
    }
    getLastActiveHints() {
        switch (this.state.type) {
            case 1 /* ParameterHintState.Type.Active */:
                return this.state.hints;
            case 2 /* ParameterHintState.Type.Pending */:
                return this.state.previouslyActiveHints;
            default:
                return undefined;
        }
    }
    get isTriggered() {
        return (this.state.type === 1 /* ParameterHintState.Type.Active */ ||
            this.state.type === 2 /* ParameterHintState.Type.Pending */ ||
            this.throttledDelayer.isTriggered());
    }
    onModelChanged() {
        this.cancel();
        this.triggerChars.clear();
        this.retriggerChars.clear();
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        for (const support of this.providers.ordered(model)) {
            for (const ch of support.signatureHelpTriggerCharacters || []) {
                if (ch.length) {
                    const charCode = ch.charCodeAt(0);
                    this.triggerChars.add(charCode);
                    // All trigger characters are also considered retrigger characters
                    this.retriggerChars.add(charCode);
                }
            }
            for (const ch of support.signatureHelpRetriggerCharacters || []) {
                if (ch.length) {
                    this.retriggerChars.add(ch.charCodeAt(0));
                }
            }
        }
    }
    onDidType(text) {
        if (!this.triggerOnType) {
            return;
        }
        const lastCharIndex = text.length - 1;
        const triggerCharCode = text.charCodeAt(lastCharIndex);
        if (this.triggerChars.has(triggerCharCode) ||
            (this.isTriggered && this.retriggerChars.has(triggerCharCode))) {
            this.trigger({
                triggerKind: languages.SignatureHelpTriggerKind.TriggerCharacter,
                triggerCharacter: text.charAt(lastCharIndex),
            });
        }
    }
    onCursorChange(e) {
        if (e.source === 'mouse') {
            this.cancel();
        }
        else if (this.isTriggered) {
            this.trigger({ triggerKind: languages.SignatureHelpTriggerKind.ContentChange });
        }
    }
    onModelContentChange() {
        if (this.isTriggered) {
            this.trigger({ triggerKind: languages.SignatureHelpTriggerKind.ContentChange });
        }
    }
    onEditorConfigurationChange() {
        this.triggerOnType = this.editor.getOption(90 /* EditorOption.parameterHints */).enabled;
        if (!this.triggerOnType) {
            this.cancel();
        }
    }
    dispose() {
        this.cancel(true);
        super.dispose();
    }
}
function mergeTriggerContexts(previous, current) {
    switch (current.triggerKind) {
        case languages.SignatureHelpTriggerKind.Invoke:
            // Invoke overrides previous triggers.
            return current;
        case languages.SignatureHelpTriggerKind.ContentChange:
            // Ignore content changes triggers
            return previous;
        case languages.SignatureHelpTriggerKind.TriggerCharacter:
        default:
            return current;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BhcmFtZXRlckhpbnRzL2Jyb3dzZXIvcGFyYW1ldGVySGludHNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzFFLE9BQU8sS0FBSyxTQUFTLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFPaEUsSUFBVSxrQkFBa0IsQ0F1QjNCO0FBdkJELFdBQVUsa0JBQWtCO0lBQzNCLElBQWtCLElBSWpCO0lBSkQsV0FBa0IsSUFBSTtRQUNyQixxQ0FBTyxDQUFBO1FBQ1AsbUNBQU0sQ0FBQTtRQUNOLHFDQUFPLENBQUE7SUFDUixDQUFDLEVBSmlCLElBQUksR0FBSix1QkFBSSxLQUFKLHVCQUFJLFFBSXJCO0lBRVksMEJBQU8sR0FBRyxFQUFFLElBQUksc0JBQWMsRUFBVyxDQUFBO0lBRXRELE1BQWEsT0FBTztRQUVuQixZQUNVLE9BQTRFLEVBQzVFLHFCQUEwRDtZQUQxRCxZQUFPLEdBQVAsT0FBTyxDQUFxRTtZQUM1RSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXFDO1lBSDNELFNBQUksd0JBQWU7UUFJekIsQ0FBQztLQUNK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