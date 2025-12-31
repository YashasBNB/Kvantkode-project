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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckRlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tcG9uZW50cy9kaWZmRWRpdG9yRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUk1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLCtCQUErQixFQUMvQiw0Q0FBNEMsRUFDNUMsa0NBQWtDLEVBQ2xDLCtDQUErQyxFQUMvQywwQkFBMEIsRUFDMUIsNkJBQTZCLEdBQzdCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBR3hELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBQ3BELFlBQ2tCLFFBQTJCLEVBQzNCLFVBQXdELEVBQ3hELFFBQTJCLEVBQzVDLE1BQXdCO1FBRXhCLEtBQUssRUFBRSxDQUFBO1FBTFUsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsZUFBVSxHQUFWLFVBQVUsQ0FBOEM7UUFDeEQsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFtQjVCLGlCQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3hELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMs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