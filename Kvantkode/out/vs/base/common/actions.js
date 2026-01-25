/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
import * as nls from '../../nls.js';
export class Action extends Disposable {
    constructor(id, label = '', cssClass = '', enabled = true, actionCallback) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._enabled = true;
        this._id = id;
        this._label = label;
        this._cssClass = cssClass;
        this._enabled = enabled;
        this._actionCallback = actionCallback;
    }
    get id() {
        return this._id;
    }
    get label() {
        return this._label;
    }
    set label(value) {
        this._setLabel(value);
    }
    _setLabel(value) {
        if (this._label !== value) {
            this._label = value;
            this._onDidChange.fire({ label: value });
        }
    }
    get tooltip() {
        return this._tooltip || '';
    }
    set tooltip(value) {
        this._setTooltip(value);
    }
    _setTooltip(value) {
        if (this._tooltip !== value) {
            this._tooltip = value;
            this._onDidChange.fire({ tooltip: value });
        }
    }
    get class() {
        return this._cssClass;
    }
    set class(value) {
        this._setClass(value);
    }
    _setClass(value) {
        if (this._cssClass !== value) {
            this._cssClass = value;
            this._onDidChange.fire({ class: value });
        }
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._setEnabled(value);
    }
    _setEnabled(value) {
        if (this._enabled !== value) {
            this._enabled = value;
            this._onDidChange.fire({ enabled: value });
        }
    }
    get checked() {
        return this._checked;
    }
    set checked(value) {
        this._setChecked(value);
    }
    _setChecked(value) {
        if (this._checked !== value) {
            this._checked = value;
            this._onDidChange.fire({ checked: value });
        }
    }
    async run(event, data) {
        if (this._actionCallback) {
            await this._actionCallback(event);
        }
    }
}
export class ActionRunner extends Disposable {
    constructor() {
        super(...arguments);
        this._onWillRun = this._register(new Emitter());
        this.onWillRun = this._onWillRun.event;
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
    }
    async run(action, context) {
        if (!action.enabled) {
            return;
        }
        this._onWillRun.fire({ action });
        let error = undefined;
        try {
            await this.runAction(action, context);
        }
        catch (e) {
            error = e;
        }
        this._onDidRun.fire({ action, error });
    }
    async runAction(action, context) {
        await action.run(context);
    }
}
export class Separator {
    constructor() {
        this.id = Separator.ID;
        this.label = '';
        this.tooltip = '';
        this.class = 'separator';
        this.enabled = false;
        this.checked = false;
    }
    /**
     * Joins all non-empty lists of actions with separators.
     */
    static join(...actionLists) {
        let out = [];
        for (const list of actionLists) {
            if (!list.length) {
                // skip
            }
            else if (out.length) {
                out = [...out, new Separator(), ...list];
            }
            else {
                out = list;
            }
        }
        return out;
    }
    static { this.ID = 'vs.actions.separator'; }
    async run() { }
}
export class SubmenuAction {
    get actions() {
        return this._actions;
    }
    constructor(id, label, actions, cssClass) {
        this.tooltip = '';
        this.enabled = true;
        this.checked = undefined;
        this.id = id;
        this.label = label;
        this.class = cssClass;
        this._actions = actions;
    }
    async run() { }
}
export class EmptySubmenuAction extends Action {
    static { this.ID = 'vs.actions.empty'; }
    constructor() {
        super(EmptySubmenuAction.ID, nls.localize('submenu.empty', '(empty)'), undefined, false);
    }
}
export function toAction(props) {
    return {
        id: props.id,
        label: props.label,
        tooltip: props.tooltip ?? props.label,
        class: props.class,
        enabled: props.enabled ?? true,
        checked: props.checked,
        run: async (...args) => props.run(...args),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vYWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sWUFBWSxDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN4RCxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQTJEbkMsTUFBTSxPQUFPLE1BQU8sU0FBUSxVQUFVO0lBWXJDLFlBQ0MsRUFBVSxFQUNWLFFBQWdCLEVBQUUsRUFDbEIsV0FBbUIsRUFBRSxFQUNyQixVQUFtQixJQUFJLEVBQ3ZCLGNBQTZDO1FBRTdDLEtBQUssRUFBRSxDQUFBO1FBbEJFLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FBQyxDQUFBO1FBQ2pFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFNcEMsYUFBUSxHQUFZLElBQUksQ0FBQTtRQVlqQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDTCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsS0FBYTtRQUN0QixJQUFJ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