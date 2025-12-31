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
import { EventType } from '../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore, dispose, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { isMacintosh, OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import * as nls from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITunnelService } from '../../../../../platform/tunnel/common/tunnel.js';
import { TerminalExternalLinkDetector } from './terminalExternalLinkDetector.js';
import { TerminalLinkDetectorAdapter } from './terminalLinkDetectorAdapter.js';
import { TerminalLocalFileLinkOpener, TerminalLocalFolderInWorkspaceLinkOpener, TerminalLocalFolderOutsideWorkspaceLinkOpener, TerminalSearchLinkOpener, TerminalUrlLinkOpener, } from './terminalLinkOpeners.js';
import { TerminalLocalLinkDetector } from './terminalLocalLinkDetector.js';
import { TerminalUriLinkDetector } from './terminalUriLinkDetector.js';
import { TerminalWordLinkDetector } from './terminalWordLinkDetector.js';
import { ITerminalConfigurationService, TerminalLinkQuickPickEvent, } from '../../../terminal/browser/terminal.js';
import { TerminalHover, } from '../../../terminal/browser/widgets/terminalHoverWidget.js';
import { TERMINAL_CONFIG_SECTION, } from '../../../terminal/common/terminal.js';
import { convertBufferRangeToViewport } from './terminalLinkHelpers.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { TerminalMultiLineLinkDetector } from './terminalMultiLineLinkDetector.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
/**
 * An object responsible for managing registration of link matchers and link providers.
 */
