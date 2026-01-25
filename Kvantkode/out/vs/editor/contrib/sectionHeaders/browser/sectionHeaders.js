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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkhlYWRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlY3Rpb25IZWFkZXJzL2Jyb3dzZXIvc2VjdGlvbkhlYWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFJN0MsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFPMUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFNeEUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO2FBQzdCLE9BQUUsR0FBVyw4QkFBOEIsQUFBekMsQ0FBeUM7SUFRbEUsWUFDa0IsTUFBbUIsRUFFbkIsNEJBQTJELEVBQ3JDLG1CQUF5QztRQUVoRixLQUFLLEVBQUUsQ0FBQTtRQUxVLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFbkIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUNyQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBR2hGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBRTVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUywrQkFBc0IsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFB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