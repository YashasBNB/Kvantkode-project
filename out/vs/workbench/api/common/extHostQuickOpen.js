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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RRdWlja09wZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQWdCeEUsT0FBTyxFQUdOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sU0FBUyxFQUNULGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsMEJBQTBCLEdBQzFCLE1BQU0sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBMEMzRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLFdBQXlCLEVBQ3pCLFNBQW9DLEVBQ3BDLFFBQXlCO0lBRXpCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFFbkUsTUFBTSxv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