let TerminalLinkManager = class TerminalLinkManager extends DisposableStore {
    constructor(_xterm, _processInfo, capabilities, _linkResolver, _configurationService, _instantiationService, notificationService, terminalConfigurationService, _logService, _tunnelService) {
        super();
        this._xterm = _xterm;
        this._processInfo = _processInfo;
        this._linkResolver = _linkResolver;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._tunnelService = _tunnelService;
        this._standardLinkProviders = new Map();
        this._linkProvidersDisposables = [];
        this._externalLinkProviders = [];
        this._openers = new Map();
        let enableFileLinks = true;
        const enableFileLinksConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).enableFileLinks;
        switch (enableFileLinksConfig) {
            case 'off':
            case false: // legacy from v1.75
                enableFileLinks = false;
                break;
            case 'notRemote':
                enableFileLinks = !this._processInfo.remoteAuthority;
                break;
        }
        // Setup link detectors in their order of priority
        if (enableFileLinks) {
            this._setupLinkDetector(TerminalMultiLineLinkDetector.id, this._instantiationService.createInstance(TerminalMultiLineLinkDetector, this._xterm, this._processInfo, this._linkResolver));
            this._setupLinkDetector(TerminalLocalLinkDetector.id, this._instantiationService.createInstance(TerminalLocalLinkDetector, this._xterm, capabilities, this._processInfo, this._linkResolver));
        }
        this._setupLinkDetector(TerminalUriLinkDetector.id, this._instantiationService.createInstance(TerminalUriLinkDetector, this._xterm, this._processInfo, this._linkResolver));
        this._setupLinkDetector(TerminalWordLinkDetector.id, this.add(this._instantiationService.createInstance(TerminalWordLinkDetector, this._xterm)));
        // Setup link openers
        const localFileOpener = this._instantiationService.createInstance(TerminalLocalFileLinkOpener);
        const localFolderInWorkspaceOpener = this._instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
        this._openers.set("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, localFileOpener);
        this._openers.set("LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */, localFolderInWorkspaceOpener);
        this._openers.set("LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */, this._instantiationService.createInstance(TerminalLocalFolderOutsideWorkspaceLinkOpener));
        this._openers.set("Search" /* TerminalBuiltinLinkType.Search */, this._instantiationService.createInstance(TerminalSearchLinkOpener, capabilities, this._processInfo.initialCwd, localFileOpener, localFolderInWorkspaceOpener, () => this._processInfo.os || OS));
        this._openers.set("Url" /* TerminalBuiltinLinkType.Url */, this._instantiationService.createInstance(TerminalUrlLinkOpener, !!this._processInfo.remoteAuthority));
        this._registerStandardLinkProviders();
        let activeHoverDisposable;
        let activeTooltipScheduler;
        this.add(toDisposable(() => {
            this._clearLinkProviders();
            dispose(this._externalLinkProviders);
            activeHoverDisposable?.dispose();
            activeTooltipScheduler?.dispose();
        }));
        this._xterm.options.linkHandler = {
            allowNonHttpProtocols: true,
            activate: (event, text) => {
                if (!this._isLinkActivationModifierDown(event)) {
                    return;
                }
                const colonIndex = text.indexOf(':');
                if (colonIndex === -1) {
                    throw new Error(`Could not find scheme in link "${text}"`);
                }
                const scheme = text.substring(0, colonIndex);
                if (terminalConfigurationService.config.allowedLinkSchemes.indexOf(scheme) === -1) {
                    notificationService.prompt(Severity.Warning, nls.localize('scheme', 'Opening URIs can be insecure, do you want to allow opening links with the scheme {0}?', scheme), [
                        {
                            label: nls.localize('allow', 'Allow {0}', scheme),
                            run: () => {
                                const allowedLinkSchemes = [
                                    ...terminalConfigurationService.config.allowedLinkSchemes,
                                    scheme,
                                ];
                                this._configurationService.updateValue(`terminal.integrated.allowedLinkSchemes`, allowedLinkSchemes);
                            },
                        },
                    ]);
                }
                this._openers.get("Url" /* TerminalBuiltinLinkType.Url */)?.open({
                    type: "Url" /* TerminalBuiltinLinkType.Url */,
                    text,
                    bufferRange: null,
                    uri: URI.parse(text),
                });
            },
            hover: (e, text, range) => {
                activeHoverDisposable?.dispose();
                activeHoverDisposable = undefined;
                activeTooltipScheduler?.dispose();
                activeTooltipScheduler = new RunOnceScheduler(() => {
                    const core = this._xterm._core;
                    const cellDimensions = {
                        width: core._renderService.dimensions.css.cell.width,
                        height: core._renderService.dimensions.css.cell.height,
                    };
                    const terminalDimensions = {
                        width: this._xterm.cols,
                        height: this._xterm.rows,
                    };
                    activeHoverDisposable = this._showHover({
                        viewportRange: convertBufferRangeToViewport(range, this._xterm.buffer.active.viewportY),
                        cellDimensions,
                        terminalDimensions,
                    }, this._getLinkHoverString(text, text), undefined, (text) => this._xterm.options.linkHandler?.activate(e, text, range));
                    // Clear out scheduler until next hover event
                    activeTooltipScheduler?.dispose();
                    activeTooltipScheduler = undefined;
                }, this._configurationService.getValue('workbench.hover.delay'));
                activeTooltipScheduler.schedule();
            },
        };
    }
    _setupLinkDetector(id, detector, isExternal = false) {
        const detectorAdapter = this.add(this._instantiationService.createInstance(TerminalLinkDetectorAdapter, detector));
        this.add(detectorAdapter.onDidActivateLink((e) => {
            // Prevent default electron link handling so Alt+Click mode works normally
            e.event?.preventDefault();
            // Require correct modifier on click unless event is coming from linkQuickPick selection
            if (e.event &&
                !(e.event instanceof TerminalLinkQuickPickEvent) &&
                !this._isLinkActivationModifierDown(e.event)) {
                return;
            }
            // Just call the handler if there is no before listener
            if (e.link.activate) {
                // Custom activate call (external links only)
                e.link.activate(e.link.text);
            }
            else {
                this._openLink(e.link);
            }
        }));
        this.add(detectorAdapter.onDidShowHover((e) => this._tooltipCallback(e.link, e.viewportRange, e.modifierDownCallback, e.modifierUpCallback)));
        if (!isExternal) {
            this._standardLinkProviders.set(id, detectorAdapter);
        }
        return detectorAdapter;
    }
    async _openLink(link) {
        this._logService.debug('Opening link', link);
        const opener = this._openers.get(link.type);
        if (!opener) {
            throw new Error(`No matching opener for link type "${link.type}"`);
        }
        await opener.open(link);
    }
    async openRecentLink(type) {
        let links;
        let i = this._xterm.buffer.active.length;
        while ((!links || links.length === 0) && i >= this._xterm.buffer.active.viewportY) {
            links = await this._getLinksForType(i, type);
            i--;
        }
        if (!links || links.length < 1) {
            return undefined;
        }
        const event = new TerminalLinkQuickPickEvent(EventType.CLICK);
        links[0].activate(event, links[0].text);
        return links[0];
    }
    async getLinks() {
        // Fetch and await the viewport results
        const viewportLinksByLinePromises = [];
        for (let i = this._xterm.buffer.active.viewportY + this._xterm.rows - 1; i >= this._xterm.buffer.active.viewportY; i--) {
            viewportLinksByLinePromises.push(this._getLinksForLine(i));
        }
        const viewportLinksByLine = await Promise.all(viewportLinksByLinePromises);
        // Assemble viewport links
        const viewportLinks = {
            wordLinks: [],
            webLinks: [],
            fileLinks: [],
            folderLinks: [],
        };
        for (const links of viewportLinksByLine) {
            if (links) {
                const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                if (wordLinks?.length) {
                    viewportLinks.wordLinks.push(...wordLinks.reverse());
                }
                if (webLinks?.length) {
                    viewportLinks.webLinks.push(...webLinks.reverse());
                }
                if (fileLinks?.length) {
                    viewportLinks.fileLinks.push(...fileLinks.reverse());
                }
                if (folderLinks?.length) {
                    viewportLinks.folderLinks.push(...folderLinks.reverse());
                }
            }
        }
        // Fetch the remaining results async
        const aboveViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.viewportY - 1; i >= 0; i--) {
            aboveViewportLinksPromises.push(this._getLinksForLine(i));
        }
        const belowViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.length - 1; i >= this._xterm.buffer.active.viewportY + this._xterm.rows; i--) {
            belowViewportLinksPromises.push(this._getLinksForLine(i));
        }
        // Assemble all links in results
        const allLinks = Promise.all(aboveViewportLinksPromises).then(async (aboveViewportLinks) => {
            const belowViewportLinks = await Promise.all(belowViewportLinksPromises);
            const allResults = {
                wordLinks: [...viewportLinks.wordLinks],
                webLinks: [...viewportLinks.webLinks],
                fileLinks: [...viewportLinks.fileLinks],
                folderLinks: [...viewportLinks.folderLinks],
            };
            for (const links of [...belowViewportLinks, ...aboveViewportLinks]) {
                if (links) {
                    const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                    if (wordLinks?.length) {
                        allResults.wordLinks.push(...wordLinks.reverse());
                    }
                    if (webLinks?.length) {
                        allResults.webLinks.push(...webLinks.reverse());
                    }
                    if (fileLinks?.length) {
                        allResults.fileLinks.push(...fileLinks.reverse());
                    }
                    if (folderLinks?.length) {
                        allResults.folderLinks.push(...folderLinks.reverse());
                    }
                }
            }
            return allResults;
        });
        return {
            viewport: viewportLinks,
            all: allLinks,
        };
    }
    async _getLinksForLine(y) {
        const unfilteredWordLinks = await this._getLinksForType(y, 'word');
        const webLinks = await this._getLinksForType(y, 'url');
        const fileLinks = await this._getLinksForType(y, 'localFile');
        const folderLinks = await this._getLinksForType(y, 'localFolder');
        const words = new Set();
        let wordLinks;
        if (unfilteredWordLinks) {
            wordLinks = [];
            for (const link of unfilteredWordLinks) {
                if (!words.has(link.text) && link.text.length > 1) {
                    wordLinks.push(link);
                    words.add(link.text);
                }
            }
        }
        return { wordLinks, webLinks, fileLinks, folderLinks };
    }
    async _getLinksForType(y, type) {
        switch (type) {
            case 'word':
                return await new Promise((r) => this._standardLinkProviders.get(TerminalWordLinkDetector.id)?.provideLinks(y, r));
            case 'url':
                return await new Promise((r) => this._standardLinkProviders.get(TerminalUriLinkDetector.id)?.provideLinks(y, r));
            case 'localFile': {
                const links = await new Promise((r) => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r));
                return links?.filter((link) => link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */);
            }
            case 'localFolder': {
                const links = await new Promise((r) => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r));
                return links?.filter((link) => link.type === "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */);
            }
        }
    }
    _tooltipCallback(link, viewportRange, modifierDownCallback, modifierUpCallback) {
        if (!this._widgetManager) {
            return;
        }
        const core = this._xterm._core;
        const cellDimensions = {
            width: core._renderService.dimensions.css.cell.width,
            height: core._renderService.dimensions.css.cell.height,
        };
        const terminalDimensions = {
            width: this._xterm.cols,
            height: this._xterm.rows,
        };
        // Don't pass the mouse event as this avoids the modifier check
        this._showHover({
            viewportRange,
            cellDimensions,
            terminalDimensions,
            modifierDownCallback,
            modifierUpCallback,
        }, this._getLinkHoverString(link.text, link.label), link.actions, (text) => link.activate(undefined, text), link);
    }
    _showHover(targetOptions, text, actions, linkHandler, link) {
        if (this._widgetManager) {
            const widget = this._instantiationService.createInstance(TerminalHover, targetOptions, text, actions, linkHandler);
            const attached = this._widgetManager.attachWidget(widget);
            if (attached) {
                link?.onInvalidated(() => attached.dispose());
            }
            return attached;
        }
        return undefined;
    }
    setWidgetManager(widgetManager) {
        this._widgetManager = widgetManager;
    }
    _clearLinkProviders() {
        dispose(this._linkProvidersDisposables);
        this._linkProvidersDisposables.length = 0;
    }
    _registerStandardLinkProviders() {
        // Forward any external link provider requests to the registered provider if it exists. This
        // helps maintain the relative priority of the link providers as it's defined by the order
        // in which they're registered in xterm.js.
        //
        /**
         * There's a bit going on here but here's another view:
         * - {@link externalProvideLinksCb} The external callback that gives the links (eg. from
         *   exthost)
         * - {@link proxyLinkProvider} A proxy that forwards the call over to
         *   {@link externalProvideLinksCb}
         * - {@link wrappedLinkProvider} Wraps the above in an `TerminalLinkDetectorAdapter`
         */
        const proxyLinkProvider = async (bufferLineNumber) => {
            return this.externalProvideLinksCb?.(bufferLineNumber);
        };
        const detectorId = `extension-${this._externalLinkProviders.length}`;
        const wrappedLinkProvider = this._setupLinkDetector(detectorId, new TerminalExternalLinkDetector(detectorId, this._xterm, proxyLinkProvider), true);
        this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(wrappedLinkProvider));
        for (const p of this._standardLinkProviders.values()) {
            this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(p));
        }
    }
    _isLinkActivationModifierDown(event) {
        const editorConf = this._configurationService.getValue('editor');
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            return !!event.altKey;
        }
        return isMacintosh ? event.metaKey : event.ctrlKey;
    }
    _getLinkHoverString(uri, label) {
        const editorConf = this._configurationService.getValue('editor');
        let clickLabel = '';
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt.mac', 'option + click');
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt', 'alt + click');
            }
        }
        else {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCmd', 'cmd + click');
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCtrl', 'ctrl + click');
            }
        }
        let fallbackLabel = nls.localize('followLink', 'Follow link');
        try {
            if (this._tunnelService.canTunnel(URI.parse(uri))) {
                fallbackLabel = nls.localize('followForwardedLink', 'Follow link using forwarded port');
            }
        }
        catch {
            // No-op, already set to fallback
        }
        const markdown = new MarkdownString('', true);
        // Escapes markdown in label & uri
        if (label) {
            label = markdown.appendText(label).value;
            markdown.value = '';
        }
        if (uri) {
            uri = markdown.appendText(uri).value;
            markdown.value = '';
        }
        label = label || fallbackLabel;
        // Use the label when uri is '' so the link displays correctly
        uri = uri || label;
        // Although if there is a space in the uri, just replace it completely
        if (/(\s|&nbsp;)/.test(uri)) {
            uri = nls.localize('followLinkUrl', 'Link');
        }
        return markdown.appendLink(uri, label).appendMarkdown(` (${clickLabel})`);
    }
};
TerminalLinkManager = __decorate([
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, INotificationService),
    __param(7, ITerminalConfigurationService),
    __param(8, ITerminalLogService),
    __param(9, ITunnelService)
], TerminalLinkManager);
export { TerminalLinkManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEVBRVAsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFVaEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFaEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3Q0FBd0MsRUFDeEMsNkNBQTZDLEVBQzdDLHdCQUF3QixFQUN4QixxQkFBcUIsR0FDckIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sNkJBQTZCLEVBRTdCLDBCQUEwQixHQUMxQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFFTixhQUFhLEdBQ2IsTUFBTSwwREFBMEQsQ0FBQTtBQUlqRSxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSw2REFBNkQsQ0FBQTtBQUtwRTs7R0FFRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsZUFBZTtJQVN2RCxZQUNrQixNQUFnQixFQUNoQixZQUFrQyxFQUNuRCxZQUFzQyxFQUNyQixhQUFvQyxFQUM5QixxQkFBNkQsRUFDN0QscUJBQTZELEVBQzlELG1CQUF5QyxFQUNoQyw0QkFBMkQsRUFDckUsV0FBaUQsRUFDdEQsY0FBK0M7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFYVSxXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ2hCLGlCQUFZLEdBQVosWUFBWSxDQUFzQjtRQUVsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDYiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFHOUMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBQ3JDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQWpCL0MsMkJBQXNCLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDOUQsOEJBQXlCLEdBQWtCLEVBQUUsQ0FBQTtRQUM3QywyQkFBc0IsR0FBa0IsRUFBRSxDQUFBO1FBQzFDLGFBQVEsR0FBK0MsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQWtCaEYsSUFBSSxlQUFlLEdBQVksSUFBSSxDQUFBO1FBQ25DLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FDaEUsdUJBQXVCLENBQ3ZCLENBQUMsZUFBc0UsQ0FBQTtRQUN4RSxRQUFRLHFCQUFxQixFQUFFLENBQUM7WUFDL0IsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLEtBQUssRUFBRSxvQkFBb0I7Z0JBQy9CLGVBQWUsR0FBRyxLQUFLLENBQUE7Z0JBQ3ZCLE1BQUs7WUFDTixLQUFLLFdBQVc7Z0JBQ2YsZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUE7Z0JBQ3BELE1BQUs7UUFDUCxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGtCQUFrQixDQUN0Qiw2QkFBNkIsQ0FBQyxFQUFFLEVBQ2hDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3hDLDZCQUE2QixFQUM3QixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyxhQUFhLENBQ2xCLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIseUJBQXlCLENBQUMsRUFBRSxFQUM1QixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN4Qyx5QkFBeUIsRUFDekIsSUFBSSxDQUFDLE1BQU0sRUFDWCxZQUFZLEVBQ1osSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFDLGFBQWEsQ0FDbEIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsdUJBQXVCLENBQUMsRUFBRSxFQUMxQixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN4Qyx1QkFBdUIsRUFDdkIsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsWUFBWSxFQUNqQixJQUFJLENBQUMsYUFBYSxDQUNsQixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLHdCQUF3QixDQUFDLEVBQUUsRUFDM0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUMxRixDQUFBO1FBRUQscUJBQXFCO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM5RixNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzdFLHdDQUF3QyxDQUN4QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLHNEQUFvQyxlQUFlLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsZ0ZBQWlELDRCQUE0QixDQUFDLENBQUE7UUFDL0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLDBGQUVoQixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLDZDQUE2QyxDQUFDLENBQ3hGLENBQUE7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsZ0RBRWhCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3hDLHdCQUF3QixFQUN4QixZQUFZLEVBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQzVCLGVBQWUsRUFDZiw0QkFBNEIsRUFDNUIsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUNoQyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsMENBRWhCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3hDLHFCQUFxQixFQUNyQixDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQ25DLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBRXJDLElBQUkscUJBQThDLENBQUE7UUFDbEQsSUFBSSxzQkFBb0QsQ0FBQTtRQUN4RCxJQUFJLENBQUMsR0FBRyxDQUNQLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3BDLHFCQUFxQixFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ2hDLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUc7WUFDakMscUJBQXFCLEVBQUUsSUFBSTtZQUMzQixRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDaEQsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3BDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLElBQUksR0FBRyxDQUFDLENBQUE7Z0JBQzNELENBQUM7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQzVDLElBQUksNEJBQTRCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNuRixtQkFBbUIsQ0FBQyxNQUFNLENBQ3pCLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsUUFBUSxFQUNSLHVGQUF1RixFQUN2RixNQUFNLENBQ04sRUFDRDt3QkFDQzs0QkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQzs0QkFDakQsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQ0FDVCxNQUFNLGtCQUFrQixHQUFHO29DQUMxQixHQUFHLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7b0NBQ3pELE1BQU07aUNBQ04sQ0FBQTtnQ0FDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUNyQyx3Q0FBd0MsRUFDeEMsa0JBQWtCLENBQ2xCLENBQUE7NEJBQ0YsQ0FBQzt5QkFDRDtxQkFDRCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcseUNBQTZCLEVBQUUsSUFBSSxDQUFDO29CQUNwRCxJQUFJLHlDQUE2QjtvQkFDakMsSUFBSTtvQkFDSixXQUFXLEVBQUUsSUFBSztvQkFDbEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2lCQUNwQixDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDekIscUJBQXFCLEVBQUUsT0FBTyxFQUFFLENBQUE7Z0JBQ2hDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtnQkFDakMsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUE7Z0JBQ2pDLHNCQUFzQixHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO29CQUNsRCxNQUFNLElBQUksR0FBSSxJQUFJLENBQUMsTUFBYyxDQUFDLEtBQW1CLENBQUE7b0JBQ3JELE1BQU0sY0FBYyxHQUFHO3dCQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO3dCQUNwRCxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNO3FCQUN0RCxDQUFBO29CQUNELE1BQU0sa0JBQWtCLEdBQUc7d0JBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7d0JBQ3ZCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7cUJBQ3hCLENBQUE7b0JBQ0QscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FDdEM7d0JBQ0MsYUFBYSxFQUFFLDRCQUE0QixDQUMxQyxLQUFLLEVBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDbkM7d0JBQ0QsY0FBYzt3QkFDZCxrQkFBa0I7cUJBQ2xCLEVBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDcEMsU0FBUyxFQUNULENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQ25FLENBQUE7b0JBQ0QsNkNBQTZDO29CQUM3QyxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDakMsc0JBQXNCLEdBQUcsU0FBUyxDQUFBO2dCQUNuQyxDQUFDLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hFLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ2xDLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUN6QixFQUFVLEVBQ1YsUUFBK0IsRUFDL0IsYUFBc0IsS0FBSztRQUUzQixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUMvQixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUNoRixDQUFBO1FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FDUCxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2QywwRUFBMEU7WUFDMUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQTtZQUN6Qix3RkFBd0Y7WUFDeEYsSUFDQyxDQUFDLENBQUMsS0FBSztnQkFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSwwQkFBMEIsQ0FBQztnQkFDaEQsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUMzQyxDQUFDO2dCQUNGLE9BQU07WUFDUCxDQUFDO1lBQ0QsdURBQXVEO1lBQ3ZELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDckIsNkNBQTZDO2dCQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxHQUFHLENBQ1AsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDcEIsQ0FBQyxDQUFDLElBQUksRUFDTixDQUFDLENBQUMsYUFBYSxFQUNmLENBQUMsQ0FBQyxvQkFBb0IsRUFDdEIsQ0FBQyxDQUFDLGtCQUFrQixDQUNwQixDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBeUI7UUFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBQ0QsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQXlCO1FBQzdDLElBQUksS0FBSyxDQUFBO1FBQ1QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtRQUN4QyxPQUFPLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25GLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUMsQ0FBQyxFQUFFLENBQUE7UUFDSixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3RCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRO1FBQ2IsdUNBQXVDO1FBQ3ZDLE1BQU0sMkJBQTJCLEdBQTBDLEVBQUUsQ0FBQTtRQUM3RSxLQUNDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUNsRSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDeEMsQ0FBQyxFQUFFLEVBQ0YsQ0FBQztZQUNGLDJCQUEyQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUUxRSwwQkFBMEI7UUFDMUIsTUFBTSxhQUFhLEdBRWY7WUFDSCxTQUFTLEVBQUUsRUFBRTtZQUNiLFFBQVEsRUFBRSxFQUFFO1lBQ1osU0FBUyxFQUFFLEVBQUU7WUFDYixXQUFXLEVBQUUsRUFBRTtTQUNmLENBQUE7UUFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFBO2dCQUM3RCxJQUFJLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDckQsQ0FBQztnQkFDRCxJQUFJLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdEIsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDbkQsQ0FBQztnQkFDRCxJQUFJLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDckQsQ0FBQztnQkFDRCxJQUFJLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDekIsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDekQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sMEJBQTBCLEdBQTBDLEVBQUUsQ0FBQTtRQUM1RSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUNELE1BQU0sMEJBQTBCLEdBQTBDLEVBQUUsQ0FBQTtRQUM1RSxLQUNDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUM1QyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFDM0QsQ0FBQyxFQUFFLEVBQ0YsQ0FBQztZQUNGLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsZ0NBQWdDO1FBQ2hDLE1BQU0sUUFBUSxHQUVWLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEVBQUU7WUFDN0UsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUN4RSxNQUFNLFVBQVUsR0FFWjtnQkFDSCxTQUFTLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZDLFFBQVEsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQztnQkFDckMsU0FBUyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO2dCQUN2QyxXQUFXLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUM7YUFDM0MsQ0FBQTtZQUNELEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLGtCQUFrQixFQUFFLEdBQUcsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUE7b0JBQzdELElBQUksU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO3dCQUN2QixVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUNsRCxDQUFDO29CQUNELElBQUksUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDO3dCQUN0QixVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUNoRCxDQUFDO29CQUNELElBQUksU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO3dCQUN2QixVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUNsRCxDQUFDO29CQUNELElBQUksV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDO3dCQUN6QixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUN0RCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxVQUFVLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPO1lBQ04sUUFBUSxFQUFFLGFBQWE7WUFDdkIsR0FBRyxFQUFFLFFBQVE7U0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFTO1FBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDN0QsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7UUFDdkIsSUFBSSxTQUFTLENBQUE7UUFDYixJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsU0FBUyxHQUFHLEVBQUUsQ0FBQTtZQUNkLEtBQUssTUFBTSxJQUFJLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNuRCxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNwQixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDckIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQ3ZELENBQUM7SUFFUyxLQUFLLENBQUMsZ0JBQWdCLENBQy9CLENBQVMsRUFDVCxJQUFrRDtRQUVsRCxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxNQUFNO2dCQUNWLE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNuRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2hGLENBQUE7WUFDRixLQUFLLEtBQUs7Z0JBQ1QsT0FBTyxNQUFNLElBQUksT0FBTyxDQUFzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ25ELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDL0UsQ0FBQTtZQUNGLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMxRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2pGLENBQUE7Z0JBQ0QsT0FBTyxLQUFLLEVBQUUsTUFBTSxDQUNuQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUUsSUFBcUIsQ0FBQyxJQUFJLHdEQUFzQyxDQUMzRSxDQUFBO1lBQ0YsQ0FBQztZQUNELEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMxRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2pGLENBQUE7Z0JBQ0QsT0FBTyxLQUFLLEVBQUUsTUFBTSxDQUNuQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUUsSUFBcUIsQ0FBQyxJQUFJLGtGQUFtRCxDQUN4RixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLElBQWtCLEVBQ2xCLGFBQTZCLEVBQzdCLG9CQUFpQyxFQUNqQyxrQkFBK0I7UUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFJLElBQUksQ0FBQyxNQUFjLENBQUMsS0FBbUIsQ0FBQTtRQUNyRCxNQUFNLGNBQWMsR0FBRztZQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQ3BELE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU07U0FDdEQsQ0FBQTtRQUNELE1BQU0sa0JBQWtCLEdBQUc7WUFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO1NBQ3hCLENBQUE7UUFFRCwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFVBQVUsQ0FDZDtZQUNDLGFBQWE7WUFDYixjQUFjO1lBQ2Qsa0JBQWtCO1lBQ2xCLG9CQUFvQjtZQUNwQixrQkFBa0I7U0FDbEIsRUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQy9DLElBQUksQ0FBQyxPQUFPLEVBQ1osQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUN4QyxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUM7SUFFTyxVQUFVLENBQ2pCLGFBQXNDLEVBQ3RDLElBQXFCLEVBQ3JCLE9BQW1DLEVBQ25DLFdBQWtDLEVBQ2xDLElBQW1CO1FBRW5CLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3ZELGFBQWEsRUFDYixhQUFhLEVBQ2IsSUFBSSxFQUNKLE9BQU8sRUFDUCxXQUFXLENBQ1gsQ0FBQTtZQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxhQUFvQztRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sOEJBQThCO1FBQ3JDLDRGQUE0RjtRQUM1RiwwRkFBMEY7UUFDMUYsMkNBQTJDO1FBQzNDLEVBQUU7UUFDRjs7Ozs7OztXQU9HO1FBQ0gsTUFBTSxpQkFBaUIsR0FBZ0UsS0FBSyxFQUMzRixnQkFBZ0IsRUFDZixFQUFFO1lBQ0gsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZELENBQUMsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLGFBQWEsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3BFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUNsRCxVQUFVLEVBQ1YsSUFBSSw0QkFBNEIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUM1RSxJQUFJLENBQ0osQ0FBQTtRQUNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFFMUYsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RSxDQUFDO0lBQ0YsQ0FBQztJQUVTLDZCQUE2QixDQUFDLEtBQWlCO1FBQ3hELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBRW5ELFFBQVEsQ0FBQyxDQUFBO1FBQ1osSUFBSSxVQUFVLENBQUMsbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEQsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUN0QixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUE7SUFDbkQsQ0FBQztJQUVPLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxLQUF5QjtRQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUVuRCxRQUFRLENBQUMsQ0FBQTtRQUVaLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUNuQixJQUFJLFVBQVUsQ0FBQyxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsRCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3JGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUM5RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDaEYsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGFBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUM7WUFDSixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxhQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsaUNBQWlDO1FBQ2xDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Msa0NBQWtDO1FBQ2xDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDeEMsUUFBUSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDcEIsQ0FBQztRQUNELElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxHQUFHLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDcEMsUUFBUSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDcEIsQ0FBQztRQUVELEtBQUssR0FBRyxLQUFLLElBQUksYUFBYSxDQUFBO1FBQzlCLDhEQUE4RDtRQUM5RCxHQUFHLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQTtRQUNsQixzRUFBc0U7UUFDdEUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLENBQUE7SUFDMUUsQ0FBQztDQUNELENBQUE7QUF2akJZLG1CQUFtQjtJQWM3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLDZCQUE2QixDQUFBO0lBQzdCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxjQUFjLENBQUE7R0FuQkosbUJBQW1CLENBdWpCL0IifQ==