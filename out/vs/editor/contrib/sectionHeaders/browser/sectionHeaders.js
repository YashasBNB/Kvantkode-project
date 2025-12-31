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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
let SectionHeaderDetector = class SectionHeaderDetector extends Disposable {
    static { this.ID = 'editor.sectionHeaderDetector'; }
    constructor(editor, languageConfigurationService, editorWorkerService) {
        super();
        this.editor = editor;
        this.languageConfigurationService = languageConfigurationService;
        this.editorWorkerService = editorWorkerService;
        this.decorations = this.editor.createDecorationsCollection();
        this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
        this.computePromise = null;
        this.currentOccurrences = {};
        this._register(editor.onDidChangeModel((e) => {
            this.currentOccurrences = {};
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            this.stop();
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(editor.onDidChangeModelLanguage((e) => {
            this.currentOccurrences = {};
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            this.stop();
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(languageConfigurationService.onDidChange((e) => {
            const editorLanguageId = this.editor.getModel()?.getLanguageId();
            if (editorLanguageId && e.affects(editorLanguageId)) {
                this.currentOccurrences = {};
                this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
                this.stop();
                this.computeSectionHeaders.schedule(0);
            }
        }));
        this._register(editor.onDidChangeConfiguration((e) => {
            if (this.options && !e.hasChanged(74 /* EditorOption.minimap */)) {
                return;
            }
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            // Remove any links (for the getting disabled case)
            this.updateDecorations([]);
            // Stop any computation (for the getting disabled case)
            this.stop();
            // Start computing (for the getting enabled case)
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(this.editor.onDidChangeModelContent((e) => {
            this.computeSectionHeaders.schedule();
        }));
        this._register(editor.onDidChangeModelTokens((e) => {
            if (!this.computeSectionHeaders.isScheduled()) {
                this.computeSectionHeaders.schedule(1000);
            }
        }));
        this.computeSectionHeaders = this._register(new RunOnceScheduler(() => {
            this.findSectionHeaders();
        }, 250));
        this.computeSectionHeaders.schedule(0);
    }
    createOptions(minimap) {
        if (!minimap || !this.editor.hasModel()) {
            return undefined;
        }
        const languageId = this.editor.getModel().getLanguageId();
        if (!languageId) {
            return undefined;
        }
        const commentsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        const foldingRules = this.languageConfigurationService.getLanguageConfiguration(languageId).foldingRules;
        if (!commentsConfiguration && !foldingRules?.markers) {
            return undefined;
        }
        return {
            foldingRules,
            markSectionHeaderRegex: minimap.markSectionHeaderRegex,
            findMarkSectionHeaders: minimap.showMarkSectionHeaders,
            findRegionSectionHeaders: minimap.showRegionSectionHeaders,
        };
    }
    findSectionHeaders() {
        if (!this.editor.hasModel() ||
            (!this.options?.findMarkSectionHeaders && !this.options?.findRegionSectionHeaders)) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isDisposed() || model.isTooLargeForSyncing()) {
            return;
        }
        const modelVersionId = model.getVersionId();
        this.editorWorkerService.findSectionHeaders(model.uri, this.options).then((sectionHeaders) => {
            if (model.isDisposed() || model.getVersionId() !== modelVersionId) {
                // model changed in the meantime
                return;
            }
            this.updateDecorations(sectionHeaders);
        });
    }
    updateDecorations(sectionHeaders) {
        const model = this.editor.getModel();
        if (model) {
            // Remove all section headers that should be in comments and are not in comments
            sectionHeaders = sectionHeaders.filter((sectionHeader) => {
                if (!sectionHeader.shouldBeInComments) {
                    return true;
                }
                const validRange = model.validateRange(sectionHeader.range);
                const tokens = model.tokenization.getLineTokens(validRange.startLineNumber);
                const idx = tokens.findTokenIndexAtOffset(validRange.startColumn - 1);
                const tokenType = tokens.getStandardTokenType(idx);
                const languageId = tokens.getLanguageId(idx);
                return languageId === model.getLanguageId() && tokenType === 1 /* StandardTokenType.Comment */;
            });
        }
        const oldDecorations = Object.values(this.currentOccurrences).map((occurrence) => occurrence.decorationId);
        const newDecorations = sectionHeaders.map((sectionHeader) => decoration(sectionHeader));
        this.editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations(oldDecorations, newDecorations);
            this.currentOccurrences = {};
            for (let i = 0, len = decorations.length; i < len; i++) {
                const occurrence = { sectionHeader: sectionHeaders[i], decorationId: decorations[i] };
                this.currentOccurrences[occurrence.decorationId] = occurrence;
            }
        });
    }
    stop() {
        this.computeSectionHeaders.cancel();
        if (this.computePromise) {
            this.computePromise.cancel();
            this.computePromise = null;
        }
    }
    dispose() {
        super.dispose();
        this.stop();
        this.decorations.clear();
    }
};
SectionHeaderDetector = __decorate([
    __param(1, ILanguageConfigurationService),
    __param(2, IEditorWorkerService)
], SectionHeaderDetector);
export { SectionHeaderDetector };
function decoration(sectionHeader) {
    return {
        range: sectionHeader.range,
        options: ModelDecorationOptions.createDynamic({
            description: 'section-header',
            stickiness: 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */,
            collapseOnReplaceEdit: true,
            minimap: {
                color: undefined,
                position: 1 /* MinimapPosition.Inline */,
                sectionHeaderStyle: sectionHeader.hasSeparatorLine
                    ? 2 /* MinimapSectionHeaderStyle.Underlined */
                    : 1 /* MinimapSectionHeaderStyle.Normal */,
                sectionHeaderText: sectionHeader.text,
            },
        }),
    };
}
registerEditorContribution(SectionHeaderDetector.ID, SectionHeaderDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkhlYWRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZWN0aW9uSGVhZGVycy9icm93c2VyL3NlY3Rpb25IZWFkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBSTdDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTzFHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBTXhFLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTthQUM3QixPQUFFLEdBQVcsOEJBQThCLEFBQXpDLENBQXlDO0lBUWxFLFlBQ2tCLE1BQW1CLEVBRW5CLDRCQUEyRCxFQUNyQyxtQkFBeUM7UUFFaEYsS0FBSyxFQUFFLENBQUE7UUFMVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBRW5CLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDckMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUdoRixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUU1RCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsK0JBQXNCLENBQUMsQ0FBQTtRQUN6RSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FB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