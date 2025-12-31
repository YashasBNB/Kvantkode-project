/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { InlineDecoration } from '../../../common/viewModel.js';
import { testViewModel } from './testViewModel.js';
suite('ViewModelDecorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getDecorationsViewportData', () => {
        const text = ['hello world, this is a buffer that will be wrapped'];
        const opts = {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 13,
        };
        testViewModel(text, opts, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineContent(1), 'hello world, ');
            assert.strictEqual(viewModel.getLineContent(2), 'this is a ');
            assert.strictEqual(viewModel.getLineContent(3), 'buffer that ');
            assert.strictEqual(viewModel.getLineContent(4), 'will be ');
            assert.strictEqual(viewModel.getLineContent(5), 'wrapped');
            model.changeDecorations((accessor) => {
                const createOpts = (id) => {
                    return {
                        description: 'test',
                        className: id,
                        inlineClassName: 'i-' + id,
                        beforeContentClassName: 'b-' + id,
                        afterContentClassName: 'a-' + id,
                    };
                };
                // VIEWPORT will be (1,14) -> (1,36)
                // completely before viewport
                accessor.addDecoration(new Range(1, 2, 1, 3), createOpts('dec1'));
                // starts before viewport, ends at viewport start
                accessor.addDecoration(new Range(1, 2, 1, 14), createOpts('dec2'));
                // starts before viewport, ends inside viewport
                accessor.addDecoration(new Range(1, 2, 1, 15), createOpts('dec3'));
                // starts before viewport, ends at viewport end
                accessor.addDecoration(new Range(1, 2, 1, 36), createOpts('dec4'));
                // starts before viewport, ends after viewport
                accessor.addDecoration(new Range(1, 2, 1, 51), createOpts('dec5'));
                // starts at viewport start, ends at viewport start (will not be visible on view line 2)
                accessor.addDecoration(new Range(1, 14, 1, 14), createOpts('dec6'));
                // starts at viewport start, ends inside viewport
                accessor.addDecoration(new Range(1, 14, 1, 16), createOpts('dec7'));
                // starts at viewport start, ends at viewport end
                accessor.addDecoration(new Range(1, 14, 1, 36), createOpts('dec8'));
                // starts at viewport start, ends after viewport
                accessor.addDecoration(new Range(1, 14, 1, 51), createOpts('dec9'));
                // starts inside viewport, ends inside viewport
                accessor.addDecoration(new Range(1, 16, 1, 18), createOpts('dec10'));
                // starts inside viewport, ends at viewport end
                accessor.addDecoration(new Range(1, 16, 1, 36), createOpts('dec11'));
                // starts inside viewport, ends after viewport
                accessor.addDecoration(new Range(1, 16, 1, 51), createOpts('dec12'));
                // starts at viewport end, ends at viewport end
                accessor.addDecoration(new Range(1, 36, 1, 36), createOpts('dec13'));
                // starts at viewport end, ends after viewport
                accessor.addDecoration(new Range(1, 36, 1, 51), createOpts('dec14'));
                // starts after viewport, ends after viewport
                accessor.addDecoration(new Range(1, 40, 1, 51), createOpts('dec15'));
            });
            const actualDecorations = viewModel
                .getDecorationsInViewport(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)))
                .map((dec) => {
                return dec.options.className;
            })
                .filter(Boolean);
            assert.deepStrictEqual(actualDecorations, [
                'dec1',
                'dec2',
                'dec3',
                'dec4',
                'dec5',
                'dec6',
                'dec7',
                'dec8',
                'dec9',
                'dec10',
                'dec11',
                'dec12',
                'dec13',
                'dec14',
            ]);
            const inlineDecorations1 = viewModel.getViewportViewLineRenderingData(new Range(1, viewModel.getLineMinColumn(1), 2, viewModel.getLineMaxColumn(2)), 1).inlineDecorations;
            // view line 1: (1,1 -> 1,14)
            assert.deepStrictEqual(inlineDecorations1, [
                new InlineDecoration(new Range(1, 2, 1, 3), 'i-dec1', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec1', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 3, 1, 3), 'a-dec1', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 1, 14), 'i-dec2', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec2', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 14, 1, 14), 'a-dec2', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 2, 2), 'i-dec3', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec3', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec4', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 1, 2), 'b-dec5', 1 /* InlineDecorationType.Before */),
            ]);
            const inlineDecorations2 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 2).inlineDecorations;
            // view line 2: (1,14 -> 1,24)
            assert.deepStrictEqual(inlineDecorations2, [
                new InlineDecoration(new Range(1, 2, 2, 2), 'i-dec3', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 2, 2, 2), 'a-dec3', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'i-dec6', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec6', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'a-dec6', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 2, 3), 'i-dec7', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec7', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'a-dec7', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 3, 13), 'i-dec8', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec8', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 1, 5, 8), 'i-dec9', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 2, 1), 'b-dec9', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 2, 5), 'i-dec10', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec10', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 5, 2, 5), 'a-dec10', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 3, 3, 13), 'i-dec11', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec11', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(2, 3, 5, 8), 'i-dec12', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 2, 3), 'b-dec12', 1 /* InlineDecorationType.Before */),
            ]);
            const inlineDecorations3 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 3).inlineDecorations;
            // view line 3 (24 -> 36)
            assert.deepStrictEqual(inlineDecorations3, [
                new InlineDecoration(new Range(1, 2, 3, 13), 'i-dec4', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec4', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(1, 2, 5, 8), 'i-dec5', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 1, 3, 13), 'i-dec8', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec8', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 1, 5, 8), 'i-dec9', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(2, 3, 3, 13), 'i-dec11', 0 /* InlineDecorationType.Regular */),
                new InlineDecoration(new Range(3, 13, 3, 13), 'a-dec11', 2 /* InlineDecorationType.After */),
                new InlineDecoration(new Range(2, 3, 5, 8), 'i-dec12', 0 /* InlineDecorationType.Regular */),
            ]);
        });
    });
    test('issue #17208: Problem scrolling in 1.8.0', () => {
        const text = ['hello world, this is a buffer that will be wrapped'];
        const opts = {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 13,
        };
        testViewModel(text, opts, (viewModel, model) => {
            assert.strictEqual(viewModel.getLineContent(1), 'hello world, ');
            assert.strictEqual(viewModel.getLineContent(2), 'this is a ');
            assert.strictEqual(viewModel.getLineContent(3), 'buffer that ');
            assert.strictEqual(viewModel.getLineContent(4), 'will be ');
            assert.strictEqual(viewModel.getLineContent(5), 'wrapped');
            model.changeDecorations((accessor) => {
                accessor.addDecoration(new Range(1, 50, 1, 51), {
                    description: 'test',
                    beforeContentClassName: 'dec1',
                });
            });
            const decorations = viewModel
                .getDecorationsInViewport(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)))
                .filter((x) => Boolean(x.options.beforeContentClassName));
            assert.deepStrictEqual(decorations, []);
            const inlineDecorations1 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 2).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations1, []);
            const inlineDecorations2 = viewModel.getViewportViewLineRenderingData(new Range(2, viewModel.getLineMinColumn(2), 3, viewModel.getLineMaxColumn(3)), 3).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations2, []);
        });
    });
    test('issue #37401: Allow both before and after decorations on empty line', () => {
        const text = [''];
        testViewModel(text, {}, (viewModel, model) => {
            model.changeDecorations((accessor) => {
                accessor.addDecoration(new Range(1, 1, 1, 1), {
                    description: 'test',
                    beforeContentClassName: 'before1',
                    afterContentClassName: 'after1',
                });
            });
            const inlineDecorations = viewModel.getViewportViewLineRenderingData(new Range(1, 1, 1, 1), 1).inlineDecorations;
            assert.deepStrictEqual(inlineDecorations, [
                new InlineDecoration(new Range(1, 1, 1, 1), 'before1', 1 /* InlineDecorationType.Before */),
                new InlineDecoration(new Range(1, 1, 1, 1), 'after1', 2 /* InlineDecorationType.After */),
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdmlld01vZGVsL3ZpZXdNb2RlbERlY29yYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sOEJBQThCLENBQUE7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRWxELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQTtRQUNuRSxNQUFNLElBQUksR0FBbUI7WUFDNUIsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixjQUFjLEVBQUUsRUFBRTtTQUNsQixDQUFBO1FBQ0QsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUUxRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRTtvQkFDakMsT0FBTzt3QkFDTixXQUFXLEVBQUUsTUFBTTt3QkFDbkIsU0FBUyxFQUFFLEVBQUU7d0JBQ2IsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFFO3dCQUMxQixzQkFBc0IsRUFBRSxJQUFJLEdBQUcsRUFBRTt3QkFDakMscUJBQXFCLEVBQUUsSUFBSSxHQUFHLEVBQUU7cUJBQ2hDLENBQUE7Z0JBQ0YsQ0FBQyxDQUFBO2dCQUVELG9DQUFvQztnQkFFcEMsNkJBQTZCO2dCQUM3QixRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNqRSxpREFBaUQ7Z0JBQ2pELFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQ2xFLCtDQUErQztnQkFDL0MsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDbEUsK0NBQStDO2dCQUMvQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNsRSw4Q0FBOEM7Z0JBQzlDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBRWxFLHdGQUF3RjtnQkFDeEYsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDbkUsaURBQWlEO2dCQUNqRCxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxpREFBaUQ7Z0JBQ2pELFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQ25FLGdEQUFnRDtnQkFDaEQsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFFbkUsK0NBQStDO2dCQUMvQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUNwRSwrQ0FBK0M7Z0JBQy9DLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQ3BFLDhDQUE4QztnQkFDOUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtnQkFFcEUsK0NBQStDO2dCQUMvQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUNwRSw4Q0FBOEM7Z0JBQzlDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBRXBFLDZDQUE2QztnQkFDN0MsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNyRSxDQUFDLENBQUMsQ0FBQTtZQUVGLE1BQU0saUJBQWlCLEdBQUcsU0FBUztpQkFDakMsd0JBQXdCLENBQ3hCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM3RTtpQkFDQSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDWixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO1lBQzdCLENBQUMsQ0FBQztpQkFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDekMsTUFBTTtnQkFDTixNQUFNO2dCQUNOLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixNQUFNO2dCQUNOLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixNQUFNO2dCQUNOLE1BQU07Z0JBQ04sT0FBTztnQkFDUCxPQUFPO2dCQUNQLE9BQU87Z0JBQ1AsT0FBTztnQkFDUCxPQUFPO2FBQ1AsQ0FBQyxDQUFBO1lBRUYsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsZ0NBQWdDLENBQ3BFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUM3RSxDQUFDLENBQ0QsQ0FBQyxpQkFBaUIsQ0FBQTtZQUVuQiw2QkFBNkI7WUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDMUMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHFDQUE2QjtnQkFDakYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDcEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLHFDQUE2QjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDcEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjtnQkFDbEYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHVDQUErQjtnQkFDbkYsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLHNDQUE4QjthQUNsRixDQUFDLENBQUE7WUFFRixNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FDcEUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzdFLENBQUMsQ0FDRCxDQUFDLGlCQUFpQixDQUFBO1lBRW5CLDhCQUE4QjtZQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUMxQyxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEscUNBQTZCO2dCQUNqRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsdUNBQStCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsc0NBQThCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsdUNBQStCO2dCQUNwRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsc0NBQThCO2dCQUNuRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMscUNBQTZCO2dCQUNsRixJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FB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