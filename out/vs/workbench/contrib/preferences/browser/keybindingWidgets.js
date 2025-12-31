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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1dpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRzlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNbEcsT0FBTyxFQUNOLGFBQWEsRUFDYixzQkFBc0IsRUFDdEIsc0JBQXNCLEVBQ3RCLFlBQVksR0FDWixNQUFNLG9EQUFvRCxD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