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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtRdWlja3BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFFTixrQkFBa0IsRUFFbEIsb0JBQW9CLEdBQ3BCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUNOLDBCQUEwQixHQUcxQixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFFTixzQkFBc0IsR0FDdEIsTUFBTSxpRUFBaUUsQ0FBQTtBQUVqRSxJQUFNLHFCQUFx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