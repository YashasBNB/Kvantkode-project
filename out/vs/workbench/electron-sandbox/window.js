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
var NativeWindow_1;
import './media/window.css';
import { localize } from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { equals } from '../../base/common/objects.js';
import { EventType, EventHelper, addDisposableListener, ModifierKeyEmitter, getActiveElement, hasWindow, getWindowById, getWindows, $, } from '../../base/browser/dom.js';
import { Action, Separator, } from '../../base/common/actions.js';
import { IFileService } from '../../platform/files/common/files.js';
import { EditorResourceAccessor, SideBySideEditor, pathsToEditors, isResourceEditorInput, } from '../common/editor.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { WindowMinimumSize, hasNativeTitlebar, } from '../../platform/window/common/window.js';
import { ITitleService } from '../services/title/browser/titleService.js';
import { IWorkbenchThemeService } from '../services/themes/common/workbenchThemeService.js';
import { ApplyZoomTarget, applyZoom } from '../../platform/window/electron-sandbox/window.js';
import { setFullscreen, getZoomLevel, onDidChangeZoomLevel, getZoomFactor, } from '../../base/browser/browser.js';
import { ICommandService, CommandsRegistry } from '../../platform/commands/common/commands.js';
import { ipcRenderer, process } from '../../base/parts/sandbox/electron-sandbox/globals.js';
import { IWorkspaceEditingService } from '../services/workspaces/common/workspaceEditing.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry, } from '../../platform/actions/common/actions.js';
import { getFlatActionBarActions } from '../../platform/actions/browser/menuEntryActionViewItem.js';
import { RunOnceScheduler } from '../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../base/common/lifecycle.js';
import { ILifecycleService, } from '../services/lifecycle/common/lifecycle.js';
import { IIntegrityService } from '../services/integrity/common/integrity.js';
import { isWindows, isMacintosh } from '../../base/common/platform.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { INotificationService, NeverShowAgainScope, NotificationPriority, Severity, } from '../../platform/notification/common/notification.js';
import { IKeybindingService } from '../../platform/keybinding/common/keybinding.js';
import { INativeWorkbenchEnvironmentService } from '../services/environment/electron-sandbox/environmentService.js';
import { IAccessibilityService, } from '../../platform/accessibility/common/accessibility.js';
import { IWorkspaceContextService, } from '../../platform/workspace/common/workspace.js';
import { coalesce } from '../../base/common/arrays.js';
import { IConfigurationService, } from '../../platform/configuration/common/configuration.js';
import { IStorageService, } from '../../platform/storage/common/storage.js';
import { IOpenerService, } from '../../platform/opener/common/opener.js';
import { Schemas } from '../../base/common/network.js';
import { INativeHostService } from '../../platform/native/common/native.js';
import { posix } from '../../base/common/path.js';
import { ITunnelService, extractLocalHostUriMetaDataForPortMapping, extractQueryLocalHostUriMetaDataForPortMapping, } from '../../platform/tunnel/common/tunnel.js';
import { IWorkbenchLayoutService, positionFromString, } from '../services/layout/browser/layoutService.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService } from '../services/filesConfiguration/common/filesConfigurationService.js';
import { Event } from '../../base/common/event.js';
import { IRemoteAuthorityResolverService } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { whenEditorClosed } from '../browser/editor.js';
import { ISharedProcessService } from '../../platform/ipc/electron-sandbox/services.js';
import { IProgressService } from '../../platform/progress/common/progress.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { dirname } from '../../base/common/resources.js';
import { IBannerService } from '../services/banner/browser/bannerService.js';
import { Codicon } from '../../base/common/codicons.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { IPreferencesService } from '../services/preferences/common/preferences.js';
import { IUtilityProcessWorkerWorkbenchService } from '../services/utilityProcess/electron-sandbox/utilityProcessWorkerWorkbenchService.js';
import { registerWindowDriver } from '../services/driver/electron-sandbox/driver.js';
import { mainWindow } from '../../base/browser/window.js';
import { BaseWindow } from '../browser/window.js';
import { IHostService } from '../services/host/browser/host.js';
import { IStatusbarService, ShowTooltipCommand, } from '../services/statusbar/browser/statusbar.js';
import { ActionBar } from '../../base/browser/ui/actionbar/actionbar.js';
import { ThemeIcon } from '../../base/common/themables.js';
import { getWorkbenchContribution } from '../common/contributions.js';
import { DynamicWorkbenchSecurityConfiguration } from '../common/configuration.js';
import { nativeHoverDelegate } from '../../platform/hover/browser/hover.js';
let NativeWindow = NativeWindow_1 = class NativeWindow extends BaseWindow {
    constructor(editorService, editorGroupService, configurationService, titleService, themeService, notificationService, commandService, keybindingService, telemetryService, workspaceEditingService, fileService, menuService, lifecycleService, integrityService, nativeEnvironmentService, accessibilityService, contextService, openerService, nativeHostService, tunnelService, layoutService, workingCopyService, filesConfigurationService, productService, remoteAuthorityResolverService, dialogService, storageService, logService, instantiationService, sharedProcessService, progressService, labelService, bannerService, uriIdentityService, preferencesService, utilityProcessWorkerWorkbenchService, hostService) {
        super(mainWindow, undefined, hostService, nativeEnvironmentService);
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.titleService = titleService;
        this.themeService = themeService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        this.telemetryService = telemetryService;
        this.workspaceEditingService = workspaceEditingService;
        this.fileService = fileService;
        this.menuService = menuService;
        this.lifecycleService = lifecycleService;
        this.integrityService = integrityService;
        this.nativeEnvironmentService = nativeEnvironmentService;
        this.accessibilityService = accessibilityService;
        this.contextService = contextService;
        this.openerService = openerService;
        this.nativeHostService = nativeHostService;
        this.tunnelService = tunnelService;
        this.layoutService = layoutService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.productService = productService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.dialogService = dialogService;
        this.storageService = storageService;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.sharedProcessService = sharedProcessService;
        this.progressService = progressService;
        this.labelService = labelService;
        this.bannerService = bannerService;
        this.uriIdentityService = uriIdentityService;
        this.preferencesService = preferencesService;
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.customTitleContextMenuDisposable = this._register(new DisposableStore());
        this.addRemoveFoldersScheduler = this._register(new RunOnceScheduler(() => this.doAddRemoveFolders(), 100));
        this.pendingFoldersToAdd = [];
        this.pendingFoldersToRemove = [];
        this.isDocumentedEdited = false;
        this.touchBarDisposables = this._register(new DisposableStore());
        //#region Window Zoom
        this.mapWindowIdToZoomStatusEntry = new Map();
        this.configuredWindowZoomLevel = this.resolveConfiguredWindowZoomLevel();
        this.registerListeners();
        this.create();
    }
    registerListeners() {
        // Layout
        this._register(addDisposableListener(mainWindow, EventType.RESIZE, () => this.layoutService.layout()));
        // React to editor input changes
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateTouchbarMenu()));
        // Prevent opening a real URL inside the window
        for (const event of [EventType.DRAG_OVER, EventType.DROP]) {
            this._register(addDisposableListener(mainWindow.document.body, event, (e) => {
                EventHelper.stop(e);
            }));
        }
        // Support `runAction` event
        ipcRenderer.on('vscode:runAction', async (event, request) => {
            const args = request.args || [];
            // If we run an action from the touchbar, we fill in the currently active resource
            // as payload because the touch bar items are context aware depending on the editor
            if (request.from === 'touchbar') {
                const activeEditor = this.editorService.activeEditor;
                if (activeEditor) {
                    const resource = EditorResourceAccessor.getOriginalUri(activeEditor, {
                        supportSideBySide: SideBySideEditor.PRIMARY,
                    });
                    if (resource) {
                        args.push(resource);
                    }
                }
            }
            else {
                args.push({ from: request.from });
            }
            try {
                await this.commandService.executeCommand(request.id, ...args);
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: request.id, from: request.from });
            }
            catch (error) {
                this.notificationService.error(error);
            }
        });
        // Support runKeybinding event
        ipcRenderer.on('vscode:runKeybinding', (event, request) => {
            const activeElement = getActiveElement();
            if (activeElement) {
                this.keybindingService.dispatchByUserSettingsLabel(request.userSettingsLabel, activeElement);
            }
        });
        // Shared Process crash reported from main
        ipcRenderer.on('vscode:reportSharedProcessCrash', (event, error) => {
            this.notificationService.prompt(Severity.Error, localize('sharedProcessCrash', 'A shared background process terminated unexpectedly. Please restart the application to recover.'), [
                {
                    label: localize('restart', 'Restart'),
                    run: () => this.nativeHostService.relaunch(),
                },
            ], {
                priority: NotificationPriority.URGENT,
            });
        });
        // Support openFiles event for existing and new files
        ipcRenderer.on('vscode:openFiles', (event, request) => {
            this.onOpenFiles(request);
        });
        // Support addRemoveFolders event for workspace management
        ipcRenderer.on('vscode:addRemoveFolders', (event, request) => this.onAddRemoveFoldersRequest(request));
        // Message support
        ipcRenderer.on('vscode:showInfoMessage', (event, message) => this.notificationService.info(message));
        // Shell Environment Issue Notifications
        ipcRenderer.on('vscode:showResolveShellEnvError', (event, message) => {
            this.notificationService.prompt(Severity.Error, message, [
                {
                    label: localize('restart', 'Restart'),
                    run: () => this.nativeHostService.relaunch(),
                },
                {
                    label: localize('configure', 'Configure'),
                    run: () => this.preferencesService.openUserSettings({
                        query: 'application.shellEnvironmentResolutionTimeout',
                    }),
                },
                {
                    label: localize('learnMore', 'Learn More'),
                    run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2149667'),
                },
            ]);
        });
        ipcRenderer.on('vscode:showCredentialsError', (event, message) => {
            this.notificationService.prompt(Severity.Error, localize('keychainWriteError', "Writing login information to the keychain failed with error '{0}'.", message), [
                {
                    label: localize('troubleshooting', 'Troubleshooting Guide'),
                    run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2190713'),
                },
            ]);
        });
        ipcRenderer.on('vscode:showTranslatedBuildWarning', () => {
            this.notificationService.prompt(Severity.Warning, localize('runningTranslated', 'You are running an emulated version of {0}. For better performance download the native arm64 version of {0} build for your machine.', this.productService.nameLong), [
                {
                    label: localize('downloadArmBuild', 'Download'),
                    run: () => {
                        const quality = this.productService.quality;
                        const stableURL = 'https://code.visualstudio.com/docs/?dv=osx';
                        const insidersURL = 'https://code.visualstudio.com/docs/?dv=osx&build=insiders';
                        this.openerService.open(quality === 'stable' ? stableURL : insidersURL);
                    },
                },
            ], {
                priority: NotificationPriority.URGENT,
            });
        });
        ipcRenderer.on('vscode:showArgvParseWarning', (event, message) => {
            this.notificationService.prompt(Severity.Warning, localize('showArgvParseWarning', "The runtime arguments file 'argv.json' contains errors. Please correct them and restart."), [
                {
                    label: localize('showArgvParseWarningAction', 'Open File'),
                    run: () => this.editorService.openEditor({
                        resource: this.nativeEnvironmentService.argvResource,
                    }),
                },
            ], {
                priority: NotificationPriority.URGENT,
            });
        });
        // Fullscreen Events
        ipcRenderer.on('vscode:enterFullScreen', () => setFullscreen(true, mainWindow));
        ipcRenderer.on('vscode:leaveFullScreen', () => setFullscreen(false, mainWindow));
        // Proxy Login Dialog
        ipcRenderer.on('vscode:openProxyAuthenticationDialog', async (event, payload) => {
            const rememberCredentialsKey = 'window.rememberProxyCredentials';
            const rememberCredentials = this.storageService.getBoolean(rememberCredentialsKey, -1 /* StorageScope.APPLICATION */);
            const result = await this.dialogService.input({
                type: 'warning',
                message: localize('proxyAuthRequired', 'Proxy Authentication Required'),
                primaryButton: localize({ key: 'loginButton', comment: ['&& denotes a mnemonic'] }, '&&Log In'),
                inputs: [
                    { placeholder: localize('username', 'Username'), value: payload.username },
                    {
                        placeholder: localize('password', 'Password'),
                        type: 'password',
                        value: payload.password,
                    },
                ],
                detail: localize('proxyDetail', 'The proxy {0} requires a username and password.', `${payload.authInfo.host}:${payload.authInfo.port}`),
                checkbox: {
                    label: localize('rememberCredentials', 'Remember my credentials'),
                    checked: rememberCredentials,
                },
            });
            // Reply back to the channel without result to indicate
            // that the login dialog was cancelled
            if (!result.confirmed || !result.values) {
                ipcRenderer.send(payload.replyChannel);
            }
            // Other reply back with the picked credentials
            else {
                // Update state based on checkbox
                if (result.checkboxChecked) {
                    this.storageService.store(rememberCredentialsKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                }
                else {
                    this.storageService.remove(rememberCredentialsKey, -1 /* StorageScope.APPLICATION */);
                }
                // Reply back to main side with credentials
                const [username, password] = result.values;
                ipcRenderer.send(payload.replyChannel, {
                    username,
                    password,
                    remember: !!result.checkboxChecked,
                });
            }
        });
        // Accessibility support changed event
        ipcRenderer.on('vscode:accessibilitySupportChanged', (event, accessibilitySupportEnabled) => {
            this.accessibilityService.setAccessibilitySupport(accessibilitySupportEnabled
                ? 2 /* AccessibilitySupport.Enabled */
                : 1 /* AccessibilitySupport.Disabled */);
        });
        // Allow to update security settings around allowed UNC Host
        ipcRenderer.on('vscode:configureAllowedUNCHost', async (event, host) => {
            if (!isWindows) {
                return; // only supported on Windows
            }
            const allowedUncHosts = new Set();
            const configuredAllowedUncHosts = this.configurationService.getValue('security.allowedUNCHosts') ?? [];
            if (Array.isArray(configuredAllowedUncHosts)) {
                for (const configuredAllowedUncHost of configuredAllowedUncHosts) {
                    if (typeof configuredAllowedUncHost === 'string') {
                        allowedUncHosts.add(configuredAllowedUncHost);
                    }
                }
            }
            if (!allowedUncHosts.has(host)) {
                allowedUncHosts.add(host);
                await getWorkbenchContribution(DynamicWorkbenchSecurityConfiguration.ID).ready; // ensure this setting is registered
                this.configurationService.updateValue('security.allowedUNCHosts', [...allowedUncHosts.values()], 2 /* ConfigurationTarget.USER */);
            }
        });
        // Allow to update security settings around protocol handlers
        ipcRenderer.on('vscode:disablePromptForProtocolHandling', (event, kind) => {
            const setting = kind === 'local'
                ? 'security.promptForLocalFileProtocolHandling'
                : 'security.promptForRemoteFileProtocolHandling';
            this.configurationService.updateValue(setting, false);
        });
        // Window Zoom
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('window.zoomLevel') ||
                (e.affectsConfiguration('window.zoomPerWindow') &&
                    this.configurationService.getValue('window.zoomPerWindow') === false)) {
                this.onDidChangeConfiguredWindowZoomLevel();
            }
            else if (e.affectsConfiguration('keyboard.touchbar.enabled') ||
                e.affectsConfiguration('keyboard.touchbar.ignored')) {
                this.updateTouchbarMenu();
            }
        }));
        this._register(onDidChangeZoomLevel((targetWindowId) => this.handleOnDidChangeZoomLevel(targetWindowId)));
        for (const part of this.editorGroupService.parts) {
            this.createWindowZoomStatusEntry(part);
        }
        this._register(this.editorGroupService.onDidCreateAuxiliaryEditorPart((part) => this.createWindowZoomStatusEntry(part)));
        // Listen to visible editor changes (debounced in case a new editor opens immediately after)
        this._register(Event.debounce(this.editorService.onDidVisibleEditorsChange, () => undefined, 0, undefined, undefined, undefined, this._store)(() => this.maybeCloseWindow()));
        // Listen to editor closing (if we run with --wait)
        const filesToWait = this.nativeEnvironmentService.filesToWait;
        if (filesToWait) {
            this.trackClosedWaitFiles(filesToWait.waitMarkerFileUri, coalesce(filesToWait.paths.map((path) => path.fileUri)));
        }
        // macOS OS integration: represented file name
        if (isMacintosh) {
            for (const part of this.editorGroupService.parts) {
                this.handleRepresentedFilename(part);
            }
            this._register(this.editorGroupService.onDidCreateAuxiliaryEditorPart((part) => this.handleRepresentedFilename(part)));
        }
        // Document edited: indicate for dirty working copies
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => {
            const gotDirty = workingCopy.isDirty();
            if (gotDirty &&
                !(workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) &&
                this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)) {
                return; // do not indicate dirty of working copies that are auto saved after short delay
            }
            this.updateDocumentEdited(gotDirty ? true : undefined);
        }));
        this.updateDocumentEdited(undefined);
        // Detect minimize / maximize
        this._register(Event.any(Event.map(Event.filter(this.nativeHostService.onDidMaximizeWindow, (windowId) => !!hasWindow(windowId)), (windowId) => ({ maximized: true, windowId })), Event.map(Event.filter(this.nativeHostService.onDidUnmaximizeWindow, (windowId) => !!hasWindow(windowId)), (windowId) => ({ maximized: false, windowId })))((e) => this.layoutService.updateWindowMaximizedState(getWindowById(e.windowId).window, e.maximized)));
        this.layoutService.updateWindowMaximizedState(mainWindow, this.nativeEnvironmentService.window.maximized ?? false);
        // Detect panel position to determine minimum width
        this._register(this.layoutService.onDidChangePanelPosition((pos) => this.onDidChangePanelPosition(positionFromString(pos))));
        this.onDidChangePanelPosition(this.layoutService.getPanelPosition());
        // Lifecycle
        this._register(this.lifecycleService.onBeforeShutdown((e) => this.onBeforeShutdown(e)));
        this._register(this.lifecycleService.onBeforeShutdownError((e) => this.onBeforeShutdownError(e)));
        this._register(this.lifecycleService.onWillShutdown((e) => this.onWillShutdown(e)));
    }
    handleRepresentedFilename(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedEditorService = this.editorGroupService
            .getScopedInstantiationService(part)
            .invokeFunction((accessor) => accessor.get(IEditorService));
        disposables.add(scopedEditorService.onDidActiveEditorChange(() => this.updateRepresentedFilename(scopedEditorService, part.windowId)));
    }
    updateRepresentedFilename(editorService, targetWindowId) {
        const file = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
            filterByScheme: Schemas.file,
        });
        // Represented Filename
        this.nativeHostService.setRepresentedFilename(file?.fsPath ?? '', { targetWindowId });
        // Custom title menu (main window only currently)
        if (targetWindowId === mainWindow.vscodeWindowId) {
            this.provideCustomTitleContextMenu(file?.fsPath);
        }
    }
    //#region Window Lifecycle
    onBeforeShutdown({ veto, reason }) {
        if (reason === 1 /* ShutdownReason.CLOSE */) {
            const confirmBeforeCloseSetting = this.configurationService.getValue('window.confirmBeforeClose');
            const confirmBeforeClose = confirmBeforeCloseSetting === 'always' ||
                (confirmBeforeCloseSetting === 'keyboardOnly' &&
                    ModifierKeyEmitter.getInstance().isModifierPressed);
            if (confirmBeforeClose) {
                // When we need to confirm on close or quit, veto the shutdown
                // with a long running promise to figure out whether shutdown
                // can proceed or not.
                return veto((async () => {
                    let actualReason = reason;
                    if (reason === 1 /* ShutdownReason.CLOSE */ && !isMacintosh) {
                        const windowCount = await this.nativeHostService.getWindowCount();
                        if (windowCount === 1) {
                            actualReason = 2 /* ShutdownReason.QUIT */; // Windows/Linux: closing last window means to QUIT
                        }
                    }
                    let confirmed = true;
                    if (confirmBeforeClose) {
                        confirmed = await this.instantiationService.invokeFunction((accessor) => NativeWindow_1.confirmOnShutdown(accessor, actualReason));
                    }
                    // Progress for long running shutdown
                    if (confirmed) {
                        this.progressOnBeforeShutdown(reason);
                    }
                    return !confirmed;
                })(), 'veto.confirmBeforeClose');
            }
        }
        // Progress for long running shutdown
        this.progressOnBeforeShutdown(reason);
    }
    progressOnBeforeShutdown(reason) {
        this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */, // use window progress to not be too annoying about this operation
            delay: 800, // delay so that it only appears when operation takes a long time
            title: this.toShutdownLabel(reason, false),
        }, () => {
            return Event.toPromise(Event.any(this.lifecycleService.onWillShutdown, // dismiss this dialog when we shutdown
            this.lifecycleService.onShutdownVeto, // or when shutdown was vetoed
            this.dialogService.onWillShowDialog));
        });
    }
    onBeforeShutdownError({ error, reason }) {
        this.dialogService.error(this.toShutdownLabel(reason, true), localize('shutdownErrorDetail', 'Error: {0}', toErrorMessage(error)));
    }
    onWillShutdown({ reason, force, joiners }) {
        // Delay so that the dialog only appears after timeout
        const shutdownDialogScheduler = new RunOnceScheduler(() => {
            const pendingJoiners = joiners();
            this.progressService.withProgress({
                location: 20 /* ProgressLocation.Dialog */, // use a dialog to prevent the user from making any more interactions now
                buttons: [this.toForceShutdownLabel(reason)], // allow to force shutdown anyway
                cancellable: false, // do not allow to cancel
                sticky: true, // do not allow to dismiss
                title: this.toShutdownLabel(reason, false),
                detail: pendingJoiners.length > 0
                    ? localize('willShutdownDetail', 'The following operations are still running: \n{0}', pendingJoiners.map((joiner) => `- ${joiner.label}`).join('\n'))
                    : undefined,
            }, () => {
                return Event.toPromise(this.lifecycleService.onDidShutdown); // dismiss this dialog when we actually shutdown
            }, () => {
                force();
            });
        }, 1200);
        shutdownDialogScheduler.schedule();
        // Dispose scheduler when we actually shutdown
        Event.once(this.lifecycleService.onDidShutdown)(() => shutdownDialogScheduler.dispose());
    }
    toShutdownLabel(reason, isError) {
        if (isError) {
            switch (reason) {
                case 1 /* ShutdownReason.CLOSE */:
                    return localize('shutdownErrorClose', 'An unexpected error prevented the window to close');
                case 2 /* ShutdownReason.QUIT */:
                    return localize('shutdownErrorQuit', 'An unexpected error prevented the application to quit');
                case 3 /* ShutdownReason.RELOAD */:
                    return localize('shutdownErrorReload', 'An unexpected error prevented the window to reload');
                case 4 /* ShutdownReason.LOAD */:
                    return localize('shutdownErrorLoad', 'An unexpected error prevented to change the workspace');
            }
        }
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                return localize('shutdownTitleClose', 'Closing the window is taking a bit longer...');
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownTitleQuit', 'Quitting the application is taking a bit longer...');
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownTitleReload', 'Reloading the window is taking a bit longer...');
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownTitleLoad', 'Changing the workspace is taking a bit longer...');
        }
    }
    toForceShutdownLabel(reason) {
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                return localize('shutdownForceClose', 'Close Anyway');
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownForceQuit', 'Quit Anyway');
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownForceReload', 'Reload Anyway');
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownForceLoad', 'Change Anyway');
        }
    }
    //#endregion
    updateDocumentEdited(documentEdited) {
        let setDocumentEdited;
        if (typeof documentEdited === 'boolean') {
            setDocumentEdited = documentEdited;
        }
        else {
            setDocumentEdited = this.workingCopyService.hasDirty;
        }
        if ((!this.isDocumentedEdited && setDocumentEdited) ||
            (this.isDocumentedEdited && !setDocumentEdited)) {
            this.isDocumentedEdited = setDocumentEdited;
            this.nativeHostService.setDocumentEdited(setDocumentEdited);
        }
    }
    getWindowMinimumWidth(panelPosition = this.layoutService.getPanelPosition()) {
        // if panel is on the side, then return the larger minwidth
        const panelOnSide = panelPosition === 0 /* Position.LEFT */ || panelPosition === 1 /* Position.RIGHT */;
        if (panelOnSide) {
            return WindowMinimumSize.WIDTH_WITH_VERTICAL_PANEL;
        }
        return WindowMinimumSize.WIDTH;
    }
    onDidChangePanelPosition(pos) {
        const minWidth = this.getWindowMinimumWidth(pos);
        this.nativeHostService.setMinimumSize(minWidth, undefined);
    }
    maybeCloseWindow() {
        const closeWhenEmpty = this.configurationService.getValue('window.closeWhenEmpty') ||
            this.nativeEnvironmentService.args.wait;
        if (!closeWhenEmpty) {
            return; // return early if configured to not close when empty
        }
        // Close empty editor groups based on setting and environment
        for (const editorPart of this.editorGroupService.parts) {
            if (editorPart.groups.some((group) => !group.isEmpty)) {
                continue; // not empty
            }
            if (editorPart === this.editorGroupService.mainPart &&
                (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ || // only for empty windows
                    this.environmentService.isExtensionDevelopment || // not when developing an extension
                    this.editorService.visibleEditors.length > 0) // not when there are still editors open in other windows
            ) {
                continue;
            }
            if (editorPart === this.editorGroupService.mainPart) {
                this.nativeHostService.closeWindow();
            }
            else {
                editorPart.removeGroup(editorPart.activeGroup);
            }
        }
    }
    provideCustomTitleContextMenu(filePath) {
        // Clear old menu
        this.customTitleContextMenuDisposable.clear();
        // Only provide a menu when we have a file path and custom titlebar
        if (!filePath || hasNativeTitlebar(this.configurationService)) {
            return;
        }
        // Split up filepath into segments
        const segments = filePath.split(posix.sep);
        for (let i = segments.length; i > 0; i--) {
            const isFile = i === segments.length;
            let pathOffset = i;
            if (!isFile) {
                pathOffset++; // for segments which are not the file name we want to open the folder
            }
            const path = URI.file(segments.slice(0, pathOffset).join(posix.sep));
            let label;
            if (!isFile) {
                label = this.labelService.getUriBasenameLabel(dirname(path));
            }
            else {
                label = this.labelService.getUriBasenameLabel(path);
            }
            const commandId = `workbench.action.revealPathInFinder${i}`;
            this.customTitleContextMenuDisposable.add(CommandsRegistry.registerCommand(commandId, () => this.nativeHostService.showItemInFolder(path.fsPath)));
            this.customTitleContextMenuDisposable.add(MenuRegistry.appendMenuItem(MenuId.TitleBarTitleContext, {
                command: { id: commandId, title: label || posix.sep },
                order: -i,
                group: '1_file',
            }));
        }
    }
    create() {
        // Handle open calls
        this.setupOpenHandlers();
        // Notify some services about lifecycle phases
        this.lifecycleService
            .when(2 /* LifecyclePhase.Ready */)
            .then(() => this.nativeHostService.notifyReady());
        this.lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            this.sharedProcessService.notifyRestored();
            this.utilityProcessWorkerWorkbenchService.notifyRestored();
        });
        // Check for situations that are worth warning the user about
        this.handleWarnings();
        // Touchbar menu (if enabled)
        this.updateTouchbarMenu();
        // Smoke Test Driver
        if (this.environmentService.enableSmokeTestDriver) {
            this.setupDriver();
        }
    }
    async handleWarnings() {
        // After restored phase is fine for the following ones
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        (async () => {
            const isAdmin = await this.nativeHostService.isAdmin();
            const { isPure } = await this.integrityService.isPure();
            // Update to title
            this.titleService.updateProperties({ isPure, isAdmin });
            // Show warning message (unix only)
            if (isAdmin && !isWindows) {
                this.notificationService.warn(localize('runningAsRoot', 'It is not recommended to run {0} as root user.', this.productService.nameShort));
            }
        })();
        // Installation Dir Warning
        if (this.environmentService.isBuilt) {
            let installLocationUri;
            if (isMacintosh) {
                // appRoot = /Applications/Visual Studio Code - Insiders.app/Contents/Resources/app
                installLocationUri = dirname(dirname(dirname(URI.file(this.nativeEnvironmentService.appRoot))));
            }
            else {
                // appRoot = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app
                // appRoot = /usr/share/code-insiders/resources/app
                installLocationUri = dirname(dirname(URI.file(this.nativeEnvironmentService.appRoot)));
            }
            for (const folder of this.contextService.getWorkspace().folders) {
                if (this.uriIdentityService.extUri.isEqualOrParent(folder.uri, installLocationUri)) {
                    this.bannerService.show({
                        id: 'appRootWarning.banner',
                        message: localize('appRootWarning.banner', "Files you store within the installation folder ('{0}') may be OVERWRITTEN or DELETED IRREVERSIBLY without warning at update time.", this.labelService.getUriLabel(installLocationUri)),
                        icon: Codicon.warning,
                    });
                    break;
                }
            }
        }
        // macOS 10.15 warning
        if (isMacintosh) {
            const majorVersion = this.nativeEnvironmentService.os.release.split('.')[0];
            const eolReleases = new Map([['19', 'macOS Catalina']]);
            if (eolReleases.has(majorVersion)) {
                const message = localize('macoseolmessage', '{0} on {1} will soon stop receiving updates. Consider upgrading your macOS version.', this.productService.nameLong, eolReleases.get(majorVersion));
                this.notificationService.prompt(Severity.Warning, message, [
                    {
                        label: localize('learnMore', 'Learn More'),
                        run: () => this.openerService.open(URI.parse('https://aka.ms/vscode-faq-old-macOS')),
                    },
                ], {
                    neverShowAgain: {
                        id: 'macoseol',
                        isSecondary: true,
                        scope: NeverShowAgainScope.APPLICATION,
                    },
                    priority: NotificationPriority.URGENT,
                    sticky: true,
                });
            }
        }
        // Slow shell environment progress indicator
        const shellEnv = process.shellEnv();
        this.progressService.withProgress({
            title: localize('resolveShellEnvironment', 'Resolving shell environment...'),
            location: 10 /* ProgressLocation.Window */,
            delay: 1600,
            buttons: [localize('learnMore', 'Learn More')],
        }, () => shellEnv, () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2149667'));
    }
    setupDriver() {
        const that = this;
        let pendingQuit = false;
        registerWindowDriver(this.instantiationService, {
            async exitApplication() {
                if (pendingQuit) {
                    that.logService.info('[driver] not handling exitApplication() due to pending quit() call');
                    return;
                }
                that.logService.info('[driver] handling exitApplication()');
                pendingQuit = true;
                return that.nativeHostService.quit();
            },
        });
    }
    async resolveExternalUri(uri, options) {
        let queryTunnel;
        if (options?.allowTunneling) {
            const portMappingRequest = extractLocalHostUriMetaDataForPortMapping(uri);
            const queryPortMapping = extractQueryLocalHostUriMetaDataForPortMapping(uri);
            if (queryPortMapping) {
                queryTunnel = await this.openTunnel(queryPortMapping.address, queryPortMapping.port);
                if (queryTunnel && typeof queryTunnel !== 'string') {
                    // If the tunnel was mapped to a different port, dispose it, because some services
                    // validate the port number in the query string.
                    if (queryTunnel.tunnelRemotePort !== queryPortMapping.port) {
                        queryTunnel.dispose();
                        queryTunnel = undefined;
                    }
                    else {
                        if (!portMappingRequest) {
                            const tunnel = queryTunnel;
                            return {
                                resolved: uri,
                                dispose: () => tunnel.dispose(),
                            };
                        }
                    }
                }
            }
            if (portMappingRequest) {
                const tunnel = await this.openTunnel(portMappingRequest.address, portMappingRequest.port);
                if (tunnel && typeof tunnel !== 'string') {
                    const addressAsUri = URI.parse(tunnel.localAddress).with({ path: uri.path });
                    const resolved = addressAsUri.scheme.startsWith(uri.scheme)
                        ? addressAsUri
                        : uri.with({ authority: tunnel.localAddress });
                    return {
                        resolved,
                        dispose() {
                            tunnel.dispose();
                            if (queryTunnel && typeof queryTunnel !== 'string') {
                                queryTunnel.dispose();
                            }
                        },
                    };
                }
            }
        }
        if (!options?.openExternal) {
            const canHandleResource = await this.fileService.canHandleResource(uri);
            if (canHandleResource) {
                return {
                    resolved: URI.from({
                        scheme: this.productService.urlProtocol,
                        path: 'workspace',
                        query: uri.toString(),
                    }),
                    dispose() { },
                };
            }
        }
        return undefined;
    }
    async openTunnel(address, port) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        const addressProvider = remoteAuthority
            ? {
                getAddress: async () => {
                    return (await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority))
                        .authority;
                },
            }
            : undefined;
        const tunnel = await this.tunnelService.getExistingTunnel(address, port);
        if (!tunnel || typeof tunnel === 'string') {
            return this.tunnelService.openTunnel(addressProvider, address, port);
        }
        return tunnel;
    }
    setupOpenHandlers() {
        // Handle external open() calls
        this.openerService.setDefaultExternalOpener({
            openExternal: async (href) => {
                const success = await this.nativeHostService.openExternal(href, this.configurationService.getValue('workbench.externalBrowser'));
                if (!success) {
                    const fileCandidate = URI.parse(href);
                    if (fileCandidate.scheme === Schemas.file) {
                        // if opening failed, and this is a file, we can still try to reveal it
                        await this.nativeHostService.showItemInFolder(fileCandidate.fsPath);
                    }
                }
                return true;
            },
        });
        // Register external URI resolver
        this.openerService.registerExternalUriResolver({
            resolveExternalUri: async (uri, options) => {
                return this.resolveExternalUri(uri, options);
            },
        });
    }
    updateTouchbarMenu() {
        if (!isMacintosh) {
            return; // macOS only
        }
        // Dispose old
        this.touchBarDisposables.clear();
        this.touchBarMenu = undefined;
        // Create new (delayed)
        const scheduler = this.touchBarDisposables.add(new RunOnceScheduler(() => this.doUpdateTouchbarMenu(scheduler), 300));
        scheduler.schedule();
    }
    doUpdateTouchbarMenu(scheduler) {
        if (!this.touchBarMenu) {
            const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService ||
                this.editorGroupService.activeGroup.scopedContextKeyService;
            this.touchBarMenu = this.menuService.createMenu(MenuId.TouchBarContext, scopedContextKeyService);
            this.touchBarDisposables.add(this.touchBarMenu);
            this.touchBarDisposables.add(this.touchBarMenu.onDidChange(() => scheduler.schedule()));
        }
        const disabled = this.configurationService.getValue('keyboard.touchbar.enabled') === false;
        const touchbarIgnored = this.configurationService.getValue('keyboard.touchbar.ignored');
        const ignoredItems = Array.isArray(touchbarIgnored) ? touchbarIgnored : [];
        // Fill actions into groups respecting order
        const actions = getFlatActionBarActions(this.touchBarMenu.getActions());
        // Convert into command action multi array
        const items = [];
        let group = [];
        if (!disabled) {
            for (const action of actions) {
                // Command
                if (action instanceof MenuItemAction) {
                    if (ignoredItems.indexOf(action.item.id) >= 0) {
                        continue; // ignored
                    }
                    group.push(action.item);
                }
                // Separator
                else if (action instanceof Separator) {
                    if (group.length) {
                        items.push(group);
                    }
                    group = [];
                }
            }
            if (group.length) {
                items.push(group);
            }
        }
        // Only update if the actions have changed
        if (!equals(this.lastInstalledTouchedBar, items)) {
            this.lastInstalledTouchedBar = items;
            this.nativeHostService.updateTouchBar(items);
        }
    }
    //#endregion
    onAddRemoveFoldersRequest(request) {
        // Buffer all pending requests
        this.pendingFoldersToAdd.push(...request.foldersToAdd.map((folder) => URI.revive(folder)));
        this.pendingFoldersToRemove.push(...request.foldersToRemove.map((folder) => URI.revive(folder)));
        // Delay the adding of folders a bit to buffer in case more requests are coming
        if (!this.addRemoveFoldersScheduler.isScheduled()) {
            this.addRemoveFoldersScheduler.schedule();
        }
    }
    async doAddRemoveFolders() {
        const foldersToAdd = this.pendingFoldersToAdd.map((folder) => ({
            uri: folder,
        }));
        const foldersToRemove = this.pendingFoldersToRemove.slice(0);
        this.pendingFoldersToAdd = [];
        this.pendingFoldersToRemove = [];
        if (foldersToAdd.length) {
            await this.workspaceEditingService.addFolders(foldersToAdd);
        }
        if (foldersToRemove.length) {
            await this.workspaceEditingService.removeFolders(foldersToRemove);
        }
    }
    async onOpenFiles(request) {
        const diffMode = !!(request.filesToDiff && request.filesToDiff.length === 2);
        const mergeMode = !!(request.filesToMerge && request.filesToMerge.length === 4);
        const inputs = coalesce(await pathsToEditors(mergeMode
            ? request.filesToMerge
            : diffMode
                ? request.filesToDiff
                : request.filesToOpenOrCreate, this.fileService, this.logService));
        if (inputs.length) {
            const openedEditorPanes = await this.openResources(inputs, diffMode, mergeMode);
            if (request.filesToWait) {
                // In wait mode, listen to changes to the editors and wait until the files
                // are closed that the user wants to wait for. When this happens we delete
                // the wait marker file to signal to the outside that editing is done.
                // However, it is possible that opening of the editors failed, as such we
                // check for whether editor panes got opened and otherwise delete the marker
                // right away.
                if (openedEditorPanes.length) {
                    return this.trackClosedWaitFiles(URI.revive(request.filesToWait.waitMarkerFileUri), coalesce(request.filesToWait.paths.map((path) => URI.revive(path.fileUri))));
                }
                else {
                    return this.fileService.del(URI.revive(request.filesToWait.waitMarkerFileUri));
                }
            }
        }
    }
    async trackClosedWaitFiles(waitMarkerFile, resourcesToWaitFor) {
        // Wait for the resources to be closed in the text editor...
        await this.instantiationService.invokeFunction((accessor) => whenEditorClosed(accessor, resourcesToWaitFor));
        // ...before deleting the wait marker file
        await this.fileService.del(waitMarkerFile);
    }
    async openResources(resources, diffMode, mergeMode) {
        const editors = [];
        if (mergeMode &&
            isResourceEditorInput(resources[0]) &&
            isResourceEditorInput(resources[1]) &&
            isResourceEditorInput(resources[2]) &&
            isResourceEditorInput(resources[3])) {
            const mergeEditor = {
                input1: { resource: resources[0].resource },
                input2: { resource: resources[1].resource },
                base: { resource: resources[2].resource },
                result: { resource: resources[3].resource },
                options: { pinned: true },
            };
            editors.push(mergeEditor);
        }
        else if (diffMode &&
            isResourceEditorInput(resources[0]) &&
            isResourceEditorInput(resources[1])) {
            const diffEditor = {
                original: { resource: resources[0].resource },
                modified: { resource: resources[1].resource },
                options: { pinned: true },
            };
            editors.push(diffEditor);
        }
        else {
            editors.push(...resources);
        }
        return this.editorService.openEditors(editors, undefined, { validateTrust: true });
    }
    resolveConfiguredWindowZoomLevel() {
        const windowZoomLevel = this.configurationService.getValue('window.zoomLevel');
        return typeof windowZoomLevel === 'number' ? windowZoomLevel : 0;
    }
    handleOnDidChangeZoomLevel(targetWindowId) {
        // Zoom status entry
        this.updateWindowZoomStatusEntry(targetWindowId);
        // Notify main process about a custom zoom level
        if (targetWindowId === mainWindow.vscodeWindowId) {
            const currentWindowZoomLevel = getZoomLevel(mainWindow);
            let notifyZoomLevel = undefined;
            if (this.configuredWindowZoomLevel !== currentWindowZoomLevel) {
                notifyZoomLevel = currentWindowZoomLevel;
            }
            ipcRenderer.invoke('vscode:notifyZoomLevel', notifyZoomLevel);
        }
    }
    createWindowZoomStatusEntry(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        this.mapWindowIdToZoomStatusEntry.set(part.windowId, disposables.add(scopedInstantiationService.createInstance(ZoomStatusEntry)));
        disposables.add(toDisposable(() => this.mapWindowIdToZoomStatusEntry.delete(part.windowId)));
        this.updateWindowZoomStatusEntry(part.windowId);
    }
    updateWindowZoomStatusEntry(targetWindowId) {
        const targetWindow = getWindowById(targetWindowId);
        const entry = this.mapWindowIdToZoomStatusEntry.get(targetWindowId);
        if (entry && targetWindow) {
            const currentZoomLevel = getZoomLevel(targetWindow.window);
            let text = undefined;
            if (currentZoomLevel < this.configuredWindowZoomLevel) {
                text = '$(zoom-out)';
            }
            else if (currentZoomLevel > this.configuredWindowZoomLevel) {
                text = '$(zoom-in)';
            }
            entry.updateZoomEntry(text ?? false, targetWindowId);
        }
    }
    onDidChangeConfiguredWindowZoomLevel() {
        this.configuredWindowZoomLevel = this.resolveConfiguredWindowZoomLevel();
        let applyZoomLevel = false;
        for (const { window } of getWindows()) {
            if (getZoomLevel(window) !== this.configuredWindowZoomLevel) {
                applyZoomLevel = true;
                break;
            }
        }
        if (applyZoomLevel) {
            applyZoom(this.configuredWindowZoomLevel, ApplyZoomTarget.ALL_WINDOWS);
        }
        for (const [windowId] of this.mapWindowIdToZoomStatusEntry) {
            this.updateWindowZoomStatusEntry(windowId);
        }
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, entry] of this.mapWindowIdToZoomStatusEntry) {
            entry.dispose();
        }
    }
};
NativeWindow = NativeWindow_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ITitleService),
    __param(4, IWorkbenchThemeService),
    __param(5, INotificationService),
    __param(6, ICommandService),
    __param(7, IKeybindingService),
    __param(8, ITelemetryService),
    __param(9, IWorkspaceEditingService),
    __param(10, IFileService),
    __param(11, IMenuService),
    __param(12, ILifecycleService),
    __param(13, IIntegrityService),
    __param(14, INativeWorkbenchEnvironmentService),
    __param(15, IAccessibilityService),
    __param(16, IWorkspaceContextService),
    __param(17, IOpenerService),
    __param(18, INativeHostService),
    __param(19, ITunnelService),
    __param(20, IWorkbenchLayoutService),
    __param(21, IWorkingCopyService),
    __param(22, IFilesConfigurationService),
    __param(23, IProductService),
    __param(24, IRemoteAuthorityResolverService),
    __param(25, IDialogService),
    __param(26, IStorageService),
    __param(27, ILogService),
    __param(28, IInstantiationService),
    __param(29, ISharedProcessService),
    __param(30, IProgressService),
    __param(31, ILabelService),
    __param(32, IBannerService),
    __param(33, IUriIdentityService),
    __param(34, IPreferencesService),
    __param(35, IUtilityProcessWorkerWorkbenchService),
    __param(36, IHostService)
], NativeWindow);
export { NativeWindow };
let ZoomStatusEntry = class ZoomStatusEntry extends Disposable {
    constructor(statusbarService, commandService, keybindingService) {
        super();
        this.statusbarService = statusbarService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        this.disposable = this._register(new MutableDisposable());
        this.zoomLevelLabel = undefined;
    }
    updateZoomEntry(visibleOrText, targetWindowId) {
        if (typeof visibleOrText === 'string') {
            if (!this.disposable.value) {
                this.createZoomEntry(visibleOrText);
            }
            this.updateZoomLevelLabel(targetWindowId);
        }
        else {
            this.disposable.clear();
        }
    }
    createZoomEntry(visibleOrText) {
        const disposables = new DisposableStore();
        this.disposable.value = disposables;
        const container = $('.zoom-status');
        const left = $('.zoom-status-left');
        container.appendChild(left);
        const zoomOutAction = disposables.add(new Action('workbench.action.zoomOut', localize('zoomOut', 'Zoom Out'), ThemeIcon.asClassName(Codicon.remove), true, () => this.commandService.executeCommand(zoomOutAction.id)));
        const zoomInAction = disposables.add(new Action('workbench.action.zoomIn', localize('zoomIn', 'Zoom In'), ThemeIcon.asClassName(Codicon.plus), true, () => this.commandService.executeCommand(zoomInAction.id)));
        const zoomResetAction = disposables.add(new Action('workbench.action.zoomReset', localize('zoomReset', 'Reset'), undefined, true, () => this.commandService.executeCommand(zoomResetAction.id)));
        zoomResetAction.tooltip = localize('zoomResetLabel', '{0} ({1})', zoomResetAction.label, this.keybindingService.lookupKeybinding(zoomResetAction.id)?.getLabel());
        const zoomSettingsAction = disposables.add(new Action('workbench.action.openSettings', localize('zoomSettings', 'Settings'), ThemeIcon.asClassName(Codicon.settingsGear), true, () => this.commandService.executeCommand(zoomSettingsAction.id, 'window.zoom')));
        const zoomLevelLabel = disposables.add(new Action('zoomLabel', undefined, undefined, false));
        this.zoomLevelLabel = zoomLevelLabel;
        disposables.add(toDisposable(() => (this.zoomLevelLabel = undefined)));
        const actionBarLeft = disposables.add(new ActionBar(left, { hoverDelegate: nativeHoverDelegate }));
        actionBarLeft.push(zoomOutAction, {
            icon: true,
            label: false,
            keybinding: this.keybindingService.lookupKeybinding(zoomOutAction.id)?.getLabel(),
        });
        actionBarLeft.push(this.zoomLevelLabel, { icon: false, label: true });
        actionBarLeft.push(zoomInAction, {
            icon: true,
            label: false,
            keybinding: this.keybindingService.lookupKeybinding(zoomInAction.id)?.getLabel(),
        });
        const right = $('.zoom-status-right');
        container.appendChild(right);
        const actionBarRight = disposables.add(new ActionBar(right, { hoverDelegate: nativeHoverDelegate }));
        actionBarRight.push(zoomResetAction, { icon: false, label: true });
        actionBarRight.push(zoomSettingsAction, {
            icon: true,
            label: false,
            keybinding: this.keybindingService.lookupKeybinding(zoomSettingsAction.id)?.getLabel(),
        });
        const name = localize('status.windowZoom', 'Window Zoom');
        disposables.add(this.statusbarService.addEntry({
            name,
            text: visibleOrText,
            tooltip: container,
            ariaLabel: name,
            command: ShowTooltipCommand,
            kind: 'prominent',
        }, 'status.windowZoom', 1 /* StatusbarAlignment.RIGHT */, 102));
    }
    updateZoomLevelLabel(targetWindowId) {
        if (this.zoomLevelLabel) {
            const targetWindow = getWindowById(targetWindowId, true).window;
            const zoomFactor = Math.round(getZoomFactor(targetWindow) * 100);
            const zoomLevel = getZoomLevel(targetWindow);
            this.zoomLevelLabel.label = `${zoomLevel}`;
            this.zoomLevelLabel.tooltip = localize('zoomNumber', 'Zoom Level: {0} ({1}%)', zoomLevel, zoomFactor);
        }
    }
};
ZoomStatusEntry = __decorate([
    __param(0, IStatusbarService),
    __param(1, ICommandService),
    __param(2, IKeybindingService)
], ZoomStatusEntry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sU0FBUyxFQUNULFdBQVcsRUFDWCxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsYUFBYSxFQUNiLFVBQVUsRUFDVixDQUFDLEdBQ0QsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04sTUFBTSxFQUNOLFNBQVMsR0FHVCxNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLGdCQUFnQixFQUNoQixjQUFjLEVBSWQscUJBQXFCLEdBRXJCLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixpQkFBaUIsRUFNakIsaUJBQWlCLEdBQ2pCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNGLE9BQU8s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