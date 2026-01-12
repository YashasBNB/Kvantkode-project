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
var DefineKeybindingWidget_1, DefineKeybindingOverlayWidget_1;
import './media/keybindings.css';
import * as nls from '../../../../nls.js';
import { OS } from '../../../../base/common/platform.js';
import { Disposable, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import * as dom from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { asCssVariable, editorWidgetBackground, editorWidgetForeground, widgetShadow, } from '../../../../platform/theme/common/colorRegistry.js';
import { SearchWidget } from './preferencesWidgets.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { defaultInputBoxStyles, defaultKeybindingLabelStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
let KeybindingsSearchWidget = class KeybindingsSearchWidget extends SearchWidget {
    constructor(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService) {
        super(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService);
        this.recordDisposables = this._register(new DisposableStore());
        this._onKeybinding = this._register(new Emitter());
        this.onKeybinding = this._onKeybinding.event;
        this._onEnter = this._register(new Emitter());
        this.onEnter = this._onEnter.event;
        this._onEscape = this._register(new Emitter());
        this.onEscape = this._onEscape.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._register(toDisposable(() => this.stopRecordingKeys()));
        this._chords = null;
        this._inputValue = '';
    }
    clear() {
        this._chords = null;
        super.clear();
    }
    startRecordingKeys() {
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.KEY_DOWN, (e) => this._onKeyDown(new StandardKeyboardEvent(e))));
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.BLUR, () => this._onBlur.fire()));
        this.recordDisposables.add(dom.addDisposableListener(this.inputBox.inputElement, dom.EventType.INPUT, () => {
            // Prevent other characters from showing up
            this.setInputValue(this._inputValue);
        }));
    }
    stopRecordingKeys() {
        this._chords = null;
        this.recordDisposables.clear();
    }
    setInputValue(value) {
        this._inputValue = value;
        this.inputBox.value = this._inputValue;
    }
    _onKeyDown(keyboardEvent) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const options = this.options;
        if (!options.recordEnter && keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this._onEnter.fire();
            return;
        }
        if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
            this._onEscape.fire();
            return;
        }
        this.printKeybinding(keyboardEvent);
    }
    printKeybinding(keyboardEvent) {
        const keybinding = this.keybindingService.resolveKeyboardEvent(keyboardEvent);
        const info = `code: ${keyboardEvent.browserEvent.code}, keyCode: ${keyboardEvent.browserEvent.keyCode}, key: ${keyboardEvent.browserEvent.key} => UI: ${keybinding.getAriaLabel()}, user settings: ${keybinding.getUserSettingsLabel()}, dispatch: ${keybinding.getDispatchChords()[0]}`;
        const options = this.options;
        if (!this._chords) {
            this._chords = [];
        }
        // TODO: note that we allow a keybinding "shift shift", but this widget doesn't allow input "shift shift" because the first "shift" will be incomplete - this is _not_ a regression
        const hasIncompleteChord = this._chords.length > 0 &&
            this._chords[this._chords.length - 1].getDispatchChords()[0] === null;
        if (hasIncompleteChord) {
            this._chords[this._chords.length - 1] = keybinding;
        }
        else {
            if (this._chords.length === 2) {
                // TODO: limit chords # to 2 for now
                this._chords = [];
            }
            this._chords.push(keybinding);
        }
        const value = this._chords
            .map((keybinding) => keybinding.getUserSettingsLabel() || '')
            .join(' ');
        this.setInputValue(options.quoteRecordedKeys ? `"${value}"` : value);
        this.inputBox.inputElement.title = info;
        this._onKeybinding.fire(this._chords);
    }
};
KeybindingsSearchWidget = __decorate([
    __param(2, IContextViewService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IKeybindingService)
], KeybindingsSearchWidget);
export { KeybindingsSearchWidget };
let DefineKeybindingWidget = class DefineKeybindingWidget extends Widget {
    static { DefineKeybindingWidget_1 = this; }
    static { this.WIDTH = 400; }
    static { this.HEIGHT = 110; }
    constructor(parent, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._keybindingDisposables = this._register(new DisposableStore());
        this._chords = null;
        this._isVisible = false;
        this._onHide = this._register(new Emitter());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onShowExistingKeybindings = this._register(new Emitter());
        this.onShowExistingKeybidings = this._onShowExistingKeybindings.event;
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setDisplay('none');
        this._domNode.setClassName('defineKeybindingWidget');
        this._domNode.setWidth(DefineKeybindingWidget_1.WIDTH);
        this._domNode.setHeight(DefineKeybindingWidget_1.HEIGHT);
        const message = nls.localize('defineKeybinding.initial', 'Press desired key combination and then press ENTER.');
        dom.append(this._domNode.domNode, dom.$('.message', undefined, message));
        this._domNode.domNode.style.backgroundColor = asCssVariable(editorWidgetBackground);
        this._domNode.domNode.style.color = asCssVariable(editorWidgetForeground);
        this._domNode.domNode.style.boxShadow = `0 2px 8px ${asCssVariable(widgetShadow)}`;
        this._keybindingInputWidget = this._register(this.instantiationService.createInstance(KeybindingsSearchWidget, this._domNode.domNode, {
            ariaLabel: message,
            history: new Set([]),
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this._keybindingInputWidget.startRecordingKeys();
        this._register(this._keybindingInputWidget.onKeybinding((keybinding) => this.onKeybinding(keybinding)));
        this._register(this._keybindingInputWidget.onEnter(() => this.hide()));
        this._register(this._keybindingInputWidget.onEscape(() => this.clearOrHide()));
        this._register(this._keybindingInputWidget.onBlur(() => this.onCancel()));
        this._outputNode = dom.append(this._domNode.domNode, dom.$('.output'));
        this._showExistingKeybindingsNode = dom.append(this._domNode.domNode, dom.$('.existing'));
        if (parent) {
            dom.append(parent, this._domNode.domNode);
        }
    }
    get domNode() {
        return this._domNode.domNode;
    }
    define() {
        this._keybindingInputWidget.clear();
        return Promises.withAsyncBody(async (c) => {
            if (!this._isVisible) {
                this._isVisible = true;
                this._domNode.setDisplay('block');
                this._chords = null;
                this._keybindingInputWidget.setInputValue('');
                dom.clearNode(this._outputNode);
                dom.clearNode(this._showExistingKeybindingsNode);
                // Input is not getting focus without timeout in safari
                // https://github.com/microsoft/vscode/issues/108817
                await timeout(0);
                this._keybindingInputWidget.focus();
            }
            const disposable = this._onHide.event(() => {
                c(this.getUserSettingsLabel());
                disposable.dispose();
            });
        });
    }
    layout(layout) {
        const top = Math.round((layout.height - DefineKeybindingWidget_1.HEIGHT) / 2);
        this._domNode.setTop(top);
        const left = Math.round((layout.width - DefineKeybindingWidget_1.WIDTH) / 2);
        this._domNode.setLeft(left);
    }
    printExisting(numberOfExisting) {
        if (numberOfExisting > 0) {
            const existingElement = dom.$('span.existingText');
            const text = numberOfExisting === 1
                ? nls.localize('defineKeybinding.oneExists', '1 existing command has this keybinding', numberOfExisting)
                : nls.localize('defineKeybinding.existing', '{0} existing commands have this keybinding', numberOfExisting);
            dom.append(existingElement, document.createTextNode(text));
            aria.alert(text);
            this._showExistingKeybindingsNode.appendChild(existingElement);
            existingElement.onmousedown = (e) => {
                e.preventDefault();
            };
            existingElement.onmouseup = (e) => {
                e.preventDefault();
            };
            existingElement.onclick = () => {
                this._onShowExistingKeybindings.fire(this.getUserSettingsLabel());
            };
        }
    }
    onKeybinding(keybinding) {
        this._keybindingDisposables.clear();
        this._chords = keybinding;
        dom.clearNode(this._outputNode);
        dom.clearNode(this._showExistingKeybindingsNode);
        const firstLabel = this._keybindingDisposables.add(new KeybindingLabel(this._outputNode, OS, defaultKeybindingLabelStyles));
        firstLabel.set(this._chords?.[0] ?? undefined);
        if (this._chords) {
            for (let i = 1; i < this._chords.length; i++) {
                this._outputNode.appendChild(document.createTextNode(nls.localize('defineKeybinding.chordsTo', 'chord to')));
                const chordLabel = this._keybindingDisposables.add(new KeybindingLabel(this._outputNode, OS, defaultKeybindingLabelStyles));
                chordLabel.set(this._chords[i]);
            }
        }
        const label = this.getUserSettingsLabel();
        if (label) {
            this._onDidChange.fire(label);
        }
    }
    getUserSettingsLabel() {
        let label = null;
        if (this._chords) {
            label = this._chords.map((keybinding) => keybinding.getUserSettingsLabel()).join(' ');
        }
        return label;
    }
    onCancel() {
        this._chords = null;
        this.hide();
    }
    clearOrHide() {
        if (this._chords === null) {
            this.hide();
        }
        else {
            this._chords = null;
            this._keybindingInputWidget.clear();
            dom.clearNode(this._outputNode);
            dom.clearNode(this._showExistingKeybindingsNode);
        }
    }
    hide() {
        this._domNode.setDisplay('none');
        this._isVisible = false;
        this._onHide.fire();
    }
};
DefineKeybindingWidget = DefineKeybindingWidget_1 = __decorate([
    __param(1, IInstantiationService)
], DefineKeybindingWidget);
export { DefineKeybindingWidget };
let DefineKeybindingOverlayWidget = class DefineKeybindingOverlayWidget extends Disposable {
    static { DefineKeybindingOverlayWidget_1 = this; }
    static { this.ID = 'editor.contrib.defineKeybindingWidget'; }
    constructor(_editor, instantiationService) {
        super();
        this._editor = _editor;
        this._widget = this._register(instantiationService.createInstance(DefineKeybindingWidget, null));
        this._editor.addOverlayWidget(this);
    }
    getId() {
        return DefineKeybindingOverlayWidget_1.ID;
    }
    getDomNode() {
        return this._widget.domNode;
    }
    getPosition() {
        return {
            preference: null,
        };
    }
    dispose() {
        this._editor.removeOverlayWidget(this);
        super.dispose();
    }
    start() {
        if (this._editor.hasModel()) {
            this._editor.revealPositionInCenterIfOutsideViewport(this._editor.getPosition(), 0 /* ScrollType.Smooth */);
        }
        const layoutInfo = this._editor.getLayoutInfo();
        this._widget.layout(new dom.Dimension(layoutInfo.width, layoutInfo.height));
        return this._widget.define();
    }
};
DefineKeybindingOverlayWidget = DefineKeybindingOverlayWidget_1 = __decorate([
    __param(1, IInstantiationService)
], DefineKeybindingOverlayWidget);
export { DefineKeybindingOverlayWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1dpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ1dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU1sRyxPQUFPLEVBQ04sYUFBYSxFQUNiLHNCQUFzQixFQUN0QixzQkFBc0IsRUFDdEIsWUFBWSxHQUNaLE1BQU0sb0RB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