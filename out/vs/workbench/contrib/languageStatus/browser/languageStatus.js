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
var LanguageStatus_1;
import './media/languageStatus.css';
import * as dom from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService, } from '../../../services/languageStatus/common/languageStatusService.js';
import { IStatusbarService, ShowTooltipCommand, } from '../../../services/statusbar/browser/statusbar.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { equals } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IHoverService, nativeHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { Event } from '../../../../base/common/event.js';
import { joinStrings } from '../../../../base/common/strings.js';
class LanguageStatusViewModel {
    constructor(combined, dedicated) {
        this.combined = combined;
        this.dedicated = dedicated;
    }
    isEqual(other) {
        return equals(this.combined, other.combined) && equals(this.dedicated, other.dedicated);
    }
}
let StoredCounter = class StoredCounter {
    constructor(_storageService, _key) {
        this._storageService = _storageService;
        this._key = _key;
    }
    get value() {
        return this._storageService.getNumber(this._key, 0 /* StorageScope.PROFILE */, 0);
    }
    increment() {
        const n = this.value + 1;
        this._storageService.store(this._key, n, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return n;
    }
};
StoredCounter = __decorate([
    __param(0, IStorageService)
], StoredCounter);
let LanguageStatusContribution = class LanguageStatusContribution extends Disposable {
    static { this.Id = 'status.languageStatus'; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        for (const part of editorGroupService.parts) {
            this.createLanguageStatus(part);
        }
        this._register(editorGroupService.onDidCreateAuxiliaryEditorPart((part) => this.createLanguageStatus(part)));
    }
    createLanguageStatus(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        disposables.add(scopedInstantiationService.createInstance(LanguageStatus));
    }
};
LanguageStatusContribution = __decorate([
    __param(0, IEditorGroupsService)
], LanguageStatusContribution);
export { LanguageStatusContribution };
let LanguageStatus = class LanguageStatus {
    static { LanguageStatus_1 = this; }
    static { this._id = 'status.languageStatus'; }
    static { this._keyDedicatedItems = 'languageStatus.dedicated'; }
    constructor(_languageStatusService, _statusBarService, _editorService, _hoverService, _openerService, _storageService) {
        this._languageStatusService = _languageStatusService;
        this._statusBarService = _statusBarService;
        this._editorService = _editorService;
        this._hoverService = _hoverService;
        this._openerService = _openerService;
        this._storageService = _storageService;
        this._disposables = new DisposableStore();
        this._dedicated = new Set();
        this._dedicatedEntries = new Map();
        this._renderDisposables = new DisposableStore();
        this._combinedEntryTooltip = document.createElement('div');
        _storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, LanguageStatus_1._keyDedicatedItems, this._disposables)(this._handleStorageChange, this, this._disposables);
        this._restoreState();
        this._interactionCounter = new StoredCounter(_storageService, 'languageStatus.interactCount');
        _languageStatusService.onDidChange(this._update, this, this._disposables);
        _editorService.onDidActiveEditorChange(this._update, this, this._disposables);
        this._update();
        _statusBarService.onDidChangeEntryVisibility((e) => {
            if (!e.visible && this._dedicated.has(e.id)) {
                this._dedicated.delete(e.id);
                this._update();
                this._storeState();
            }
        }, undefined, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
        this._combinedEntry?.dispose();
        dispose(this._dedicatedEntries.values());
        this._renderDisposables.dispose();
    }
    // --- persisting dedicated items
    _handleStorageChange() {
        this._restoreState();
        this._update();
    }
    _restoreState() {
        const raw = this._storageService.get(LanguageStatus_1._keyDedicatedItems, 0 /* StorageScope.PROFILE */, '[]');
        try {
            const ids = JSON.parse(raw);
            this._dedicated = new Set(ids);
        }
        catch {
            this._dedicated.clear();
        }
    }
    _storeState() {
        if (this._dedicated.size === 0) {
            this._storageService.remove(LanguageStatus_1._keyDedicatedItems, 0 /* StorageScope.PROFILE */);
        }
        else {
            const raw = JSON.stringify(Array.from(this._dedicated.keys()));
            this._storageService.store(LanguageStatus_1._keyDedicatedItems, raw, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    // --- language status model and UI
    _createViewModel(editor) {
        if (!editor?.hasModel()) {
            return new LanguageStatusViewModel([], []);
        }
        const all = this._languageStatusService.getLanguageStatus(editor.getModel());
        const combined = [];
        const dedicated = [];
        for (const item of all) {
            if (this._dedicated.has(item.id)) {
                dedicated.push(item);
            }
            combined.push(item);
        }
        return new LanguageStatusViewModel(combined, dedicated);
    }
    _update() {
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        const model = this._createViewModel(editor);
        if (this._model?.isEqual(model)) {
            return;
        }
        this._renderDisposables.clear();
        this._model = model;
        // update when editor language changes
        editor?.onDidChangeModelLanguage(this._update, this, this._renderDisposables);
        // combined status bar item is a single item which hover shows
        // each status item
        if (model.combined.length === 0) {
            // nothing
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        else {
            const [first] = model.combined;
            const showSeverity = first.severity >= Severity.Warning;
            const text = LanguageStatus_1._severityToComboCodicon(first.severity);
            let isOneBusy = false;
            const ariaLabels = [];
            for (const status of model.combined) {
                const isPinned = model.dedicated.includes(status);
                this._renderStatus(this._combinedEntryTooltip, status, showSeverity, isPinned, this._renderDisposables);
                ariaLabels.push(LanguageStatus_1._accessibilityInformation(status).label);
                isOneBusy = isOneBusy || (!isPinned && status.busy); // unpinned items contribute to the busy-indicator of the composite status item
            }
            const props = {
                name: localize('langStatus.name', 'Editor Language Status'),
                ariaLabel: localize('langStatus.aria', 'Editor Language Status: {0}', ariaLabels.join(', next: ')),
                tooltip: this._combinedEntryTooltip,
                command: ShowTooltipCommand,
                text: isOneBusy ? '$(loading~spin)' : text,
            };
            if (!this._combinedEntry) {
                this._combinedEntry = this._statusBarService.addEntry(props, LanguageStatus_1._id, 1 /* StatusbarAlignment.RIGHT */, {
                    location: { id: 'status.editor.mode', priority: 100.1 },
                    alignment: 0 /* StatusbarAlignment.LEFT */,
                    compact: true,
                });
            }
            else {
                this._combinedEntry.update(props);
            }
            // animate the status bar icon whenever language status changes, repeat animation
            // when severity is warning or error, don't show animation when showing progress/busy
            const userHasInteractedWithStatus = this._interactionCounter.value >= 3;
            const targetWindow = dom.getWindow(editor?.getContainerDomNode());
            const node = targetWindow.document.querySelector('.monaco-workbench .statusbar DIV#status\\.languageStatus A>SPAN.codicon');
            const container = targetWindow.document.querySelector('.monaco-workbench .statusbar DIV#status\\.languageStatus');
            if (dom.isHTMLElement(node) && container) {
                const _wiggle = 'wiggle';
                const _flash = 'flash';
                if (!isOneBusy) {
                    // wiggle icon when severe or "new"
                    node.classList.toggle(_wiggle, showSeverity || !userHasInteractedWithStatus);
                    this._renderDisposables.add(dom.addDisposableListener(node, 'animationend', (_e) => node.classList.remove(_wiggle)));
                    // flash background when severe
                    container.classList.toggle(_flash, showSeverity);
                    this._renderDisposables.add(dom.addDisposableListener(container, 'animationend', (_e) => container.classList.remove(_flash)));
                }
                else {
                    node.classList.remove(_wiggle);
                    container.classList.remove(_flash);
                }
            }
            // track when the hover shows (this is automagic and DOM mutation spying is needed...)
            //  use that as signal that the user has interacted/learned language status items work
            if (!userHasInteractedWithStatus) {
                const hoverTarget = targetWindow.document.querySelector('.monaco-workbench .context-view');
                if (dom.isHTMLElement(hoverTarget)) {
                    const observer = new MutationObserver(() => {
                        if (targetWindow.document.contains(this._combinedEntryTooltip)) {
                            this._interactionCounter.increment();
                            observer.disconnect();
                        }
                    });
                    observer.observe(hoverTarget, { childList: true, subtree: true });
                    this._renderDisposables.add(toDisposable(() => observer.disconnect()));
                }
            }
        }
        // dedicated status bar items are shows as-is in the status bar
        const newDedicatedEntries = new Map();
        for (const status of model.dedicated) {
            const props = LanguageStatus_1._asStatusbarEntry(status);
            let entry = this._dedicatedEntries.get(status.id);
            if (!entry) {
                entry = this._statusBarService.addEntry(props, status.id, 1 /* StatusbarAlignment.RIGHT */, {
                    location: { id: 'status.editor.mode', priority: 100.1 },
                    alignment: 1 /* StatusbarAlignment.RIGHT */,
                });
            }
            else {
                entry.update(props);
                this._dedicatedEntries.delete(status.id);
            }
            newDedicatedEntries.set(status.id, entry);
        }
        dispose(this._dedicatedEntries.values());
        this._dedicatedEntries = newDedicatedEntries;
    }
    _renderStatus(container, status, showSeverity, isPinned, store) {
        const parent = document.createElement('div');
        parent.classList.add('hover-language-status');
        container.appendChild(parent);
        store.add(toDisposable(() => parent.remove()));
        const severity = document.createElement('div');
        severity.classList.add('severity', `sev${status.severity}`);
        severity.classList.toggle('show', showSeverity);
        const severityText = LanguageStatus_1._severityToSingleCodicon(status.severity);
        dom.append(severity, ...renderLabelWithIcons(severityText));
        parent.appendChild(severity);
        const element = document.createElement('div');
        element.classList.add('element');
        parent.appendChild(element);
        const left = document.createElement('div');
        left.classList.add('left');
        element.appendChild(left);
        const label = document.createElement('span');
        label.classList.add('label');
        const labelValue = typeof status.label === 'string' ? status.label : status.label.value;
        dom.append(label, ...renderLabelWithIcons(computeText(labelValue, status.busy)));
        left.appendChild(label);
        const detail = document.createElement('span');
        detail.classList.add('detail');
        this._renderTextPlus(detail, status.detail, store);
        left.appendChild(detail);
        const right = document.createElement('div');
        right.classList.add('right');
        element.appendChild(right);
        // -- command (if available)
        const { command } = status;
        if (command) {
            store.add(new Link(right, {
                label: command.title,
                title: command.tooltip,
                href: URI.from({
                    scheme: 'command',
                    path: command.id,
                    query: command.arguments && JSON.stringify(command.arguments),
                }).toString(),
            }, { hoverDelegate: nativeHoverDelegate }, this._hoverService, this._openerService));
        }
        // -- pin
        const actionBar = new ActionBar(right, { hoverDelegate: nativeHoverDelegate });
        const actionLabel = isPinned
            ? localize('unpin', 'Remove from Status Bar')
            : localize('pin', 'Add to Status Bar');
        actionBar.setAriaLabel(actionLabel);
        store.add(actionBar);
        let action;
        if (!isPinned) {
            action = new Action('pin', actionLabel, ThemeIcon.asClassName(Codicon.pin), true, () => {
                this._dedicated.add(status.id);
                this._statusBarService.updateEntryVisibility(status.id, true);
                this._update();
                this._storeState();
            });
        }
        else {
            action = new Action('unpin', actionLabel, ThemeIcon.asClassName(Codicon.pinned), true, () => {
                this._dedicated.delete(status.id);
                this._statusBarService.updateEntryVisibility(status.id, false);
                this._update();
                this._storeState();
            });
        }
        actionBar.push(action, { icon: true, label: false });
        store.add(action);
        return parent;
    }
    static _severityToComboCodicon(sev) {
        switch (sev) {
            case Severity.Error:
                return '$(bracket-error)';
            case Severity.Warning:
                return '$(bracket-dot)';
            default:
                return '$(bracket)';
        }
    }
    static _severityToSingleCodicon(sev) {
        switch (sev) {
            case Severity.Error:
                return '$(error)';
            case Severity.Warning:
                return '$(info)';
            default:
                return '$(check)';
        }
    }
    _renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                dom.append(target, ...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this._hoverService, this._openerService));
            }
        }
    }
    static _accessibilityInformation(status) {
        if (status.accessibilityInfo) {
            return status.accessibilityInfo;
        }
        const textValue = typeof status.label === 'string' ? status.label : status.label.value;
        if (status.detail) {
            return { label: localize('aria.1', '{0}, {1}', textValue, status.detail) };
        }
        else {
            return { label: localize('aria.2', '{0}', textValue) };
        }
    }
    // ---
    static _asStatusbarEntry(item) {
        let kind;
        if (item.severity === Severity.Warning) {
            kind = 'warning';
        }
        else if (item.severity === Severity.Error) {
            kind = 'error';
        }
        const textValue = typeof item.label === 'string' ? item.label : item.label.shortValue;
        return {
            name: localize('name.pattern', '{0} (Language Status)', item.name),
            text: computeText(textValue, item.busy),
            ariaLabel: LanguageStatus_1._accessibilityInformation(item).label,
            role: item.accessibilityInfo?.role,
            tooltip: item.command?.tooltip ||
                new MarkdownString(item.detail, { isTrusted: true, supportThemeIcons: true }),
            kind,
            command: item.command,
        };
    }
};
LanguageStatus = LanguageStatus_1 = __decorate([
    __param(0, ILanguageStatusService),
    __param(1, IStatusbarService),
    __param(2, IEditorService),
    __param(3, IHoverService),
    __param(4, IOpenerService),
    __param(5, IStorageService)
], LanguageStatus);
export class ResetAction extends Action2 {
    constructor() {
        super({
            id: 'editor.inlayHints.Reset',
            title: localize2('reset', 'Reset Language Status Interaction Counter'),
            category: Categories.View,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove('languageStatus.interactCount', 0 /* StorageScope.PROFILE */);
    }
}
function computeText(text, loading) {
    return joinStrings([text !== '' && text, loading && '$(loading~spin)'], '\u00A0\u00A0');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sYW5ndWFnZVN0YXR1cy9icm93c2VyL2xhbmd1YWdlU3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFHTixpQkFBaUIsRUFDakIsa0JBQWtCLEdBR2xCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZF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