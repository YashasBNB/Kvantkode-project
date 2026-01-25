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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaG9zdC9icm93c2VyL2Jyb3dzZXJIb3N0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDeEMsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUlOLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsWUFBWSxHQUlaLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFhLE1BQU0sNENBQTRDLENBQUE7QUFDckYsT0FBTyxFQUNOLFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLDhCQUE4QixFQUM5QixnQkFBZ0IsRUFDaEIsd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsbUJBQW1CLEVBQ25CLFVBQVUsR0FDVixNQUFNLGlDQUFpQyxD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