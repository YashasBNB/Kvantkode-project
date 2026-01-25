/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { MainContext, } from './extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { ThemeIcon, QuickInputButtons, QuickPickItemKind, InputBoxValidationSeverity, } from './extHostTypes.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { coalesce } from '../../../base/common/arrays.js';
import Severity from '../../../base/common/severity.js';
import { ThemeIcon as ThemeIconUtils } from '../../../base/common/themables.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MarkdownString } from './extHostTypeConverters.js';
export function createExtHostQuickOpen(mainContext, workspace, commands) {
    const proxy = mainContext.getProxy(MainContext.MainThreadQuickOpen);
    class ExtHostQuickOpenImpl {
        constructor(workspace, commands) {
            this._sessions = new Map();
            this._instances = 0;
            this._workspace = workspace;
            this._commands = commands;
        }
        showQuickPick(extension, itemsOrItemsPromise, options, token = CancellationToken.None) {
            // clear state from last invocation
            this._onDidSelectItem = undefined;
            const itemsPromise = Promise.resolve(itemsOrItemsPromise);
            const instance = ++this._instances;
            const quickPickWidget = proxy.$show(instance, {
                title: options?.title,
                placeHolder: options?.placeHolder,
                matchOnDescription: options?.matchOnDescription,
                matchOnDetail: options?.matchOnDetail,
                ignoreFocusLost: options?.ignoreFocusOut,
                canPickMany: options?.canPickMany,
            }, token);
            const widgetClosedMarker = {};
            const widgetClosedPromise = quickPickWidget.then(() => widgetClosedMarker);
            return Promise.race([widgetClosedPromise, itemsPromise])
                .then((result) => {
                if (result === widgetClosedMarker) {
                    return undefined;
                }
                const allowedTooltips = isProposedApiEnabled(extension, 'quickPickItemTooltip');
                return itemsPromise.then((items) => {
                    const pickItems = [];
                    for (let handle = 0; handle < items.length; handle++) {
                        const item = items[handle];
                        if (typeof item === 'string') {
                            pickItems.push({ label: item, handle });
                        }
                        else if (item.kind === QuickPickItemKind.Separator) {
                            pickItems.push({ type: 'separator', label: item.label });
                        }
                        else {
                            if (item.tooltip && !allowedTooltips) {
                                console.warn(`Extension '${extension.identifier.value}' uses a tooltip which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${extension.identifier.value}`);
                            }
                            const icon = item.iconPath ? getIconPathOrClass(item.iconPath) : undefined;
                            pickItems.push({
                                label: item.label,
                                iconPath: icon?.iconPath,
                                iconClass: icon?.iconClass,
                                description: item.description,
                                detail: item.detail,
                                picked: item.picked,
                                alwaysShow: item.alwaysShow,
                                tooltip: allowedTooltips ? MarkdownString.fromStrict(item.tooltip) : undefined,
                                handle,
                            });
                        }
                    }
                    // handle selection changes
                    if (options && typeof options.onDidSelectItem === 'function') {
                        this._onDidSelectItem = (handle) => {
                            options.onDidSelectItem(items[handle]);
                        };
                    }
                    // show items
                    proxy.$setItems(instance, pickItems);
                    return quickPickWidget.then((handle) => {
                        if (typeof handle === 'number') {
                            return items[handle];
                        }
                        else if (Array.isArray(handle)) {
                            return handle.map((h) => items[h]);
                        }
                        return undefined;
                    });
                });
            })
                .then(undefined, (err) => {
                if (isCancellationError(err)) {
                    return undefined;
                }
                proxy.$setError(instance, err);
                return Promise.reject(err);
            });
        }
        $onItemSelected(handle) {
            this._onDidSelectItem?.(handle);
        }
        // ---- input
        showInput(options, token = CancellationToken.None) {
            // global validate fn used in callback below
            this._validateInput = options?.validateInput;
            return proxy
                .$input(options, typeof this._validateInput === 'function', token)
                .then(undefined, (err) => {
                if (isCancellationError(err)) {
                    return undefined;
                }
                return Promise.reject(err);
            });
        }
        async $validateInput(input) {
            if (!this._validateInput) {
                return;
            }
            const result = await this._validateInput(input);
            if (!result || typeof result === 'string') {
                return result;
            }
            let severity;
            switch (result.severity) {
                case InputBoxValidationSeverity.Info:
                    severity = Severity.Info;
                    break;
                case InputBoxValidationSeverity.Warning:
                    severity = Severity.Warning;
                    break;
                case InputBoxValidationSeverity.Error:
                    severity = Severity.Error;
                    break;
                default:
                    severity = result.message ? Severity.Error : Severity.Ignore;
                    break;
            }
            return {
                content: result.message,
                severity,
            };
        }
        // ---- workspace folder picker
        async showWorkspaceFolderPick(options, token = CancellationToken.None) {
            const selectedFolder = await this._commands.executeCommand('_workbench.pickWorkspaceFolder', [options]);
            if (!selectedFolder) {
                return undefined;
            }
            const workspaceFolders = await this._workspace.getWorkspaceFolders2();
            if (!workspaceFolders) {
                return undefined;
            }
            return workspaceFolders.find((folder) => folder.uri.toString() === selectedFolder.uri.toString());
        }
        // ---- QuickInput
        createQuickPick(extension) {
            const session = new ExtHostQuickPick(extension, () => this._sessions.delete(session._id));
            this._sessions.set(session._id, session);
            return session;
        }
        createInputBox(extension) {
            const session = new ExtHostInputBox(extension, () => this._sessions.delete(session._id));
            this._sessions.set(session._id, session);
            return session;
        }
        $onDidChangeValue(sessionId, value) {
            const session = this._sessions.get(sessionId);
            session?._fireDidChangeValue(value);
        }
        $onDidAccept(sessionId) {
            const session = this._sessions.get(sessionId);
            session?._fireDidAccept();
        }
        $onDidChangeActive(sessionId, handles) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidChangeActive(handles);
            }
        }
        $onDidChangeSelection(sessionId, handles) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidChangeSelection(handles);
            }
        }
        $onDidTriggerButton(sessionId, handle) {
            const session = this._sessions.get(sessionId);
            session?._fireDidTriggerButton(handle);
        }
        $onDidTriggerItemButton(sessionId, itemHandle, buttonHandle) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidTriggerItemButton(itemHandle, buttonHandle);
            }
        }
        $onDidHide(sessionId) {
            const session = this._sessions.get(sessionId);
            session?._fireDidHide();
        }
    }
    class ExtHostQuickInput {
        static { this._nextId = 1; }
        constructor(_extension, _onDidDispose) {
            this._extension = _extension;
            this._onDidDispose = _onDidDispose;
            this._id = ExtHostQuickPick._nextId++;
            this._visible = false;
            this._expectingHide = false;
            this._enabled = true;
            this._busy = false;
            this._ignoreFocusOut = true;
            this._value = '';
            this._valueSelection = undefined;
            this._buttons = [];
            this._handlesToButtons = new Map();
            this._onDidAcceptEmitter = new Emitter();
            this._onDidChangeValueEmitter = new Emitter();
            this._onDidTriggerButtonEmitter = new Emitter();
            this._onDidHideEmitter = new Emitter();
            this._pendingUpdate = { id: this._id };
            this._disposed = false;
            this._disposables = [
                this._onDidTriggerButtonEmitter,
                this._onDidHideEmitter,
                this._onDidAcceptEmitter,
                this._onDidChangeValueEmitter,
            ];
            this.onDidChangeValue = this._onDidChangeValueEmitter.event;
            this.onDidAccept = this._onDidAcceptEmitter.event;
            this.onDidTriggerButton = this._onDidTriggerButtonEmitter.event;
            this.onDidHide = this._onDidHideEmitter.event;
        }
        get title() {
            return this._title;
        }
        set title(title) {
            this._title = title;
            this.update({ title });
        }
        get step() {
            return this._steps;
        }
        set step(step) {
            this._steps = step;
            this.update({ step });
        }
        get totalSteps() {
            return this._totalSteps;
        }
        set totalSteps(totalSteps) {
            this._totalSteps = totalSteps;
            this.update({ totalSteps });
        }
        get enabled() {
            return this._enabled;
        }
        set enabled(enabled) {
            this._enabled = enabled;
            this.update({ enabled });
        }
        get busy() {
            return this._busy;
        }
        set busy(busy) {
            this._busy = busy;
            this.update({ busy });
        }
        get ignoreFocusOut() {
            return this._ignoreFocusOut;
        }
        set ignoreFocusOut(ignoreFocusOut) {
            this._ignoreFocusOut = ignoreFocusOut;
            this.update({ ignoreFocusOut });
        }
        get value() {
            return this._value;
        }
        set value(value) {
            this._value = value;
            this.update({ value });
        }
        get valueSelection() {
            return this._valueSelection;
        }
        set valueSelection(valueSelection) {
            this._valueSelection = valueSelection;
            this.update({ valueSelection });
        }
        get placeholder() {
            return this._placeholder;
        }
        set placeholder(placeholder) {
            this._placeholder = placeholder;
            this.update({ placeholder });
        }
        get buttons() {
            return this._buttons;
        }
        set buttons(buttons) {
            const allowedButtonLocation = isProposedApiEnabled(this._extension, 'quickInputButtonLocation');
            if (!allowedButtonLocation && buttons.some((button) => button.location)) {
                console.warn(`Extension '${this._extension.identifier.value}' uses a button location which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${this._extension.identifier.value}`);
            }
            this._buttons = buttons.slice();
            this._handlesToButtons.clear();
            buttons.forEach((button, i) => {
                const handle = button === QuickInputButtons.Back ? -1 : i;
                this._handlesToButtons.set(handle, button);
            });
            this.update({
                buttons: buttons.map((button, i) => {
                    return {
                        ...getIconPathOrClass(button.iconPath),
                        tooltip: button.tooltip,
                        handle: button === QuickInputButtons.Back ? -1 : i,
                        location: allowedButtonLocation ? button.location : undefined,
                    };
                }),
            });
        }
        show() {
            this._visible = true;
            this._expectingHide = true;
            this.update({ visible: true });
        }
        hide() {
            this._visible = false;
            this.update({ visible: false });
        }
        _fireDidAccept() {
            this._onDidAcceptEmitter.fire();
        }
        _fireDidChangeValue(value) {
            this._value = value;
            this._onDidChangeValueEmitter.fire(value);
        }
        _fireDidTriggerButton(handle) {
            const button = this._handlesToButtons.get(handle);
            if (button) {
                this._onDidTriggerButtonEmitter.fire(button);
            }
        }
        _fireDidHide() {
            if (this._expectingHide) {
                // if this._visible is true, it means that .show() was called between
                // .hide() and .onDidHide. To ensure the correct number of onDidHide events
                // are emitted, we set this._expectingHide to this value so that
                // the next time .hide() is called, we can emit the event again.
                // Example:
                // .show() -> .hide() -> .show() -> .hide() should emit 2 onDidHide events.
                // .show() -> .hide() -> .hide() should emit 1 onDidHide event.
                // Fixes #135747
                this._expectingHide = this._visible;
                this._onDidHideEmitter.fire();
            }
        }
        dispose() {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
            this._fireDidHide();
            this._disposables = dispose(this._disposables);
            if (this._updateTimeout) {
                clearTimeout(this._updateTimeout);
                this._updateTimeout = undefined;
            }
            this._onDidDispose();
            proxy.$dispose(this._id);
        }
        update(properties) {
            if (this._disposed) {
                return;
            }
            for (const key of Object.keys(properties)) {
                const value = properties[key];
                this._pendingUpdate[key] = value === undefined ? null : value;
            }
            if ('visible' in this._pendingUpdate) {
                if (this._updateTimeout) {
                    clearTimeout(this._updateTimeout);
                    this._updateTimeout = undefined;
                }
                this.dispatchUpdate();
            }
            else if (this._visible && !this._updateTimeout) {
                // Defer the update so that multiple changes to setters dont cause a redraw each
                this._updateTimeout = setTimeout(() => {
                    this._updateTimeout = undefined;
                    this.dispatchUpdate();
                }, 0);
            }
        }
        dispatchUpdate() {
            proxy.$createOrUpdate(this._pendingUpdate);
            this._pendingUpdate = { id: this._id };
        }
    }
    function getIconUris(iconPath) {
        if (iconPath instanceof ThemeIcon) {
            return { id: iconPath.id };
        }
        const dark = getDarkIconUri(iconPath);
        const light = getLightIconUri(iconPath);
        // Tolerate strings: https://github.com/microsoft/vscode/issues/110432#issuecomment-726144556
        return {
            dark: typeof dark === 'string' ? URI.file(dark) : dark,
            light: typeof light === 'string' ? URI.file(light) : light,
        };
    }
    function getLightIconUri(iconPath) {
        return typeof iconPath === 'object' && 'light' in iconPath ? iconPath.light : iconPath;
    }
    function getDarkIconUri(iconPath) {
        return typeof iconPath === 'object' && 'dark' in iconPath ? iconPath.dark : iconPath;
    }
    function getIconPathOrClass(icon) {
        const iconPathOrIconClass = getIconUris(icon);
        let iconPath;
        let iconClass;
        if ('id' in iconPathOrIconClass) {
            iconClass = ThemeIconUtils.asClassName(iconPathOrIconClass);
        }
        else {
            iconPath = iconPathOrIconClass;
        }
        return {
            iconPath,
            iconClass,
        };
    }
    class ExtHostQuickPick extends ExtHostQuickInput {
        constructor(extension, onDispose) {
            super(extension, onDispose);
            this._items = [];
            this._handlesToItems = new Map();
            this._itemsToHandles = new Map();
            this._canSelectMany = false;
            this._matchOnDescription = true;
            this._matchOnDetail = true;
            this._sortByLabel = true;
            this._keepScrollPosition = false;
            this._activeItems = [];
            this._onDidChangeActiveEmitter = new Emitter();
            this._selectedItems = [];
            this._onDidChangeSelectionEmitter = new Emitter();
            this._onDidTriggerItemButtonEmitter = new Emitter();
            this.onDidChangeActive = this._onDidChangeActiveEmitter.event;
            this.onDidChangeSelection = this._onDidChangeSelectionEmitter.event;
            this.onDidTriggerItemButton = this._onDidTriggerItemButtonEmitter.event;
            this._disposables.push(this._onDidChangeActiveEmitter, this._onDidChangeSelectionEmitter, this._onDidTriggerItemButtonEmitter);
            this.update({ type: 'quickPick' });
        }
        get items() {
            return this._items;
        }
        set items(items) {
            this._items = items.slice();
            this._handlesToItems.clear();
            this._itemsToHandles.clear();
            items.forEach((item, i) => {
                this._handlesToItems.set(i, item);
                this._itemsToHandles.set(item, i);
            });
            const allowedTooltips = isProposedApiEnabled(this._extension, 'quickPickItemTooltip');
            const pickItems = [];
            for (let handle = 0; handle < items.length; handle++) {
                const item = items[handle];
                if (item.kind === QuickPickItemKind.Separator) {
                    pickItems.push({ type: 'separator', label: item.label });
                }
                else {
                    if (item.tooltip && !allowedTooltips) {
                        console.warn(`Extension '${this._extension.identifier.value}' uses a tooltip which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${this._extension.identifier.value}`);
                    }
                    const icon = item.iconPath ? getIconPathOrClass(item.iconPath) : undefined;
                    pickItems.push({
                        handle,
                        label: item.label,
                        iconPath: icon?.iconPath,
                        iconClass: icon?.iconClass,
                        description: item.description,
                        detail: item.detail,
                        picked: item.picked,
                        alwaysShow: item.alwaysShow,
                        tooltip: allowedTooltips ? MarkdownString.fromStrict(item.tooltip) : undefined,
                        buttons: item.buttons?.map((button, i) => {
                            return {
                                ...getIconPathOrClass(button.iconPath),
                                tooltip: button.tooltip,
                                handle: i,
                            };
                        }),
                    });
                }
            }
            this.update({
                items: pickItems,
            });
        }
        get canSelectMany() {
            return this._canSelectMany;
        }
        set canSelectMany(canSelectMany) {
            this._canSelectMany = canSelectMany;
            this.update({ canSelectMany });
        }
        get matchOnDescription() {
            return this._matchOnDescription;
        }
        set matchOnDescription(matchOnDescription) {
            this._matchOnDescription = matchOnDescription;
            this.update({ matchOnDescription });
        }
        get matchOnDetail() {
            return this._matchOnDetail;
        }
        set matchOnDetail(matchOnDetail) {
            this._matchOnDetail = matchOnDetail;
            this.update({ matchOnDetail });
        }
        get sortByLabel() {
            return this._sortByLabel;
        }
        set sortByLabel(sortByLabel) {
            this._sortByLabel = sortByLabel;
            this.update({ sortByLabel });
        }
        get keepScrollPosition() {
            return this._keepScrollPosition;
        }
        set keepScrollPosition(keepScrollPosition) {
            this._keepScrollPosition = keepScrollPosition;
            this.update({ keepScrollPosition });
        }
        get activeItems() {
            return this._activeItems;
        }
        set activeItems(activeItems) {
            this._activeItems = activeItems.filter((item) => this._itemsToHandles.has(item));
            this.update({ activeItems: this._activeItems.map((item) => this._itemsToHandles.get(item)) });
        }
        get selectedItems() {
            return this._selectedItems;
        }
        set selectedItems(selectedItems) {
            this._selectedItems = selectedItems.filter((item) => this._itemsToHandles.has(item));
            this.update({
                selectedItems: this._selectedItems.map((item) => this._itemsToHandles.get(item)),
            });
        }
        _fireDidChangeActive(handles) {
            const items = coalesce(handles.map((handle) => this._handlesToItems.get(handle)));
            this._activeItems = items;
            this._onDidChangeActiveEmitter.fire(items);
        }
        _fireDidChangeSelection(handles) {
            const items = coalesce(handles.map((handle) => this._handlesToItems.get(handle)));
            this._selectedItems = items;
            this._onDidChangeSelectionEmitter.fire(items);
        }
        _fireDidTriggerItemButton(itemHandle, buttonHandle) {
            const item = this._handlesToItems.get(itemHandle);
            if (!item || !item.buttons || !item.buttons.length) {
                return;
            }
            const button = item.buttons[buttonHandle];
            if (button) {
                this._onDidTriggerItemButtonEmitter.fire({
                    button,
                    item,
                });
            }
        }
    }
    class ExtHostInputBox extends ExtHostQuickInput {
        constructor(extension, onDispose) {
            super(extension, onDispose);
            this._password = false;
            this.update({ type: 'inputBox' });
        }
        get password() {
            return this._password;
        }
        set password(password) {
            this._password = password;
            this.update({ password });
        }
        get prompt() {
            return this._prompt;
        }
        set prompt(prompt) {
            this._prompt = prompt;
            this.update({ prompt });
        }
        get validationMessage() {
            return this._validationMessage;
        }
        set validationMessage(validationMessage) {
            this._validationMessage = validationMessage;
            if (!validationMessage) {
                this.update({ validationMessage: undefined, severity: Severity.Ignore });
            }
            else if (typeof validationMessage === 'string') {
                this.update({ validationMessage, severity: Severity.Error });
            }
            else {
                this.update({
                    validationMessage: validationMessage.message,
                    severity: validationMessage.severity ?? Severity.Error,
                });
            }
        }
    }
    return new ExtHostQuickOpenImpl(workspace, commands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFF1aWNrT3Blbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBZ0J4RSxPQUFPLEVBR04sV0FBVyxHQUlYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFDTixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQiwwQkFBMEIsR0FDMUIsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUEwQzNELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsV0FBeUIsRUFDekIsU0FBb0MsRUFDcEMsUUFBeUI7SUFFekIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUVuRSxN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