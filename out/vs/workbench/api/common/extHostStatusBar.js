/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-native-private */
import { StatusBarAlignment as ExtHostStatusBarAlignment, Disposable, ThemeColor, asStatusBarItemIdentifier, } from './extHostTypes.js';
import { MainContext, } from './extHost.protocol.js';
import { localize } from '../../../nls.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { MarkdownString } from './extHostTypeConverters.js';
import { isNumber } from '../../../base/common/types.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export class ExtHostStatusBarEntry {
    static { this.ID_GEN = 0; }
    static { this.ALLOWED_BACKGROUND_COLORS = new Map([
        ['statusBarItem.errorBackground', new ThemeColor('statusBarItem.errorForeground')],
        ['statusBarItem.warningBackground', new ThemeColor('statusBarItem.warningForeground')],
    ]); }
    #proxy;
    #commands;
    constructor(proxy, commands, staticItems, extension, id, alignment = ExtHostStatusBarAlignment.Left, priority, _onDispose) {
        this._onDispose = _onDispose;
        this._disposed = false;
        this._text = '';
        this._staleCommandRegistrations = new DisposableStore();
        this.#proxy = proxy;
        this.#commands = commands;
        if (id && extension) {
            this._entryId = asStatusBarItemIdentifier(extension.identifier, id);
            // if new item already exists mark it as visible and copy properties
            // this can only happen when an item was contributed by an extension
            const item = staticItems.get(this._entryId);
            if (item) {
                alignment = item.alignLeft
                    ? ExtHostStatusBarAlignment.Left
                    : ExtHostStatusBarAlignment.Right;
                priority = item.priority;
                this._visible = true;
                this.name = item.name;
                this.text = item.text;
                this.tooltip = item.tooltip;
                this.command = item.command;
                this.accessibilityInformation = item.accessibilityInformation;
            }
        }
        else {
            this._entryId = String(ExtHostStatusBarEntry.ID_GEN++);
        }
        this._extension = extension;
        this._id = id;
        this._alignment = alignment;
        this._priority = this.validatePriority(priority);
    }
    validatePriority(priority) {
        if (!isNumber(priority)) {
            return undefined; // using this method to catch `NaN` too!
        }
        // Our RPC mechanism use JSON to serialize data which does
        // not support `Infinity` so we need to fill in the number
        // equivalent as close as possible.
        // https://github.com/microsoft/vscode/issues/133317
        if (priority === Number.POSITIVE_INFINITY) {
            return Number.MAX_VALUE;
        }
        if (priority === Number.NEGATIVE_INFINITY) {
            return -Number.MAX_VALUE;
        }
        return priority;
    }
    get id() {
        return this._id ?? this._extension.identifier.value;
    }
    get entryId() {
        return this._entryId;
    }
    get alignment() {
        return this._alignment;
    }
    get priority() {
        return this._priority;
    }
    get text() {
        return this._text;
    }
    get name() {
        return this._name;
    }
    get tooltip() {
        return this._tooltip;
    }
    get tooltip2() {
        if (this._extension) {
            checkProposedApiEnabled(this._extension, 'statusBarItemTooltip');
        }
        return this._tooltip2;
    }
    get color() {
        return this._color;
    }
    get backgroundColor() {
        return this._backgroundColor;
    }
    get command() {
        return this._command?.fromApi;
    }
    get accessibilityInformation() {
        return this._accessibilityInformation;
    }
    set text(text) {
        this._text = text;
        this.update();
    }
    set name(name) {
        this._name = name;
        this.update();
    }
    set tooltip(tooltip) {
        this._tooltip = tooltip;
        this.update();
    }
    set tooltip2(tooltip) {
        if (this._extension) {
            checkProposedApiEnabled(this._extension, 'statusBarItemTooltip');
        }
        this._tooltip2 = tooltip;
        this.update();
    }
    set color(color) {
        this._color = color;
        this.update();
    }
    set backgroundColor(color) {
        if (color && !ExtHostStatusBarEntry.ALLOWED_BACKGROUND_COLORS.has(color.id)) {
            color = undefined;
        }
        this._backgroundColor = color;
        this.update();
    }
    set command(command) {
        if (this._command?.fromApi === command) {
            return;
        }
        if (this._latestCommandRegistration) {
            this._staleCommandRegistrations.add(this._latestCommandRegistration);
        }
        this._latestCommandRegistration = new DisposableStore();
        if (typeof command === 'string') {
            this._command = {
                fromApi: command,
                internal: this.#commands.toInternal({ title: '', command }, this._latestCommandRegistration),
            };
        }
        else if (command) {
            this._command = {
                fromApi: command,
                internal: this.#commands.toInternal(command, this._latestCommandRegistration),
            };
        }
        else {
            this._command = undefined;
        }
        this.update();
    }
    set accessibilityInformation(accessibilityInformation) {
        this._accessibilityInformation = accessibilityInformation;
        this.update();
    }
    show() {
        this._visible = true;
        this.update();
    }
    hide() {
        clearTimeout(this._timeoutHandle);
        this._visible = false;
        this.#proxy.$disposeEntry(this._entryId);
    }
    update() {
        if (this._disposed || !this._visible) {
            return;
        }
        clearTimeout(this._timeoutHandle);
        // Defer the update so that multiple changes to setters dont cause a redraw each
        this._timeoutHandle = setTimeout(() => {
            this._timeoutHandle = undefined;
            // If the id is not set, derive it from the extension identifier,
            // otherwise make sure to prefix it with the extension identifier
            // to get a more unique value across extensions.
            let id;
            if (this._extension) {
                if (this._id) {
                    id = `${this._extension.identifier.value}.${this._id}`;
                }
                else {
                    id = this._extension.identifier.value;
                }
            }
            else {
                id = this._id;
            }
            // If the name is not set, derive it from the extension descriptor
            let name;
            if (this._name) {
                name = this._name;
            }
            else {
                name = localize('extensionLabel', '{0} (Extension)', this._extension.displayName || this._extension.name);
            }
            // If a background color is set, the foreground is determined
            let color = this._color;
            if (this._backgroundColor) {
                color = ExtHostStatusBarEntry.ALLOWED_BACKGROUND_COLORS.get(this._backgroundColor.id);
            }
            let tooltip;
            let hasTooltipProvider;
            if (typeof this._tooltip2 === 'function') {
                tooltip = MarkdownString.fromStrict(this._tooltip);
                hasTooltipProvider = true;
            }
            else {
                tooltip = MarkdownString.fromStrict(this._tooltip2 ?? this._tooltip);
                hasTooltipProvider = false;
            }
            // Set to status bar
            this.#proxy.$setEntry(this._entryId, id, this._extension?.identifier.value, name, this._text, tooltip, hasTooltipProvider, this._command?.internal, color, this._backgroundColor, this._alignment === ExtHostStatusBarAlignment.Left, this._priority, this._accessibilityInformation);
            // clean-up state commands _after_ updating the UI
            this._staleCommandRegistrations.clear();
        }, 0);
    }
    dispose() {
        this.hide();
        this._onDispose?.();
        this._disposed = true;
    }
}
class StatusBarMessage {
    constructor(statusBar) {
        this._messages = [];
        this._item = statusBar.createStatusBarEntry(undefined, 'status.extensionMessage', ExtHostStatusBarAlignment.Left, Number.MIN_VALUE);
        this._item.name = localize('status.extensionMessage', 'Extension Status');
    }
    dispose() {
        this._messages.length = 0;
        this._item.dispose();
    }
    setMessage(message) {
        const data = { message }; // use object to not confuse equal strings
        this._messages.unshift(data);
        this._update();
        return new Disposable(() => {
            const idx = this._messages.indexOf(data);
            if (idx >= 0) {
                this._messages.splice(idx, 1);
                this._update();
            }
        });
    }
    _update() {
        if (this._messages.length > 0) {
            this._item.text = this._messages[0].message;
            this._item.show();
        }
        else {
            this._item.hide();
        }
    }
}
export class ExtHostStatusBar {
    constructor(mainContext, commands) {
        this._entries = new Map();
        this._existingItems = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadStatusBar);
        this._commands = commands;
        this._statusMessage = new StatusBarMessage(this);
    }
    $acceptStaticEntries(added) {
        for (const item of added) {
            this._existingItems.set(item.entryId, item);
        }
    }
    async $provideTooltip(entryId, cancellation) {
        const entry = this._entries.get(entryId);
        if (!entry) {
            return undefined;
        }
        const tooltip = typeof entry.tooltip2 === 'function' ? await entry.tooltip2(cancellation) : entry.tooltip2;
        return !cancellation.isCancellationRequested ? MarkdownString.fromStrict(tooltip) : undefined;
    }
    createStatusBarEntry(extension, id, alignment, priority) {
        const entry = new ExtHostStatusBarEntry(this._proxy, this._commands, this._existingItems, extension, id, alignment, priority, () => this._entries.delete(entry.entryId));
        this._entries.set(entry.entryId, entry);
        return entry;
    }
    setStatusBarMessage(text, timeoutOrThenable) {
        const d = this._statusMessage.setMessage(text);
        let handle;
        if (typeof timeoutOrThenable === 'number') {
            handle = setTimeout(() => d.dispose(), timeoutOrThenable);
        }
        else if (typeof timeoutOrThenable !== 'undefined') {
            timeoutOrThenable.then(() => d.dispose(), () => d.dispose());
        }
        return new Disposable(() => {
            d.dispose();
            clearTimeout(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTdGF0dXNCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFDTixrQkFBa0IsSUFBSSx5QkFBeUIsRUFDL0MsVUFBVSxFQUNWLFVBQVUsRUFDVix5QkFBeUIsR0FDekIsTUFBTSxtQkFBbUIsQ0FBQTtBQUUxQixPQUFPLEVBQ04sV0FBVyxHQU1YLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXhGLE1BQU0sT0FBTyxxQkFBcUI7YUFDbEIsV0FBTSxHQUFHLENBQUMsQUFBSixDQUFJO2FBRVYsOEJBQXlCLEdBQUcsSUFBSSxHQUFHLENBQXFCO1FBQ3RFLENBQUMsK0JBQStCLEVBQUUsSUFBSSxVQUFVLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNsRixDQUFDLGlDQUFpQyxFQUFFLElBQUksVUFBVSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7S0FDdEYsQ0FBQyxBQUhzQyxDQUd0QztJQUVGLE1BQU0sQ0FBMEI7SUFDaEMsU0FBUyxDQUFtQjtJQXNENUIsWUFDQyxLQUErQixFQUMvQixRQUEyQixFQUMzQixXQUFrRCxFQUNsRCxTQUFpQyxFQUNqQyxFQUFXLEVBQ1gsWUFBdUMseUJBQXlCLENB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