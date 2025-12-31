/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/actions.css';
import { localize, localize2 } from '../../../nls.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { Color } from '../../../base/common/color.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { toDisposable, dispose, DisposableStore, setDisposableTracker, DisposableTracker, } from '../../../base/common/lifecycle.js';
import { getDomNodePagePosition, append, $, getActiveDocument, onDidRegisterWindow, getWindows, } from '../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../platform/contextkey/common/contextkey.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { registerAction2, Action2, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { IStorageService, } from '../../../platform/storage/common/storage.js';
import { clamp } from '../../../base/common/numbers.js';
import { Extensions as ConfigurationExtensions, } from '../../../platform/configuration/common/configurationRegistry.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IOutputService } from '../../services/output/common/output.js';
import { windowLogId } from '../../services/log/common/logConstants.js';
import { ByteSize } from '../../../platform/files/common/files.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import product from '../../../platform/product/common/product.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
class InspectContextKeysAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectContextKeys',
            title: localize2('inspect context keys', 'Inspect Context Keys'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const disposables = new DisposableStore();
        const stylesheet = createStyleSheet(undefined, undefined, disposables);
        createCSSRule('*', 'cursor: crosshair !important;', stylesheet);
        const hoverFeedback = document.createElement('div');
        const activeDocument = getActiveDocument();
        activeDocument.body.appendChild(hoverFeedback);
        disposables.add(toDisposable(() => hoverFeedback.remove()));
        hoverFeedback.style.position = 'absolute';
        hoverFeedback.style.pointerEvents = 'none';
        hoverFeedback.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        hoverFeedback.style.zIndex = '1000';
        const onMouseMove = disposables.add(new DomEmitter(activeDocument, 'mousemove', true));
        disposables.add(onMouseMove.event((e) => {
            const target = e.target;
            const position = getDomNodePagePosition(target);
            hoverFeedback.style.top = `${position.top}px`;
            hoverFeedback.style.left = `${position.left}px`;
            hoverFeedback.style.width = `${position.width}px`;
            hoverFeedback.style.height = `${position.height}px`;
        }));
        const onMouseDown = disposables.add(new DomEmitter(activeDocument, 'mousedown', true));
        Event.once(onMouseDown.event)((e) => {
            e.preventDefault();
            e.stopPropagation();
        }, null, disposables);
        const onMouseUp = disposables.add(new DomEmitter(activeDocument, 'mouseup', true));
        Event.once(onMouseUp.event)((e) => {
            e.preventDefault();
            e.stopPropagation();
            const context = contextKeyService.getContext(e.target);
            console.log(context.collectAllValues());
            dispose(disposables);
        }, null, disposables);
    }
}
class ToggleScreencastModeAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleScreencastMode',
            title: localize2('toggle screencast mode', 'Toggle Screencast Mode'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        if (ToggleScreencastModeAction.disposable) {
            ToggleScreencastModeAction.disposable.dispose();
            ToggleScreencastModeAction.disposable = undefined;
            return;
        }
        const layoutService = accessor.get(ILayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const keybindingService = accessor.get(IKeybindingService);
        const disposables = new DisposableStore();
        const container = layoutService.activeContainer;
        const mouseMarker = append(container, $('.screencast-mouse'));
        disposables.add(toDisposable(() => mouseMarker.remove()));
        const keyboardMarker = append(container, $('.screencast-keyboard'));
        disposables.add(toDisposable(() => keyboardMarker.remove()));
        const onMouseDown = disposables.add(new Emitter());
        const onMouseUp = disposables.add(new Emitter());
        const onMouseMove = disposables.add(new Emitter());
        function registerContainerListeners(container, disposables) {
            disposables.add(disposables
                .add(new DomEmitter(container, 'mousedown', true))
                .event((e) => onMouseDown.fire(e)));
            disposables.add(disposables.add(new DomEmitter(container, 'mouseup', true)).event((e) => onMouseUp.fire(e)));
            disposables.add(disposables
                .add(new DomEmitter(container, 'mousemove', true))
                .event((e) => onMouseMove.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerContainerListeners(layoutService.getContainer(window), disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerContainerListeners(layoutService.getContainer(window), disposables)));
        disposables.add(layoutService.onDidChangeActiveContainer(() => {
            layoutService.activeContainer.appendChild(mouseMarker);
            layoutService.activeContainer.appendChild(keyboardMarker);
        }));
        const updateMouseIndicatorColor = () => {
            mouseMarker.style.borderColor = Color.fromHex(configurationService.getValue('screencastMode.mouseIndicatorColor')).toString();
        };
        let mouseIndicatorSize;
        const updateMouseIndicatorSize = () => {
            mouseIndicatorSize = clamp(configurationService.getValue('screencastMode.mouseIndicatorSize') || 20, 20, 100);
            mouseMarker.style.height = `${mouseIndicatorSize}px`;
            mouseMarker.style.width = `${mouseIndicatorSize}px`;
        };
        updateMouseIndicatorColor();
        updateMouseIndicatorSize();
        disposables.add(onMouseDown.event((e) => {
            mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
            mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
            mouseMarker.style.display = 'block';
            mouseMarker.style.transform = `scale(${1})`;
            mouseMarker.style.transition = 'transform 0.1s';
            const mouseMoveListener = onMouseMove.event((e) => {
                mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
                mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
                mouseMarker.style.transform = `scale(${0.8})`;
            });
            Event.once(onMouseUp.event)(() => {
                mouseMarker.style.display = 'none';
                mouseMoveListener.dispose();
            });
        }));
        const updateKeyboardFontSize = () => {
            keyboardMarker.style.fontSize = `${clamp(configurationService.getValue('screencastMode.fontSize') || 56, 20, 100)}px`;
        };
        const updateKeyboardMarker = () => {
            keyboardMarker.style.bottom = `${clamp(configurationService.getValue('screencastMode.verticalOffset') || 0, 0, 90)}%`;
        };
        let keyboardMarkerTimeout;
        const updateKeyboardMarkerTimeout = () => {
            keyboardMarkerTimeout = clamp(configurationService.getValue('screencastMode.keyboardOverlayTimeout') || 800, 500, 5000);
        };
        updateKeyboardFontSize();
        updateKeyboardMarker();
        updateKeyboardMarkerTimeout();
        disposables.add(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('screencastMode.verticalOffset')) {
                updateKeyboardMarker();
            }
            if (e.affectsConfiguration('screencastMode.fontSize')) {
                updateKeyboardFontSize();
            }
            if (e.affectsConfiguration('screencastMode.keyboardOverlayTimeout')) {
                updateKeyboardMarkerTimeout();
            }
            if (e.affectsConfiguration('screencastMode.mouseIndicatorColor')) {
                updateMouseIndicatorColor();
            }
            if (e.affectsConfiguration('screencastMode.mouseIndicatorSize')) {
                updateMouseIndicatorSize();
            }
        }));
        const onKeyDown = disposables.add(new Emitter());
        const onCompositionStart = disposables.add(new Emitter());
        const onCompositionUpdate = disposables.add(new Emitter());
        const onCompositionEnd = disposables.add(new Emitter());
        function registerWindowListeners(window, disposables) {
            disposables.add(disposables.add(new DomEmitter(window, 'keydown', true)).event((e) => onKeyDown.fire(e)));
            disposables.add(disposables
                .add(new DomEmitter(window, 'compositionstart', true))
                .event((e) => onCompositionStart.fire(e)));
            disposables.add(disposables
                .add(new DomEmitter(window, 'compositionupdate', true))
                .event((e) => onCompositionUpdate.fire(e)));
            disposables.add(disposables
                .add(new DomEmitter(window, 'compositionend', true))
                .event((e) => onCompositionEnd.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerWindowListeners(window, disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerWindowListeners(window, disposables)));
        let length = 0;
        let composing = undefined;
        let imeBackSpace = false;
        const clearKeyboardScheduler = new RunOnceScheduler(() => {
            keyboardMarker.textContent = '';
            composing = undefined;
            length = 0;
        }, keyboardMarkerTimeout);
        disposables.add(onCompositionStart.event((e) => {
            imeBackSpace = true;
        }));
        disposables.add(onCompositionUpdate.event((e) => {
            if (e.data && imeBackSpace) {
                if (length > 20) {
                    keyboardMarker.innerText = '';
                    length = 0;
                }
                composing = composing ?? append(keyboardMarker, $('span.key'));
                composing.textContent = e.data;
            }
            else if (imeBackSpace) {
                keyboardMarker.innerText = '';
                append(keyboardMarker, $('span.key', {}, `Backspace`));
            }
            clearKeyboardScheduler.schedule();
        }));
        disposables.add(onCompositionEnd.event((e) => {
            composing = undefined;
            length++;
        }));
        disposables.add(onKeyDown.event((e) => {
            if (e.key === 'Process' ||
                /[\uac00-\ud787\u3131-\u314e\u314f-\u3163\u3041-\u3094\u30a1-\u30f4\u30fc\u3005\u3006\u3024\u4e00-\u9fa5]/u.test(e.key)) {
                if (e.code === 'Backspace') {
                    imeBackSpace = true;
                }
                else if (!e.code.includes('Key')) {
                    composing = undefined;
                    imeBackSpace = false;
                }
                else {
                    imeBackSpace = true;
                }
                clearKeyboardScheduler.schedule();
                return;
            }
            if (e.isComposing) {
                return;
            }
            const options = configurationService.getValue('screencastMode.keyboardOptions');
            const event = new StandardKeyboardEvent(e);
            const shortcut = keybindingService.softDispatch(event, event.target);
            // Hide the single arrow key pressed
            if (shortcut.kind === 2 /* ResultKind.KbFound */ &&
                shortcut.commandId &&
                !(options.showSingleEditorCursorMoves ?? true) &&
                ['cursorLeft', 'cursorRight', 'cursorUp', 'cursorDown'].includes(shortcut.commandId)) {
                return;
            }
            if (event.ctrlKey ||
                event.altKey ||
                event.metaKey ||
                event.shiftKey ||
                length > 20 ||
                event.keyCode === 1 /* KeyCode.Backspace */ ||
                event.keyCode === 9 /* KeyCode.Escape */ ||
                event.keyCode === 16 /* KeyCode.UpArrow */ ||
                event.keyCode === 18 /* KeyCode.DownArrow */ ||
                event.keyCode === 15 /* KeyCode.LeftArrow */ ||
                event.keyCode === 17 /* KeyCode.RightArrow */) {
                keyboardMarker.innerText = '';
                length = 0;
            }
            const keybinding = keybindingService.resolveKeyboardEvent(event);
            const commandDetails = this._isKbFound(shortcut) && shortcut.commandId
                ? this.getCommandDetails(shortcut.commandId)
                : undefined;
            let commandAndGroupLabel = commandDetails?.title;
            let keyLabel = keybinding.getLabel();
            if (commandDetails) {
                if ((options.showCommandGroups ?? false) && commandDetails.category) {
                    commandAndGroupLabel = `${commandDetails.category}: ${commandAndGroupLabel} `;
                }
                if (this._isKbFound(shortcut) && shortcut.commandId) {
                    const keybindings = keybindingService
                        .lookupKeybindings(shortcut.commandId)
                        .filter((k) => k.getLabel()?.endsWith(keyLabel ?? ''));
                    if (keybindings.length > 0) {
                        keyLabel = keybindings[keybindings.length - 1].getLabel();
                    }
                }
            }
            if ((options.showCommands ?? true) && commandAndGroupLabel) {
                append(keyboardMarker, $('span.title', {}, `${commandAndGroupLabel} `));
            }
            if ((options.showKeys ?? true) ||
                ((options.showKeybindings ?? true) && this._isKbFound(shortcut))) {
                // Fix label for arrow keys
                keyLabel = keyLabel
                    ?.replace('UpArrow', '↑')
                    ?.replace('DownArrow', '↓')
                    ?.replace('LeftArrow', '←')
                    ?.replace('RightArrow', '→');
                append(keyboardMarker, $('span.key', {}, keyLabel ?? ''));
            }
            length++;
            clearKeyboardScheduler.schedule();
        }));
        ToggleScreencastModeAction.disposable = disposables;
    }
    _isKbFound(resolutionResult) {
        return resolutionResult.kind === 2 /* ResultKind.KbFound */;
    }
    getCommandDetails(commandId) {
        const fromMenuRegistry = MenuRegistry.getCommand(commandId);
        if (fromMenuRegistry) {
            return {
                title: typeof fromMenuRegistry.title === 'string'
                    ? fromMenuRegistry.title
                    : fromMenuRegistry.title.value,
                category: fromMenuRegistry.category
                    ? typeof fromMenuRegistry.category === 'string'
                        ? fromMenuRegistry.category
                        : fromMenuRegistry.category.value
                    : undefined,
            };
        }
        const fromCommandsRegistry = CommandsRegistry.getCommand(commandId);
        if (fromCommandsRegistry && fromCommandsRegistry.metadata?.description) {
            return {
                title: typeof fromCommandsRegistry.metadata.description === 'string'
                    ? fromCommandsRegistry.metadata.description
                    : fromCommandsRegistry.metadata.description.value,
            };
        }
        return undefined;
    }
}
class LogStorageAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.logStorage',
            title: localize2({
                key: 'logStorage',
                comment: [
                    'A developer only action to log the contents of the storage for the current window.',
                ],
            }, 'Log Storage Database Contents'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        const dialogService = accessor.get(IDialogService);
        storageService.log();
        dialogService.info(localize('storageLogDialogMessage', 'The storage database contents have been logged to the developer tools.'), localize('storageLogDialogDetails', 'Open developer tools from the menu and select the Console tab.'));
    }
}
class LogWorkingCopiesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.logWorkingCopies',
            title: localize2({
                key: 'logWorkingCopies',
                comment: ['A developer only action to log the working copies that exist.'],
            }, 'Log Working Copies'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const workingCopyService = accessor.get(IWorkingCopyService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        const logService = accessor.get(ILogService);
        const outputService = accessor.get(IOutputService);
        const backups = await workingCopyBackupService.getBackups();
        const msg = [
            ``,
            `[Working Copies]`,
            ...(workingCopyService.workingCopies.length > 0
                ? workingCopyService.workingCopies.map((workingCopy) => `${workingCopy.isDirty() ? '● ' : ''}${workingCopy.resource.toString(true)} (typeId: ${workingCopy.typeId || '<no typeId>'})`)
                : ['<none>']),
            ``,
            `[Backups]`,
            ...(backups.length > 0
                ? backups.map((backup) => `${backup.resource.toString(true)} (typeId: ${backup.typeId || '<no typeId>'})`)
                : ['<none>']),
        ];
        logService.info(msg.join('\n'));
        outputService.showChannel(windowLogId, true);
    }
}
class RemoveLargeStorageEntriesAction extends Action2 {
    static { this.SIZE_THRESHOLD = 1024 * 16; } // 16kb
    constructor() {
        super({
            id: 'workbench.action.removeLargeStorageDatabaseEntries',
            title: localize2('removeLargeStorageDatabaseEntries', 'Remove Large Storage Database Entries...'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const storageService = accessor.get(IStorageService);
        const quickInputService = accessor.get(IQuickInputService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const dialogService = accessor.get(IDialogService);
        const environmentService = accessor.get(IEnvironmentService);
        const items = [];
        for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
            if (scope === 0 /* StorageScope.PROFILE */ && userDataProfileService.currentProfile.isDefault) {
                continue; // avoid duplicates
            }
            for (const target of [1 /* StorageTarget.MACHINE */, 0 /* StorageTarget.USER */]) {
                for (const key of storageService.keys(scope, target)) {
                    const value = storageService.get(key, scope);
                    if (value &&
                        (!environmentService.isBuilt /* show all keys in dev */ ||
                            value.length > RemoveLargeStorageEntriesAction.SIZE_THRESHOLD)) {
                        items.push({
                            key,
                            scope,
                            target,
                            size: value.length,
                            label: key,
                            description: ByteSize.formatSize(value.length),
                            detail: localize('largeStorageItemDetail', 'Scope: {0}, Target: {1}', scope === -1 /* StorageScope.APPLICATION */
                                ? localize('global', 'Global')
                                : scope === 0 /* StorageScope.PROFILE */
                                    ? localize('profile', 'Profile')
                                    : localize('workspace', 'Workspace'), target === 1 /* StorageTarget.MACHINE */
                                ? localize('machine', 'Machine')
                                : localize('user', 'User')),
                        });
                    }
                }
            }
        }
        items.sort((itemA, itemB) => itemB.size - itemA.size);
        const selectedItems = await new Promise((resolve) => {
            const disposables = new DisposableStore();
            const picker = disposables.add(quickInputService.createQuickPick());
            picker.items = items;
            picker.canSelectMany = true;
            picker.ok = false;
            picker.customButton = true;
            picker.hideCheckAll = true;
            picker.customLabel = localize('removeLargeStorageEntriesPickerButton', 'Remove');
            picker.placeholder = localize('removeLargeStorageEntriesPickerPlaceholder', 'Select large entries to remove from storage');
            if (items.length === 0) {
                picker.description = localize('removeLargeStorageEntriesPickerDescriptionNoEntries', 'There are no large storage entries to remove.');
            }
            picker.show();
            disposables.add(picker.onDidCustom(() => {
                resolve(picker.selectedItems);
                picker.hide();
            }));
            disposables.add(picker.onDidHide(() => disposables.dispose()));
        });
        if (selectedItems.length === 0) {
            return;
        }
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('removeLargeStorageEntriesConfirmRemove', 'Do you want to remove the selected storage entries from the database?'),
            detail: localize('removeLargeStorageEntriesConfirmRemoveDetail', '{0}\n\nThis action is irreversible and may result in data loss!', selectedItems.map((item) => item.label).join('\n')),
            primaryButton: localize({ key: 'removeLargeStorageEntriesButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Remove'),
        });
        if (!confirmed) {
            return;
        }
        const scopesToOptimize = new Set();
        for (const item of selectedItems) {
            storageService.remove(item.key, item.scope);
            scopesToOptimize.add(item.scope);
        }
        for (const scope of scopesToOptimize) {
            await storageService.optimize(scope);
        }
    }
}
let tracker = undefined;
let trackedDisposables = new Set();
const DisposablesSnapshotStateContext = new RawContextKey('dirtyWorkingCopies', 'stopped');
class StartTrackDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.startTrackDisposables',
            title: localize2('startTrackDisposables', 'Start Tracking Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: ContextKeyExpr.and(DisposablesSnapshotStateContext.isEqualTo('pending').negate(), DisposablesSnapshotStateContext.isEqualTo('started').negate()),
        });
    }
    run(accessor) {
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('started');
        trackedDisposables.clear();
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    }
}
class SnapshotTrackedDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.snapshotTrackedDisposables',
            title: localize2('snapshotTrackedDisposables', 'Snapshot Tracked Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: DisposablesSnapshotStateContext.isEqualTo('started'),
        });
    }
    run(accessor) {
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('pending');
        trackedDisposables = new Set(tracker?.computeLeakingDisposables(1000)?.leaks.map((disposable) => disposable.value));
    }
}
class StopTrackDisposables extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.stopTrackDisposables',
            title: localize2('stopTrackDisposables', 'Stop Tracking Disposables'),
            category: Categories.Developer,
            f1: true,
            precondition: DisposablesSnapshotStateContext.isEqualTo('pending'),
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const disposablesSnapshotStateContext = DisposablesSnapshotStateContext.bindTo(accessor.get(IContextKeyService));
        disposablesSnapshotStateContext.set('stopped');
        if (tracker) {
            const disposableLeaks = new Set();
            for (const disposable of new Set(tracker.computeLeakingDisposables(1000)?.leaks) ?? []) {
                if (trackedDisposables.has(disposable.value)) {
                    disposableLeaks.add(disposable);
                }
            }
            const leaks = tracker.computeLeakingDisposables(1000, Array.from(disposableLeaks));
            if (leaks) {
                editorService.openEditor({ resource: undefined, contents: leaks.details });
            }
        }
        setDisposableTracker(null);
        tracker = undefined;
        trackedDisposables.clear();
    }
}
// --- Actions Registration
registerAction2(InspectContextKeysAction);
registerAction2(ToggleScreencastModeAction);
registerAction2(LogStorageAction);
registerAction2(LogWorkingCopiesAction);
registerAction2(RemoveLargeStorageEntriesAction);
if (!product.commit) {
    registerAction2(StartTrackDisposables);
    registerAction2(SnapshotTrackedDisposables);
    registerAction2(StopTrackDisposables);
}
// --- Configuration
// Screen Cast Mode
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'screencastMode',
    order: 9,
    title: localize('screencastModeConfigurationTitle', 'Screencast Mode'),
    type: 'object',
    properties: {
        'screencastMode.verticalOffset': {
            type: 'number',
            default: 20,
            minimum: 0,
            maximum: 90,
            description: localize('screencastMode.location.verticalPosition', 'Controls the vertical offset of the screencast mode overlay from the bottom as a percentage of the workbench height.'),
        },
        'screencastMode.fontSize': {
            type: 'number',
            default: 56,
            minimum: 20,
            maximum: 100,
            description: localize('screencastMode.fontSize', 'Controls the font size (in pixels) of the screencast mode keyboard.'),
        },
        'screencastMode.keyboardOptions': {
            type: 'object',
            description: localize('screencastMode.keyboardOptions.description', 'Options for customizing the keyboard overlay in screencast mode.'),
            properties: {
                showKeys: {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showKeys', 'Show raw keys.'),
                },
                showKeybindings: {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showKeybindings', 'Show keyboard shortcuts.'),
                },
                showCommands: {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showCommands', 'Show command names.'),
                },
                showCommandGroups: {
                    type: 'boolean',
                    default: false,
                    description: localize('screencastMode.keyboardOptions.showCommandGroups', 'Show command group names, when commands are also shown.'),
                },
                showSingleEditorCursorMoves: {
                    type: 'boolean',
                    default: true,
                    description: localize('screencastMode.keyboardOptions.showSingleEditorCursorMoves', 'Show single editor cursor move commands.'),
                },
            },
            default: {
                showKeys: true,
                showKeybindings: true,
                showCommands: true,
                showCommandGroups: false,
                showSingleEditorCursorMoves: true,
            },
            additionalProperties: false,
        },
        'screencastMode.keyboardOverlayTimeout': {
            type: 'number',
            default: 800,
            minimum: 500,
            maximum: 5000,
            description: localize('screencastMode.keyboardOverlayTimeout', 'Controls how long (in milliseconds) the keyboard overlay is shown in screencast mode.'),
        },
        'screencastMode.mouseIndicatorColor': {
            type: 'string',
            format: 'color-hex',
            default: '#FF0000',
            description: localize('screencastMode.mouseIndicatorColor', 'Controls the color in hex (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) of the mouse indicator in screencast mode.'),
        },
        'screencastMode.mouseIndicatorSize': {
            type: 'number',
            default: 20,
            minimum: 20,
            maximum: 100,
            description: localize('screencastMode.mouseIndicatorSize', 'Controls the size (in pixels) of the mouse indicator in screencast mode.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2ZWxvcGVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvZGV2ZWxvcGVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFCQUFxQixDQUFBO0FBRTVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFFTixZQUFZLEVBQ1osT0FBTyxFQUNQLGVBQWUsRUFDZixvQkFBb0IsRUFDcEIsaUJBQWlCLEdBRWpCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixNQUFNLEVBQ04sQ0FBQyxFQUNELGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsVUFBVSxHQUNWLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtC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