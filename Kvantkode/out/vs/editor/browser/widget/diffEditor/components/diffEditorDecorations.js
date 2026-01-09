/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived } from '../../../../../base/common/observable.js';
import { allowsTrueInlineDiffRendering } from './diffEditorViewZones/diffEditorViewZones.js';
import { MovedBlocksLinesFeature } from '../features/movedBlocksLinesFeature.js';
import { diffAddDecoration, diffAddDecorationEmpty, diffDeleteDecoration, diffDeleteDecorationEmpty, diffLineAddDecorationBackground, diffLineAddDecorationBackgroundWithIndicator, diffLineDeleteDecorationBackground, diffLineDeleteDecorationBackgroundWithIndicator, diffWholeLineAddDecoration, diffWholeLineDeleteDecoration, } from '../registrations.contribution.js';
import { applyObservableDecorations } from '../utils.js';
export class DiffEditorDecorations extends Disposable {
    constructor(_editors, _diffModel, _options, widget) {
        super();
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._decorations = derived(this, (reader) => {
            const diffModel = this._diffModel.read(reader);
            const diff = diffModel?.diff.read(reader);
            if (!diff) {
                return null;
            }
            const movedTextToCompare = this._diffModel.read(reader).movedTextToCompare.read(reader);
            const renderIndicators = this._options.renderIndicators.read(reader);
            const showEmptyDecorations = this._options.showEmptyDecorations.read(reader);
            const originalDecorations = [];
            const modifiedDecorations = [];
            if (!movedTextToCompare) {
                for (const m of diff.mappings) {
                    if (!m.lineRangeMapping.original.isEmpty) {
                        originalDecorations.push({
                            range: m.lineRangeMapping.original.toInclusiveRange(),
                            options: renderIndicators
                                ? diffLineDeleteDecorationBackgroundWithIndicator
                                : diffLineDeleteDecorationBackground,
                        });
                    }
                    if (!m.lineRangeMapping.modified.isEmpty) {
                        modifiedDecorations.push({
                            range: m.lineRangeMapping.modified.toInclusiveRange(),
                            options: renderIndicators
                                ? diffLineAddDecorationBackgroundWithIndicator
                                : diffLineAddDecorationBackground,
                        });
                    }
                    if (m.lineRangeMapping.modified.isEmpty || m.lineRangeMapping.original.isEmpty) {
                        if (!m.lineRangeMapping.original.isEmpty) {
                            originalDecorations.push({
                                range: m.lineRangeMapping.original.toInclusiveRange(),
                                options: diffWholeLineDeleteDecoration,
                            });
                        }
                        if (!m.lineRangeMapping.modified.isEmpty) {
                            modifiedDecorations.push({
                                range: m.lineRangeMapping.modified.toInclusiveRange(),
                                options: diffWholeLineAddDecoration,
                            });
                        }
                    }
                    else {
                        const useInlineDiff = this._options.useTrueInlineDiffRendering.read(reader) &&
                            allowsTrueInlineDiffRendering(m.lineRangeMapping);
                        for (const i of m.lineRangeMapping.innerChanges || []) {
                            // Don't show empty markers outside the line range
                            if (m.lineRangeMapping.original.contains(i.originalRange.startLineNumber)) {
                                originalDecorations.push({
                                    range: i.originalRange,
                                    options: i.originalRange.isEmpty() && showEmptyDecorations
                                        ? diffDeleteDecorationEmpty
                                        : diffDeleteDecoration,
                                });
                            }
                            if (m.lineRangeMapping.modified.contains(i.modifiedRange.startLineNumber)) {
                                modifiedDecorations.push({
                                    range: i.modifiedRange,
                                    options: i.modifiedRange.isEmpty() && showEmptyDecorations && !useInlineDiff
                                        ? diffAddDecorationEmpty
                                        : diffAddDecoration,
                                });
                            }
                            if (useInlineDiff) {
                                const deletedText = diffModel.model.original.getValueInRange(i.originalRange);
                                modifiedDecorations.push({
                                    range: i.modifiedRange,
                                    options: {
                                        description: 'deleted-text',
                                        before: {
                                            content: deletedText,
                                            inlineClassName: 'inline-deleted-text',
                                        },
                                        zIndex: 100000,
                                        showIfCollapsed: true,
                                    },
                                });
                            }
                        }
                    }
                }
            }
            if (movedTextToCompare) {
                for (const m of movedTextToCompare.changes) {
                    const fullRangeOriginal = m.original.toInclusiveRange();
                    if (fullRangeOriginal) {
                        originalDecorations.push({
                            range: fullRangeOriginal,
                            options: renderIndicators
                                ? diffLineDeleteDecorationBackgroundWithIndicator
                                : diffLineDeleteDecorationBackground,
                        });
                    }
                    const fullRangeModified = m.modified.toInclusiveRange();
                    if (fullRangeModified) {
                        modifiedDecorations.push({
                            range: fullRangeModified,
                            options: renderIndicators
                                ? diffLineAddDecorationBackgroundWithIndicator
                                : diffLineAddDecorationBackground,
                        });
                    }
                    for (const i of m.innerChanges || []) {
                        originalDecorations.push({ range: i.originalRange, options: diffDeleteDecoration });
                        modifiedDecorations.push({ range: i.modifiedRange, options: diffAddDecoration });
                    }
                }
            }
            const activeMovedText = this._diffModel.read(reader).activeMovedText.read(reader);
            for (const m of diff.movedTexts) {
                originalDecorations.push({
                    range: m.lineRangeMapping.original.toInclusiveRange(),
                    options: {
                        description: 'moved',
                        blockClassName: 'movedOriginal' + (m === activeMovedText ? ' currentMove' : ''),
                        blockPadding: [
                            MovedBlocksLinesFeature.movedCodeBlockPadding,
                            0,
                            MovedBlocksLinesFeature.movedCodeBlockPadding,
                            MovedBlocksLinesFeature.movedCodeBlockPadding,
                        ],
                    },
                });
                modifiedDecorations.push({
                    range: m.lineRangeMapping.modified.toInclusiveRange(),
                    options: {
                        description: 'moved',
                        blockClassName: 'movedModified' + (m === activeMovedText ? ' currentMove' : ''),
                        blockPadding: [4, 0, 4, 4],
                    },
                });
            }
            return { originalDecorations, modifiedDecorations };
        });
        this._register(applyObservableDecorations(this._editors.original, this._decorations.map((d) => d?.originalDecorations || [])));
        this._register(applyObservableDecorations(this._editors.modified, this._decorations.map((d) => d?.modifiedDecorations || [])));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckRlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRS9FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBSTVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsc0JBQXNCLEVBQ3RCLG9CQUFvQixFQUNwQix5QkFBeUIsRUFDekIsK0JBQStCLEVBQy9CLDRDQUE0QyxFQUM1QyxrQ0FBa0MsRUFDbEMsK0NBQStDLEVBQy9DLDBCQUEwQixFQUMxQiw2QkFBNkIsR0FDN0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHeEQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUFDcEQsWUFDa0IsUUFBMkIsRUFDM0IsVUFBd0QsRUFDeEQsUUFBMkIsRUFDNUMsTUFBd0I7UUFFeEIsS0FBSyxFQUFFLENBQUE7UUFMVSxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUMzQixlQUFVLEdBQVYsVUFBVSxDQUE4QztRQUN4RCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQW1CNUIsaUJBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDeEQsTUFBTSxTQUFTLEdB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