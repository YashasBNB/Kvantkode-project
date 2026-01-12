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
var LinkDetector_1;
import { createCancelablePromise, RunOnceScheduler, } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import './links.css';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ClickLinkGesture, } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { getLinks } from './getLinks.js';
import * as nls from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let LinkDetector = class LinkDetector extends Disposable {
    static { LinkDetector_1 = this; }
    static { this.ID = 'editor.linkDetector'; }
    static get(editor) {
        return editor.getContribution(LinkDetector_1.ID);
    }
    constructor(editor, openerService, notificationService, languageFeaturesService, languageFeatureDebounceService) {
        super();
        this.editor = editor;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.languageFeaturesService = languageFeaturesService;
        this.providers = this.languageFeaturesService.linkProvider;
        this.debounceInformation = languageFeatureDebounceService.for(this.providers, 'Links', {
            min: 1000,
            max: 4000,
        });
        this.computeLinks = this._register(new RunOnceScheduler(() => this.computeLinksNow(), 1000));
        this.computePromise = null;
        this.activeLinksList = null;
        this.currentOccurrences = {};
        this.activeLinkDecorationId = null;
        const clickLinkGesture = this._register(new ClickLinkGesture(editor));
        this._register(clickLinkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this._onEditorMouseMove(mouseEvent, keyboardEvent);
        }));
        this._register(clickLinkGesture.onExecute((e) => {
            this.onEditorMouseUp(e);
        }));
        this._register(clickLinkGesture.onCancel((e) => {
            this.cleanUpActiveLinkDecoration();
        }));
        this._register(editor.onDidChangeConfiguration((e) => {
            if (!e.hasChanged(72 /* EditorOption.links */)) {
                return;
            }
            // Remove any links (for the getting disabled case)
            this.updateDecorations([]);
            // Stop any computation (for the getting disabled case)
            this.stop();
            // Start computing (for the getting enabled case)
            this.computeLinks.schedule(0);
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            if (!this.editor.hasModel()) {
                return;
            }
            this.computeLinks.schedule(this.debounceInformation.get(this.editor.getModel()));
        }));
        this._register(editor.onDidChangeModel((e) => {
            this.currentOccurrences = {};
            this.activeLinkDecorationId = null;
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this._register(editor.onDidChangeModelLanguage((e) => {
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this._register(this.providers.onDidChange((e) => {
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this.computeLinks.schedule(0);
    }
    async computeLinksNow() {
        if (!this.editor.hasModel() || !this.editor.getOption(72 /* EditorOption.links */)) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isTooLargeForSyncing()) {
            return;
        }
        if (!this.providers.has(model)) {
            return;
        }
        if (this.activeLinksList) {
            this.activeLinksList.dispose();
            this.activeLinksList = null;
        }
        this.computePromise = createCancelablePromise((token) => getLinks(this.providers, model, token));
        try {
            const sw = new StopWatch(false);
            this.activeLinksList = await this.computePromise;
            this.debounceInformation.update(model, sw.elapsed());
            if (model.isDisposed()) {
                return;
            }
            this.updateDecorations(this.activeLinksList.links);
        }
        catch (err) {
            onUnexpectedError(err);
        }
        finally {
            this.computePromise = null;
        }
    }
    updateDecorations(links) {
        const useMetaKey = this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey';
        const oldDecorations = [];
        const keys = Object.keys(this.currentOccurrences);
        for (const decorationId of keys) {
            const occurence = this.currentOccurrences[decorationId];
            oldDecorations.push(occurence.decorationId);
        }
        const newDecorations = [];
        if (links) {
            // Not sure why this is sometimes null
            for (const link of links) {
                newDecorations.push(LinkOccurrence.decoration(link, useMetaKey));
            }
        }
        this.editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations(oldDecorations, newDecorations);
            this.currentOccurrences = {};
            this.activeLinkDecorationId = null;
            for (let i = 0, len = decorations.length; i < len; i++) {
                const occurence = new LinkOccurrence(links[i], decorations[i]);
                this.currentOccurrences[occurence.decorationId] = occurence;
            }
        });
    }
    _onEditorMouseMove(mouseEvent, withKey) {
        const useMetaKey = this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey';
        if (this.isEnabled(mouseEvent, withKey)) {
            this.cleanUpActiveLinkDecoration(); // always remove previous link decoration as their can only be one
            const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
            if (occurrence) {
                this.editor.changeDecorations((changeAccessor) => {
                    occurrence.activate(changeAccessor, useMetaKey);
                    this.activeLinkDecorationId = occurrence.decorationId;
                });
            }
        }
        else {
            this.cleanUpActiveLinkDecoration();
        }
    }
    cleanUpActiveLinkDecoration() {
        const useMetaKey = this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey';
        if (this.activeLinkDecorationId) {
            const occurrence = this.currentOccurrences[this.activeLinkDecorationId];
            if (occurrence) {
                this.editor.changeDecorations((changeAccessor) => {
                    occurrence.deactivate(changeAccessor, useMetaKey);
                });
            }
            this.activeLinkDecorationId = null;
        }
    }
    onEditorMouseUp(mouseEvent) {
        if (!this.isEnabled(mouseEvent)) {
            return;
        }
        const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
        if (!occurrence) {
            return;
        }
        this.openLinkOccurrence(occurrence, mouseEvent.hasSideBySideModifier, true /* from user gesture */);
    }
    openLinkOccurrence(occurrence, openToSide, fromUserGesture = false) {
        if (!this.openerService) {
            return;
        }
        const { link } = occurrence;
        link.resolve(CancellationToken.None).then((uri) => {
            // Support for relative file URIs of the shape file://./relativeFile.txt or file:///./relativeFile.txt
            if (typeof uri === 'string' && this.editor.hasModel()) {
                const modelUri = this.editor.getModel().uri;
                if (modelUri.scheme === Schemas.file && uri.startsWith(`${Schemas.file}:`)) {
                    const parsedUri = URI.parse(uri);
                    if (parsedUri.scheme === Schemas.file) {
                        const fsPath = resources.originalFSPath(parsedUri);
                        let relativePath = null;
                        if (fsPath.startsWith('/./') || fsPath.startsWith('\\.\\')) {
                            relativePath = `.${fsPath.substr(1)}`;
                        }
                        else if (fsPath.startsWith('//./') || fsPath.startsWith('\\\\.\\')) {
                            relativePath = `.${fsPath.substr(2)}`;
                        }
                        if (relativePath) {
                            uri = resources.joinPath(modelUri, relativePath);
                        }
                    }
                }
            }
            return this.openerService.open(uri, {
                openToSide,
                fromUserGesture,
                allowContributedOpeners: true,
                allowCommands: true,
                fromWorkspace: true,
            });
        }, (err) => {
            const messageOrError = err instanceof Error ? err.message : err;
            // different error cases
            if (messageOrError === 'invalid') {
                this.notificationService.warn(nls.localize('invalid.url', 'Failed to open this link because it is not well-formed: {0}', link.url.toString()));
            }
            else if (messageOrError === 'missing') {
                this.notificationService.warn(nls.localize('missing.url', 'Failed to open this link because its target is missing.'));
            }
            else {
                onUnexpectedError(err);
            }
        });
    }
    getLinkOccurrence(position) {
        if (!this.editor.hasModel() || !position) {
            return null;
        }
        const decorations = this.editor.getModel().getDecorationsInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        }, 0, true);
        for (const decoration of decorations) {
            const currentOccurrence = this.currentOccurrences[decoration.id];
            if (currentOccurrence) {
                return currentOccurrence;
            }
        }
        return null;
    }
    isEnabled(mouseEvent, withKey) {
        return Boolean(mouseEvent.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            (mouseEvent.hasTriggerModifier || (withKey && withKey.keyCodeIsTriggerKey)));
    }
    stop() {
        this.computeLinks.cancel();
        if (this.activeLinksList) {
            this.activeLinksList?.dispose();
            this.activeLinksList = null;
        }
        if (this.computePromise) {
            this.computePromise.cancel();
            this.computePromise = null;
        }
    }
    dispose() {
        super.dispose();
        this.stop();
    }
};
LinkDetector = LinkDetector_1 = __decorate([
    __param(1, IOpenerService),
    __param(2, INotificationService),
    __param(3, ILanguageFeaturesService),
    __param(4, ILanguageFeatureDebounceService)
], LinkDetector);
export { LinkDetector };
const decoration = {
    general: ModelDecorationOptions.register({
        description: 'detected-link',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        collapseOnReplaceEdit: true,
        inlineClassName: 'detected-link',
    }),
    active: ModelDecorationOptions.register({
        description: 'detected-link-active',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        collapseOnReplaceEdit: true,
        inlineClassName: 'detected-link-active',
    }),
};
class LinkOccurrence {
    static decoration(link, useMetaKey) {
        return {
            range: link.range,
            options: LinkOccurrence._getOptions(link, useMetaKey, false),
        };
    }
    static _getOptions(link, useMetaKey, isActive) {
        const options = { ...(isActive ? decoration.active : decoration.general) };
        options.hoverMessage = getHoverMessage(link, useMetaKey);
        return options;
    }
    constructor(link, decorationId) {
        this.link = link;
        this.decorationId = decorationId;
    }
    activate(changeAccessor, useMetaKey) {
        changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, true));
    }
    deactivate(changeAccessor, useMetaKey) {
        changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, false));
    }
}
function getHoverMessage(link, useMetaKey) {
    const executeCmd = link.url && /^command:/i.test(link.url.toString());
    const label = link.tooltip
        ? link.tooltip
        : executeCmd
            ? nls.localize('links.navigate.executeCmd', 'Execute command')
            : nls.localize('links.navigate.follow', 'Follow link');
    const kb = useMetaKey
        ? platform.isMacintosh
            ? nls.localize('links.navigate.kb.meta.mac', 'cmd + click')
            : nls.localize('links.navigate.kb.meta', 'ctrl + click')
        : platform.isMacintosh
            ? nls.localize('links.navigate.kb.alt.mac', 'option + click')
            : nls.localize('links.navigate.kb.alt', 'alt + click');
    if (link.url) {
        let nativeLabel = '';
        if (/^command:/i.test(link.url.toString())) {
            // Don't show complete command arguments in the native tooltip
            const match = link.url.toString().match(/^command:([^?#]+)/);
            if (match) {
                const commandId = match[1];
                nativeLabel = nls.localize('tooltip.explanation', 'Execute command {0}', commandId);
            }
        }
        const hoverMessage = new MarkdownString('', true)
            .appendLink(link.url.toString(true).replace(/ /g, '%20'), label, nativeLabel)
            .appendMarkdown(` (${kb})`);
        return hoverMessage;
    }
    else {
        return new MarkdownString().appendText(`${label} (${kb})`);
    }
}
class OpenLinkAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.openLink',
            label: nls.localize2('label', 'Open Link'),
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        const linkDetector = LinkDetector.get(editor);
        if (!linkDetector) {
            return;
        }
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        for (const sel of selections) {
            const link = linkDetector.getLinkOccurrence(sel.getEndPosition());
            if (link) {
                linkDetector.openLinkOccurrence(link, false);
            }
        }
    }
}
registerEditorContribution(LinkDetector.ID, LinkDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(OpenLinkAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmtzL2Jyb3dzZXIvbGlua3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTix1QkFBdUIsRUFFdkIsZ0JBQWdCLEdBQ2hCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxhQUFhLENBQUE7QUFFcEIsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFXN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUVOLCtCQUErQixHQUMvQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSxt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