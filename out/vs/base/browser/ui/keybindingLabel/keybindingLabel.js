/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { UILabelProvider } from '../../../common/keybindingLabels.js';
import { Disposable } from '../../../common/lifecycle.js';
import { equals } from '../../../common/objects.js';
import './keybindingLabel.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
export const unthemedKeybindingLabelOptions = {
    keybindingLabelBackground: undefined,
    keybindingLabelForeground: undefined,
    keybindingLabelBorder: undefined,
    keybindingLabelBottomBorder: undefined,
    keybindingLabelShadow: undefined,
};
export class KeybindingLabel extends Disposable {
    constructor(container, os, options) {
        super();
        this.os = os;
        this.keyElements = new Set();
        this.options = options || Object.create(null);
        const labelForeground = this.options.keybindingLabelForeground;
        this.domNode = dom.append(container, $('.monaco-keybinding'));
        if (labelForeground) {
            this.domNode.style.color = labelForeground;
        }
        this.hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.domNode, ''));
        this.didEverRender = false;
        container.appendChild(this.domNode);
    }
    get element() {
        return this.domNode;
    }
    set(keybinding, matches) {
        if (this.didEverRender &&
            this.keybinding === keybinding &&
            KeybindingLabel.areSame(this.matches, matches)) {
            return;
        }
        this.keybinding = keybinding;
        this.matches = matches;
        this.render();
    }
    render() {
        this.clear();
        if (this.keybinding) {
            const chords = this.keybinding.getChords();
            if (chords[0]) {
                this.renderChord(this.domNode, chords[0], this.matches ? this.matches.firstPart : null);
            }
            for (let i = 1; i < chords.length; i++) {
                dom.append(this.domNode, $('span.monaco-keybinding-key-chord-separator', undefined, ' '));
                this.renderChord(this.domNode, chords[i], this.matches ? this.matches.chordPart : null);
            }
            const title = (this.options.disableTitle ?? false)
                ? undefined
                : this.keybinding.getAriaLabel() || undefined;
            this.hover.update(title);
            this.domNode.setAttribute('aria-label', title || '');
        }
        else if (this.options && this.options.renderUnboundKeybindings) {
            this.renderUnbound(this.domNode);
        }
        this.didEverRender = true;
    }
    clear() {
        dom.clearNode(this.domNode);
        this.keyElements.clear();
    }
    renderChord(parent, chord, match) {
        const modifierLabels = UILabelProvider.modifierLabels[this.os];
        if (chord.ctrlKey) {
            this.renderKey(parent, modifierLabels.ctrlKey, Boolean(match?.ctrlKey), modifierLabels.separator);
        }
        if (chord.shiftKey) {
            this.renderKey(parent, modifierLabels.shiftKey, Boolean(match?.shiftKey), modifierLabels.separator);
        }
        if (chord.altKey) {
            this.renderKey(parent, modifierLabels.altKey, Boolean(match?.altKey), modifierLabels.separator);
        }
        if (chord.metaKey) {
            this.renderKey(parent, modifierLabels.metaKey, Boolean(match?.metaKey), modifierLabels.separator);
        }
        const keyLabel = chord.keyLabel;
        if (keyLabel) {
            this.renderKey(parent, keyLabel, Boolean(match?.keyCode), '');
        }
    }
    renderKey(parent, label, highlight, separator) {
        dom.append(parent, this.createKeyElement(label, highlight ? '.highlight' : ''));
        if (separator) {
            dom.append(parent, $('span.monaco-keybinding-key-separator', undefined, separator));
        }
    }
    renderUnbound(parent) {
        dom.append(parent, this.createKeyElement(localize('unbound', 'Unbound')));
    }
    createKeyElement(label, extraClass = '') {
        const keyElement = $('span.monaco-keybinding-key' + extraClass, undefined, label);
        this.keyElements.add(keyElement);
        if (this.options.keybindingLabelBackground) {
            keyElement.style.backgroundColor = this.options.keybindingLabelBackground;
        }
        if (this.options.keybindingLabelBorder) {
            keyElement.style.borderColor = this.options.keybindingLabelBorder;
        }
        if (this.options.keybindingLabelBottomBorder) {
            keyElement.style.borderBottomColor = this.options.keybindingLabelBottomBorder;
        }
        if (this.options.keybindingLabelShadow) {
            keyElement.style.boxShadow = `inset 0 -1px 0 ${this.options.keybindingLabelShadow}`;
        }
        return keyElement;
    }
    static areSame(a, b) {
        if (a === b || (!a && !b)) {
            return true;
        }
        return !!a && !!b && equals(a.firstPart, b.firstPart) && equals(a.chordPart, b.chordPart);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2tleWJpbmRpbmdMYWJlbC9rZXliaW5kaW5nTGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFFbkMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbkQsT0FBTyx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQStCZixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBMkI7SUFDckUseUJBQXlCLEVBQUUsU0FBUztJQUNwQyx5QkFBeUIsRUFBRSxTQUFTO0lBQ3BDLHFCQUFxQixFQUFFLFNBQVM7SUFDaEMsMkJBQTJCLEVBQUUsU0FBUztJQUN0QyxxQkFBcUIsRUFBRSxTQUFTO0NBQ2hDLENBQUE7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBVzlDLFlBQ0MsU0FBc0IsRUFDZCxFQUFtQixFQUMzQixPQUFnQztRQUVoQyxLQUFLLEVBQUUsQ0FBQTtRQUhDLE9BQUUsR0FBRixFQUFFLENBQWlCO1FBVFgsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtRQWN4RCxJQUFJLENBQUMs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