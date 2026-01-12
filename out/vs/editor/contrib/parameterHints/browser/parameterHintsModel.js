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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGFyYW1ldGVySGludHMvYnJvd3Nlci9wYXJhbWV0ZXJIaW50c01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsT0FBTyxHQUNQLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHMUUsT0FBTyxLQUFLLFNBQVMsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU9oRSxJQUFVLGtCQUFrQixDQXVCM0I7QUF2QkQsV0FBVSxrQkFBa0I7SUFDM0IsSUFBa0IsSUFJakI7SUFKRCxXQUFrQixJQUFJO1FBQ3JCLHFDQUFPLENBQUE7UUFDUCxtQ0FBTSxDQUFBO1FBQ04scUNBQU8sQ0FBQTtJQUNSLENBQUMsRUFKaUIsSUFBSSxHQUFKLHVCQUFJLEtBQUosdUJBQUksUUFJckI7SUFFWSwwQkFBTyxHQUFHLEVBQUUsSUFBSSxzQkFBYyxFQUFXLENBQUE7SUFFdEQsTUFBYSxPQUFPO1FBRW5CLFlBQ1UsT0FBNEUsRUFDNUUscUJBQTBEO1lBRDFELFlBQU8sR0FBUCxPQUFPLENBQXFFO1lBQzVFLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBcUM7WUFIM0QsU0FBSSx3QkFBZTtRQUl6QixDQUFD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