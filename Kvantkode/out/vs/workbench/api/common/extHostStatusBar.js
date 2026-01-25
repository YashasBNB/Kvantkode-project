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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFN0YXR1c0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUNOLGtCQUFrQixJQUFJLHlCQUF5QixFQUMvQyxVQUFVLEVBQ1YsVUFBVSxFQUNWLHlCQUF5QixHQUN6QixNQUFNLG1CQUFtQixDQUFBO0FBRTFCLE9BQU8sRUFDTixXQUFXLEdBTVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFeEYsTUFBTSxPQUFPLHFCQUFxQjthQUNsQixXQUFNLEdBQUcsQ0FBQyxBQUFKLENBQUk7YUFFViw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBcUI7UUFDdEUsQ0FBQywrQkFBK0IsRUFBRSxJQUFJLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2xGLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxVQUFVLENBQUMsaUNBQWlDLENBQUMsQ0FBQztLQUN0RixDQUFDLEFBSHNDLENBR3RDO0lBRUYsTUFBTSxDQUEwQjtJQUNoQyxTQUFTLENBQW1CO0lBc0Q1QixZQUNDLEtBQStCLEVBQy9CLFFBQTJCLEVBQzNCLFdBQWtELEVBQ2xELFNBQWlDLEVBQ2pDLEVBQVcsRUFDWCxZQUF1Qyx5QkFB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