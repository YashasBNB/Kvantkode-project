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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLFlBQVksQ0FBQTtBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sZ0JBQWdCLENBQUE7QUFDeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUEyRG5DLE1BQU0sT0FBTyxNQUFPLFNBQVEsVUFBVTtJQVlyQyxZQUNDLEVBQVUsRUFDVixRQUFnQixFQUFFLEVBQ2xCLFdBQW1CLEVBQUUsRUFDckIsVUFBbUIsSUFBSSxFQUN2QixjQUE2QztRQUU3QyxLQUFLLEVBQUUsQ0FBQTtRQWxCRSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQTtRQUNqRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBTXBDLGFBQVEsR0FBWSxJQUFJLENBQUE7UUFZakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0wsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFBO0lBQ2hCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxDQUFD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