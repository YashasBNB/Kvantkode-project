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
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHostService } from './host.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isFolderToOpen, isWorkspaceToOpen, isFileToOpen, } from '../../../../platform/window/common/window.js';
import { isResourceEditorInput, pathsToEditors } from '../../../common/editor.js';
import { whenEditorClosed } from '../../../browser/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { EventType, ModifierKeyEmitter, addDisposableListener, addDisposableThrottledListener, detectFullscreen, disposableWindowInterval, getActiveDocument, getWindowId, onDidRegisterWindow, trackFocus, } from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { parseLineAndColumnAware } from '../../../../base/common/extpath.js';
import { IWorkspaceEditingService } from '../../workspaces/common/workspaceEditing.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILifecycleService, } from '../../lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getWorkspaceIdentifier } from '../../workspaces/browser/workspaces.js';
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { isUndefined } from '../../../../base/common/types.js';
import { isTemporaryWorkspace, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { mainWindow, isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { isIOS, isMacintosh } from '../../../../base/common/platform.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
var HostShutdownReason;
(function (HostShutdownReason) {
    /**
     * An unknown shutdown reason.
     */
    HostShutdownReason[HostShutdownReason["Unknown"] = 1] = "Unknown";
    /**
     * A shutdown that was potentially triggered by keyboard use.
     */
    HostShutdownReason[HostShutdownReason["Keyboard"] = 2] = "Keyboard";
    /**
     * An explicit shutdown via code.
     */
    HostShutdownReason[HostShutdownReason["Api"] = 3] = "Api";
})(HostShutdownReason || (HostShutdownReason = {}));
let BrowserHostService = class BrowserHostService extends Disposable {
    constructor(layoutService, configurationService, fileService, labelService, environmentService, instantiationService, lifecycleService, logService, dialogService, contextService, userDataProfilesService) {
        super();
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.userDataProfilesService = userDataProfilesService;
        this.shutdownReason = HostShutdownReason.Unknown;
        if (environmentService.options?.workspaceProvider) {
            this.workspaceProvider = environmentService.options.workspaceProvider;
        }
        else {
            this.workspaceProvider = new (class {
                constructor() {
                    this.workspace = undefined;
                    this.trusted = undefined;
                }
                async open() {
                    return true;
                }
            })();
        }
        this.registerListeners();
    }
    registerListeners() {
        // Veto shutdown depending on `window.confirmBeforeClose` setting
        this._register(this.lifecycleService.onBeforeShutdown((e) => this.onBeforeShutdown(e)));
        // Track modifier keys to detect keybinding usage
        this._register(ModifierKeyEmitter.getInstance().event(() => this.updateShutdownReasonFromEvent()));
    }
    onBeforeShutdown(e) {
        switch (this.shutdownReason) {
            // Unknown / Keyboard shows veto depending on setting
            case HostShutdownReason.Unknown:
            case HostShutdownReason.Keyboard: {
                const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
                if (confirmBeforeClose === 'always' ||
                    (confirmBeforeClose === 'keyboardOnly' &&
                        this.shutdownReason === HostShutdownReason.Keyboard)) {
                    e.veto(true, 'veto.confirmBeforeClose');
                }
                break;
            }
            // Api never shows veto
            case HostShutdownReason.Api:
                break;
        }
        // Unset for next shutdown
        this.shutdownReason = HostShutdownReason.Unknown;
    }
    updateShutdownReasonFromEvent() {
        if (this.shutdownReason === HostShutdownReason.Api) {
            return; // do not overwrite any explicitly set shutdown reason
        }
        if (ModifierKeyEmitter.getInstance().isModifierPressed) {
            this.shutdownReason = HostShutdownReason.Keyboard;
        }
        else {
            this.shutdownReason = HostShutdownReason.Unknown;
        }
    }
    //#region Focus
    get onDidChangeFocus() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const focusTracker = disposables.add(trackFocus(window));
            const visibilityTracker = disposables.add(new DomEmitter(window.document, 'visibilitychange'));
            Event.any(Event.map(focusTracker.onDidFocus, () => this.hasFocus, disposables), Event.map(focusTracker.onDidBlur, () => this.hasFocus, disposables), Event.map(visibilityTracker.event, () => this.hasFocus, disposables), Event.map(this.onDidChangeActiveWindow, () => this.hasFocus, disposables))((focus) => emitter.fire(focus));
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get hasFocus() {
        return getActiveDocument().hasFocus();
    }
    async hadLastFocus() {
        return true;
    }
    async focus(targetWindow) {
        targetWindow.focus();
    }
    //#endregion
    //#region Window
    get onDidChangeActiveWindow() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            // Emit via focus tracking
            const focusTracker = disposables.add(trackFocus(window));
            disposables.add(focusTracker.onDidFocus(() => emitter.fire(windowId)));
            // Emit via interval: immediately when opening an auxiliary window,
            // it is possible that document focus has not yet changed, so we
            // poll for a while to ensure we catch the event.
            if (isAuxiliaryWindow(window)) {
                disposables.add(disposableWindowInterval(window, () => {
                    const hasFocus = window.document.hasFocus();
                    if (hasFocus) {
                        emitter.fire(windowId);
                    }
                    return hasFocus;
                }, 100, 20));
            }
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get onDidChangeFullScreen() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            const viewport = isIOS && window.visualViewport
                ? window.visualViewport /** Visual viewport */
                : window; /** Layout viewport */
            // Fullscreen (Browser)
            for (const event of [EventType.FULLSCREEN_CHANGE, EventType.WK_FULLSCREEN_CHANGE]) {
                disposables.add(addDisposableListener(window.document, event, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) })));
            }
            // Fullscreen (Native)
            disposables.add(addDisposableThrottledListener(viewport, EventType.RESIZE, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) }), undefined, isMacintosh ? 2000 /* adjust for macOS animation */ : 800 /* can be throttled */));
        }, { window: mainWindow, disposables: this._store }));
        return emitter.event;
    }
    openWindow(arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(arg1, arg2);
        }
        return this.doOpenEmptyWindow(arg1);
    }
    async doOpenWindow(toOpen, options) {
        const payload = this.preservePayload(false /* not an empty window */, options);
        const fileOpenables = [];
        const foldersToAdd = [];
        const foldersToRemove = [];
        for (const openable of toOpen) {
            openable.label = openable.label || this.getRecentLabel(openable);
            // Folder
            if (isFolderToOpen(openable)) {
                if (options?.addMode) {
                    foldersToAdd.push({ uri: openable.folderUri });
                }
                else if (options?.removeMode) {
                    foldersToRemove.push(openable.folderUri);
                }
                else {
                    this.doOpen({ folderUri: openable.folderUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
                }
            }
            // Workspace
            else if (isWorkspaceToOpen(openable)) {
                this.doOpen({ workspaceUri: openable.workspaceUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
            }
            // File (handled later in bulk)
            else if (isFileToOpen(openable)) {
                fileOpenables.push(openable);
            }
        }
        // Handle Folders to add or remove
        if (foldersToAdd.length > 0 || foldersToRemove.length > 0) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                if (foldersToAdd.length > 0) {
                    await workspaceEditingService.addFolders(foldersToAdd);
                }
                if (foldersToRemove.length > 0) {
                    await workspaceEditingService.removeFolders(foldersToRemove);
                }
            });
        }
        // Handle Files
        if (fileOpenables.length > 0) {
            this.withServices(async (accessor) => {
                const editorService = accessor.get(IEditorService);
                // Support mergeMode
                if (options?.mergeMode && fileOpenables.length === 4) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 4 ||
                        !isResourceEditorInput(editors[0]) ||
                        !isResourceEditorInput(editors[1]) ||
                        !isResourceEditorInput(editors[2]) ||
                        !isResourceEditorInput(editors[3])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            input1: { resource: editors[0].resource },
                            input2: { resource: editors[1].resource },
                            base: { resource: editors[2].resource },
                            result: { resource: editors[3].resource },
                            options: { pinned: true },
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('mergeFile1', editors[0].resource.toString());
                        environment.set('mergeFile2', editors[1].resource.toString());
                        environment.set('mergeFileBase', editors[2].resource.toString());
                        environment.set('mergeFileResult', editors[3].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Support diffMode
                else if (options?.diffMode && fileOpenables.length === 2) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 2 ||
                        !isResourceEditorInput(editors[0]) ||
                        !isResourceEditorInput(editors[1])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            original: { resource: editors[0].resource },
                            modified: { resource: editors[1].resource },
                            options: { pinned: true },
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('diffFileSecondary', editors[0].resource.toString());
                        environment.set('diffFilePrimary', editors[1].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Just open normally
                else {
                    for (const openable of fileOpenables) {
                        // Same Window: open via editor service in current window
                        if (this.shouldReuse(options, true /* file */)) {
                            let openables = [];
                            // Support: --goto parameter to open on line/col
                            if (options?.gotoLineMode) {
                                const pathColumnAware = parseLineAndColumnAware(openable.fileUri.path);
                                openables = [
                                    {
                                        fileUri: openable.fileUri.with({ path: pathColumnAware.path }),
                                        options: {
                                            selection: !isUndefined(pathColumnAware.line)
                                                ? {
                                                    startLineNumber: pathColumnAware.line,
                                                    startColumn: pathColumnAware.column || 1,
                                                }
                                                : undefined,
                                        },
                                    },
                                ];
                            }
                            else {
                                openables = [openable];
                            }
                            editorService.openEditors(coalesce(await pathsToEditors(openables, this.fileService, this.logService)), undefined, { validateTrust: true });
                        }
                        // New Window: open into empty window
                        else {
                            const environment = new Map();
                            environment.set('openFile', openable.fileUri.toString());
                            if (options?.gotoLineMode) {
                                environment.set('gotoLineMode', 'true');
                            }
                            this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                        }
                    }
                }
                // Support wait mode
                const waitMarkerFileURI = options?.waitMarkerFileURI;
                if (waitMarkerFileURI) {
                    ;
                    (async () => {
                        // Wait for the resources to be closed in the text editor...
                        await this.instantiationService.invokeFunction((accessor) => whenEditorClosed(accessor, fileOpenables.map((fileOpenable) => fileOpenable.fileUri)));
                        // ...before deleting the wait marker file
                        await this.fileService.del(waitMarkerFileURI);
                    })();
                }
            });
        }
    }
    withServices(fn) {
        // Host service is used in a lot of contexts and some services
        // need to be resolved dynamically to avoid cyclic dependencies
        // (https://github.com/microsoft/vscode/issues/108522)
        this.instantiationService.invokeFunction((accessor) => fn(accessor));
    }
    preservePayload(isEmptyWindow, options) {
        // Selectively copy payload: for now only extension debugging properties are considered
        const newPayload = new Array();
        if (!isEmptyWindow && this.environmentService.extensionDevelopmentLocationURI) {
            newPayload.push([
                'extensionDevelopmentPath',
                this.environmentService.extensionDevelopmentLocationURI.toString(),
            ]);
            if (this.environmentService.debugExtensionHost.debugId) {
                newPayload.push(['debugId', this.environmentService.debugExtensionHost.debugId]);
            }
            if (this.environmentService.debugExtensionHost.port) {
                newPayload.push([
                    'inspect-brk-extensions',
                    String(this.environmentService.debugExtensionHost.port),
                ]);
            }
        }
        const newWindowProfile = options?.forceProfile
            ? this.userDataProfilesService.profiles.find((profile) => profile.name === options?.forceProfile)
            : undefined;
        if (newWindowProfile && !newWindowProfile.isDefault) {
            newPayload.push(['profile', newWindowProfile.name]);
        }
        return newPayload.length ? newPayload : undefined;
    }
    getRecentLabel(openable) {
        if (isFolderToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(openable.folderUri, { verbose: 2 /* Verbosity.LONG */ });
        }
        if (isWorkspaceToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(getWorkspaceIdentifier(openable.workspaceUri), {
                verbose: 2 /* Verbosity.LONG */,
            });
        }
        return this.labelService.getUriLabel(openable.fileUri, { appendWorkspaceSuffix: true });
    }
    shouldReuse(options = Object.create(null), isFile) {
        if (options.waitMarkerFileURI) {
            return true; // always handle --wait in same window
        }
        const windowConfig = this.configurationService.getValue('window');
        const openInNewWindowConfig = isFile
            ? windowConfig?.openFilesInNewWindow || 'off' /* default */
            : windowConfig?.openFoldersInNewWindow || 'default'; /* default */
        let openInNewWindow = (options.preferNewWindow || !!options.forceNewWindow) && !options.forceReuseWindow;
        if (!options.forceNewWindow &&
            !options.forceReuseWindow &&
            (openInNewWindowConfig === 'on' || openInNewWindowConfig === 'off')) {
            openInNewWindow = openInNewWindowConfig === 'on';
        }
        return !openInNewWindow;
    }
    async doOpenEmptyWindow(options) {
        return this.doOpen(undefined, {
            reuse: options?.forceReuseWindow,
            payload: this.preservePayload(true /* empty window */, options),
        });
    }
    async doOpen(workspace, options) {
        // When we are in a temporary workspace and are asked to open a local folder
        // we swap that folder into the workspace to avoid a window reload. Access
        // to local resources is only possible without a window reload because it
        // needs user activation.
        if (workspace &&
            isFolderToOpen(workspace) &&
            workspace.folderUri.scheme === Schemas.file &&
            isTemporaryWorkspace(this.contextService.getWorkspace())) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                await workspaceEditingService.updateFolders(0, this.contextService.getWorkspace().folders.length, [{ uri: workspace.folderUri }]);
            });
            return;
        }
        // We know that `workspaceProvider.open` will trigger a shutdown
        // with `options.reuse` so we handle this expected shutdown
        if (options?.reuse) {
            await this.handleExpectedShutdown(4 /* ShutdownReason.LOAD */);
        }
        const opened = await this.workspaceProvider.open(workspace, options);
        if (!opened) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Warning,
                message: localize('unableToOpenExternal', "The browser interrupted the opening of a new tab or window. Press 'Open' to open it anyway."),
                primaryButton: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
            });
            if (confirmed) {
                await this.workspaceProvider.open(workspace, options);
            }
        }
    }
    async toggleFullScreen(targetWindow) {
        const target = this.layoutService.getContainer(targetWindow);
        // Chromium
        if (targetWindow.document.fullscreen !== undefined) {
            if (!targetWindow.document.fullscreen) {
                try {
                    return await target.requestFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): requestFullscreen failed'); // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
                }
            }
            else {
                try {
                    return await targetWindow.document.exitFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): exitFullscreen failed');
                }
            }
        }
        // Safari and Edge 14 are all using webkit prefix
        if (targetWindow.document.webkitIsFullScreen !== undefined) {
            try {
                if (!targetWindow.document.webkitIsFullScreen) {
                    ;
                    target.webkitRequestFullscreen(); // it's async, but doesn't return a real promise.
                }
                else {
                    ;
                    targetWindow.document.webkitExitFullscreen(); // it's async, but doesn't return a real promise.
                }
            }
            catch {
                this.logService.warn('toggleFullScreen(): requestFullscreen/exitFullscreen failed');
            }
        }
    }
    async moveTop(targetWindow) {
        // There seems to be no API to bring a window to front in browsers
    }
    async getCursorScreenPoint() {
        return undefined;
    }
    //#endregion
    //#region Lifecycle
    async restart() {
        this.reload();
    }
    async reload() {
        await this.handleExpectedShutdown(3 /* ShutdownReason.RELOAD */);
        mainWindow.location.reload();
    }
    async close() {
        await this.handleExpectedShutdown(1 /* ShutdownReason.CLOSE */);
        mainWindow.close();
    }
    async withExpectedShutdown(expectedShutdownTask) {
        const previousShutdownReason = this.shutdownReason;
        try {
            this.shutdownReason = HostShutdownReason.Api;
            return await expectedShutdownTask();
        }
        finally {
            this.shutdownReason = previousShutdownReason;
        }
    }
    async handleExpectedShutdown(reason) {
        // Update shutdown reason in a way that we do
        // not show a dialog because this is a expected
        // shutdown.
        this.shutdownReason = HostShutdownReason.Api;
        // Signal shutdown reason to lifecycle
        return this.lifecycleService.withExpectedShutdown(reason);
    }
    //#endregion
    //#region Screenshots
    async getScreenshot() {
        // Gets a screenshot from the browser. This gets the screenshot via the browser's display
        // media API which will typically offer a picker of all available screens and windows for
        // the user to select. Using the video stream provided by the display media API, this will
        // capture a single frame of the video and convert it to a JPEG image.
        const store = new DisposableStore();
        // Create a video element to play the captured screen source
        const video = document.createElement('video');
        store.add(toDisposable(() => video.remove()));
        let stream;
        try {
            // Create a stream from the screen source (capture screen without audio)
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: true,
            });
            // Set the stream as the source of the video element
            video.srcObject = stream;
            video.play();
            // Wait for the video to load properly before capturing the screenshot
            await Promise.all([
                new Promise((r) => store.add(addDisposableListener(video, 'loadedmetadata', () => r()))),
                new Promise((r) => store.add(addDisposableListener(video, 'canplaythrough', () => r()))),
            ]);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return undefined;
            }
            // Draw the portion of the video (x, y) with the specified width and height
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert the canvas to a Blob (JPEG format), use .95 for quality
            const blob = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95));
            if (!blob) {
                throw new Error('Failed to create blob from canvas');
            }
            // Convert the Blob to an ArrayBuffer
            return blob.arrayBuffer();
        }
        catch (error) {
            console.error('Error taking screenshot:', error);
            return undefined;
        }
        finally {
            store.dispose();
            if (stream) {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
            }
        }
    }
    //#endregion
    //#region Native Handle
    async getNativeWindowHandle(_windowId) {
        return undefined;
    }
};
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeActiveWindow", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFullScreen", null);
BrowserHostService = __decorate([
    __param(0, ILayoutService),
    __param(1, IConfigurationService),
    __param(2, IFileService),
    __param(3, ILabelService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IInstantiationService),
    __param(6, ILifecycleService),
    __param(7, ILogService),
    __param(8, IDialogService),
    __param(9, IWorkspaceContextService),
    __param(10, IUserDataProfilesService)
], BrowserHostService);
export { BrowserHostService };
registerSingleton(IHostService, BrowserHostService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hvc3QvYnJvd3Nlci9icm93c2VySG9zdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ3hDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFJTixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLFlBQVksR0FJWixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBYSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JGLE9BQU8sRUFDTixTQUFTLEVBQ1Qsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQiw4QkFBOEIsRUFDOUIsZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLG1CQUFtQixFQUNuQixVQUFVLEdBQ1YsTUFBTSxpQ0FBaUMsQ0FBQTtB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