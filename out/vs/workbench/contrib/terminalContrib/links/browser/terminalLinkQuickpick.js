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
import { Emitter, Event } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import { IQuickInputService, QuickInputHideReason, } from '../../../../../platform/quickinput/common/quickInput.js';
import { TerminalLinkQuickPickEvent, } from '../../../terminal/browser/terminal.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Sequencer, timeout } from '../../../../../base/common/async.js';
import { PickerEditorState } from '../../../../browser/quickaccess.js';
import { getLinkSuffix } from './terminalLinkParsing.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IAccessibleViewService, } from '../../../../../platform/accessibility/browser/accessibleView.js';
let TerminalLinkQuickpick = class TerminalLinkQuickpick extends DisposableStore {
    constructor(_accessibleViewService, instantiationService, _labelService, _quickInputService) {
        super();
        this._accessibleViewService = _accessibleViewService;
        this._labelService = _labelService;
        this._quickInputService = _quickInputService;
        this._editorSequencer = new Sequencer();
        this._onDidRequestMoreLinks = this.add(new Emitter());
        this.onDidRequestMoreLinks = this._onDidRequestMoreLinks.event;
        this._terminalScrollStateSaved = false;
        this._editorViewState = this.add(instantiationService.createInstance(PickerEditorState));
    }
    async show(instance, links) {
        this._instance = instance;
        // Allow all links a small amount of time to elapse to finish, if this is not done in this
        // time they will be loaded upon the first filter.
        const result = await Promise.race([links.all, timeout(500)]);
        const usingAllLinks = typeof result === 'object';
        const resolvedLinks = usingAllLinks ? result : links.viewport;
        // Get raw link picks
        const wordPicks = resolvedLinks.wordLinks
            ? await this._generatePicks(resolvedLinks.wordLinks)
            : undefined;
        const filePicks = resolvedLinks.fileLinks
            ? await this._generatePicks(resolvedLinks.fileLinks)
            : undefined;
        const folderPicks = resolvedLinks.folderLinks
            ? await this._generatePicks(resolvedLinks.folderLinks)
            : undefined;
        const webPicks = resolvedLinks.webLinks
            ? await this._generatePicks(resolvedLinks.webLinks)
            : undefined;
        const picks = [];
        if (webPicks) {
            picks.push({ type: 'separator', label: localize('terminal.integrated.urlLinks', 'Url') });
            picks.push(...webPicks);
        }
        if (filePicks) {
            picks.push({
                type: 'separator',
                label: localize('terminal.integrated.localFileLinks', 'File'),
            });
            picks.push(...filePicks);
        }
        if (folderPicks) {
            picks.push({
                type: 'separator',
                label: localize('terminal.integrated.localFolderLinks', 'Folder'),
            });
            picks.push(...folderPicks);
        }
        if (wordPicks) {
            picks.push({
                type: 'separator',
                label: localize('terminal.integrated.searchLinks', 'Workspace Search'),
            });
            picks.push(...wordPicks);
        }
        // Create and show quick pick
        const pick = this._quickInputService.createQuickPick({ useSeparators: true });
        const disposables = new DisposableStore();
        disposables.add(pick);
        pick.items = picks;
        pick.placeholder = localize('terminal.integrated.openDetectedLink', 'Select the link to open, type to filter all links');
        pick.sortByLabel = false;
        pick.show();
        if (pick.activeItems.length > 0) {
            this._previewItem(pick.activeItems[0]);
        }
        // Show all results only when filtering begins, this is done so the quick pick will show up
        // ASAP with only the viewport entries.
        let accepted = false;
        if (!usingAllLinks) {
            disposables.add(Event.once(pick.onDidChangeValue)(async () => {
                const allLinks = await links.all;
                if (accepted) {
                    return;
                }
                const wordIgnoreLinks = [
                    ...(allLinks.fileLinks ?? []),
                    ...(allLinks.folderLinks ?? []),
                    ...(allLinks.webLinks ?? []),
                ];
                const wordPicks = allLinks.wordLinks
                    ? await this._generatePicks(allLinks.wordLinks, wordIgnoreLinks)
                    : undefined;
                const filePicks = allLinks.fileLinks
                    ? await this._generatePicks(allLinks.fileLinks)
                    : undefined;
                const folderPicks = allLinks.folderLinks
                    ? await this._generatePicks(allLinks.folderLinks)
                    : undefined;
                const webPicks = allLinks.webLinks
                    ? await this._generatePicks(allLinks.webLinks)
                    : undefined;
                const picks = [];
                if (webPicks) {
                    picks.push({
                        type: 'separator',
                        label: localize('terminal.integrated.urlLinks', 'Url'),
                    });
                    picks.push(...webPicks);
                }
                if (filePicks) {
                    picks.push({
                        type: 'separator',
                        label: localize('terminal.integrated.localFileLinks', 'File'),
                    });
                    picks.push(...filePicks);
                }
                if (folderPicks) {
                    picks.push({
                        type: 'separator',
                        label: localize('terminal.integrated.localFolderLinks', 'Folder'),
                    });
                    picks.push(...folderPicks);
                }
                if (wordPicks) {
                    picks.push({
                        type: 'separator',
                        label: localize('terminal.integrated.searchLinks', 'Workspace Search'),
                    });
                    picks.push(...wordPicks);
                }
                pick.items = picks;
            }));
        }
        disposables.add(pick.onDidChangeActive(async () => {
            const [item] = pick.activeItems;
            this._previewItem(item);
        }));
        return new Promise((r) => {
            disposables.add(pick.onDidHide(({ reason }) => {
                // Restore terminal scroll state
                if (this._terminalScrollStateSaved) {
                    const markTracker = this._instance?.xterm?.markTracker;
                    if (markTracker) {
                        markTracker.restoreScrollState();
                        markTracker.clear();
                        this._terminalScrollStateSaved = false;
                    }
                }
                // Restore view state upon cancellation if we changed it
                // but only when the picker was closed via explicit user
                // gesture and not e.g. when focus was lost because that
                // could mean the user clicked into the editor directly.
                if (reason === QuickInputHideReason.Gesture) {
                    this._editorViewState.restore();
                }
                disposables.dispose();
                if (pick.selectedItems.length === 0) {
                    this._accessibleViewService.showLastProvider("terminal" /* AccessibleViewProviderId.Terminal */);
                }
                r();
            }));
            disposables.add(Event.once(pick.onDidAccept)(() => {
                // Restore terminal scroll state
                if (this._terminalScrollStateSaved) {
                    const markTracker = this._instance?.xterm?.markTracker;
                    if (markTracker) {
                        markTracker.restoreScrollState();
                        markTracker.clear();
                        this._terminalScrollStateSaved = false;
                    }
                }
                accepted = true;
                const event = new TerminalLinkQuickPickEvent(EventType.CLICK);
                const activeItem = pick.activeItems?.[0];
                if (activeItem && 'link' in activeItem) {
                    activeItem.link.activate(event, activeItem.label);
                }
                disposables.dispose();
                r();
            }));
        });
    }
    /**
     * @param ignoreLinks Links with labels to not include in the picks.
     */
    async _generatePicks(links, ignoreLinks) {
        if (!links) {
            return;
        }
        const linkTextKeys = new Set();
        const linkUriKeys = new Set();
        const picks = [];
        for (const link of links) {
            let label = link.text;
            if (!linkTextKeys.has(label) &&
                (!ignoreLinks || !ignoreLinks.some((e) => e.text === label))) {
                linkTextKeys.add(label);
                // Add a consistently formatted resolved URI label to the description if applicable
                let description;
                if ('uri' in link && link.uri) {
                    // For local files and folders, mimic the presentation of go to file
                    if (link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */ ||
                        link.type === "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */ ||
                        link.type === "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */) {
                        label = basenameOrAuthority(link.uri);
                        description = this._labelService.getUriLabel(dirname(link.uri), { relative: true });
                    }
                    // Add line and column numbers to the label if applicable
                    if (link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */) {
                        if (link.parsedLink?.suffix?.row !== undefined) {
                            label += `:${link.parsedLink.suffix.row}`;
                            if (link.parsedLink?.suffix?.rowEnd !== undefined) {
                                label += `-${link.parsedLink.suffix.rowEnd}`;
                            }
                            if (link.parsedLink?.suffix?.col !== undefined) {
                                label += `:${link.parsedLink.suffix.col}`;
                                if (link.parsedLink?.suffix?.colEnd !== undefined) {
                                    label += `-${link.parsedLink.suffix.colEnd}`;
                                }
                            }
                        }
                    }
                    // Skip the link if it's a duplicate URI + line/col
                    if (linkUriKeys.has(label + '|' + (description ?? ''))) {
                        continue;
                    }
                    linkUriKeys.add(label + '|' + (description ?? ''));
                }
                picks.push({ label, link, description });
            }
        }
        return picks.length > 0 ? picks : undefined;
    }
    _previewItem(item) {
        if (!item || !('link' in item) || !item.link) {
            return;
        }
        // Any link can be previewed in the termninal
        const link = item.link;
        this._previewItemInTerminal(link);
        if (!('uri' in link) || !link.uri) {
            return;
        }
        if (link.type !== "LocalFile" /* TerminalBuiltinLinkType.LocalFile */) {
            return;
        }
        this._previewItemInEditor(link);
    }
    _previewItemInEditor(link) {
        const linkSuffix = link.parsedLink ? link.parsedLink.suffix : getLinkSuffix(link.text);
        const selection = linkSuffix?.row === undefined
            ? undefined
            : {
                startLineNumber: linkSuffix.row ?? 1,
                startColumn: linkSuffix.col ?? 1,
                endLineNumber: linkSuffix.rowEnd,
                endColumn: linkSuffix.colEnd,
            };
        this._editorViewState.set();
        this._editorSequencer.queue(async () => {
            await this._editorViewState.openTransientEditor({
                resource: link.uri,
                options: { preserveFocus: true, revealIfOpened: true, ignoreError: true, selection },
            });
        });
    }
    _previewItemInTerminal(link) {
        const xterm = this._instance?.xterm;
        if (!xterm) {
            return;
        }
        if (!this._terminalScrollStateSaved) {
            xterm.markTracker.saveScrollState();
            this._terminalScrollStateSaved = true;
        }
        xterm.markTracker.revealRange(link.range);
    }
};
TerminalLinkQuickpick = __decorate([
    __param(0, IAccessibleViewService),
    __param(1, IInstantiationService),
    __param(2, ILabelService),
    __param(3, IQuickInputService)
], TerminalLinkQuickpick);
export { TerminalLinkQuickpick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rUXVpY2twaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sa0JBQWtCLEVBRWxCLG9CQUFvQixHQUNwQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFDTiwwQkFBMEIsR0FHMUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0saUVBQWlFLENBQUE7QUFFakUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FB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