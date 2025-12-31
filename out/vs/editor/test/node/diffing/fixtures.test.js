/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { setUnexpectedErrorHandler } from '../../../../base/common/errors.js';
import { FileAccess } from '../../../../base/common/network.js';
import { RangeMapping } from '../../../common/diff/rangeMapping.js';
import { LegacyLinesDiffComputer } from '../../../common/diff/legacyLinesDiffComputer.js';
import { DefaultLinesDiffComputer } from '../../../common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ArrayText, SingleTextEdit, TextEdit } from '../../../common/core/textEdit.js';
suite('diffing fixtures', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        setUnexpectedErrorHandler((e) => {
            throw e;
        });
    });
    const fixturesOutDir = FileAccess.asFileUri('vs/editor/test/node/diffing/fixtures').fsPath;
    // We want the dir in src, so we can directly update the source files if they disagree and create invalid files to capture the previous state.
    // This makes it very easy to update the fixtures.
    const fixturesSrcDir = resolve(fixturesOutDir)
        .replaceAll('\\', '/')
        .replace('/out/vs/editor/', '/src/vs/editor/');
    const folders = readdirSync(fixturesSrcDir);
    function runTest(folder, diffingAlgoName) {
        const folderPath = join(fixturesSrcDir, folder);
        const files = readdirSync(folderPath);
        const firstFileName = files.find((f) => f.startsWith('1.'));
        const secondFileName = files.find((f) => f.startsWith('2.'));
        const firstContent = readFileSync(join(folderPath, firstFileName), 'utf8')
            .replaceAll('\r\n', '\n')
            .replaceAll('\r', '\n');
        const firstContentLines = firstContent.split(/\n/);
        const secondContent = readFileSync(join(folderPath, secondFileName), 'utf8')
            .replaceAll('\r\n', '\n')
            .replaceAll('\r', '\n');
        const secondContentLines = secondContent.split(/\n/);
        const diffingAlgo = diffingAlgoName === 'legacy' ? new LegacyLinesDiffComputer() : new DefaultLinesDiffComputer();
        const ignoreTrimWhitespace = folder.indexOf('trimws') >= 0;
        const diff = diffingAlgo.computeDiff(firstContentLines, secondContentLines, {
            ignoreTrimWhitespace,
            maxComputationTimeMs: Number.MAX_SAFE_INTEGER,
            computeMoves: true,
        });
        if (diffingAlgoName === 'advanced' && !ignoreTrimWhitespace) {
            assertDiffCorrectness(diff, firstContentLines, secondContentLines);
        }
        function getDiffs(changes) {
            for (const c of changes) {
                RangeMapping.assertSorted(c.innerChanges ?? []);
            }
            return changes.map((c) => ({
                originalRange: c.original.toString(),
                modifiedRange: c.modified.toString(),
                innerChanges: c.innerChanges?.map((c) => ({
                    originalRange: formatRange(c.originalRange, firstContentLines),
                    modifiedRange: formatRange(c.modifiedRange, secondContentLines),
                })) || null,
            }));
        }
        function formatRange(range, lines) {
            const toLastChar = range.endColumn === lines[range.endLineNumber - 1].length + 1;
            return ('[' +
                range.startLineNumber +
                ',' +
                range.startColumn +
                ' -> ' +
                range.endLineNumber +
                ',' +
                range.endColumn +
                (toLastChar ? ' EOL' : '') +
                ']');
        }
        const actualDiffingResult = {
            original: { content: firstContent, fileName: `./${firstFileName}` },
            modified: { content: secondContent, fileName: `./${secondFileName}` },
            diffs: getDiffs(diff.changes),
            moves: diff.moves.map((v) => ({
                originalRange: v.lineRangeMapping.original.toString(),
                modifiedRange: v.lineRangeMapping.modified.toString(),
                changes: getDiffs(v.changes),
            })),
        };
        if (actualDiffingResult.moves?.length === 0) {
            delete actualDiffingResult.moves;
        }
        const expectedFilePath = join(folderPath, `${diffingAlgoName}.expected.diff.json`);
        const invalidFilePath = join(folderPath, `${diffingAlgoName}.invalid.diff.json`);
        const actualJsonStr = JSON.stringify(actualDiffingResult, null, '\t');
        if (!existsSync(expectedFilePath)) {
            // New test, create expected file
            writeFileSync(expectedFilePath, actualJsonStr);
            // Create invalid file so that this test fails on a re-run
            writeFileSync(invalidFilePath, '');
            throw new Error('No expected file! Expected and invalid files were written. Delete the invalid file to make the test pass.');
        }
        if (existsSync(invalidFilePath)) {
            const invalidJsonStr = readFileSync(invalidFilePath, 'utf8');
            if (invalidJsonStr === '') {
                // Update expected file
                writeFileSync(expectedFilePath, actualJsonStr);
                throw new Error(`Delete the invalid ${invalidFilePath} file to make the test pass.`);
            }
            else {
                const expectedFileDiffResult = JSON.parse(invalidJsonStr);
                try {
                    assert.deepStrictEqual(actualDiffingResult, expectedFileDiffResult);
                }
                catch (e) {
                    writeFileSync(expectedFilePath, actualJsonStr);
                    throw e;
                }
                // Test succeeded with the invalid file, restore expected file from invalid
                writeFileSync(expectedFilePath, invalidJsonStr);
                rmSync(invalidFilePath);
            }
        }
        else {
            const expectedJsonStr = readFileSync(expectedFilePath, 'utf8');
            const expectedFileDiffResult = JSON.parse(expectedJsonStr);
            try {
                assert.deepStrictEqual(actualDiffingResult, expectedFileDiffResult);
            }
            catch (e) {
                // Backup expected file
                writeFileSync(invalidFilePath, expectedJsonStr);
                // Update expected file
                writeFileSync(expectedFilePath, actualJsonStr);
                throw e;
            }
        }
    }
    test(`test`, () => {
        runTest('invalid-diff-trimws', 'advanced');
    });
    for (const folder of folders) {
        for (const diffingAlgoName of ['legacy', 'advanced']) {
            test(`${folder}-${diffingAlgoName}`, () => {
                runTest(folder, diffingAlgoName);
            });
        }
    }
});
function assertDiffCorrectness(diff, original, modified) {
    const allInnerChanges = diff.changes.flatMap((c) => c.innerChanges);
    const edit = rangeMappingsToTextEdit(allInnerChanges, new ArrayText(modified));
    const result = edit.normalize().apply(new ArrayText(original));
    assert.deepStrictEqual(result, modified.join('\n'));
}
function rangeMappingsToTextEdit(rangeMappings, modified) {
    return new TextEdit(rangeMappings.map((m) => {
        return new SingleTextEdit(m.originalRange, modified.getValueOfRange(m.modifiedRange));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4dHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L25vZGUvZGlmZmluZy9maXh0dXJlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUNqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUNwQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUE0QixZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUVwSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQWdCLFNBQVMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHcEcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVix5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxDQUFBO1FBQ1IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDMUYsOElBQThJO0lBQzlJLGtEQUFrRDtJQUNsRCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO1NBQzVDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQy9DLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUUzQyxTQUFTLE9BQU8sQ0FBQyxNQUFjLEVBQUUsZUFBc0M7UUFDdEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMvQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFckMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBRSxDQUFBO1FBQzVELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUUsQ0FBQTtRQUU3RCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsRUFBRSxNQUFNLENBQUM7YUFDeEUsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7YUFDeEIsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QixNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDO2FBQzFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDO2FBQ3hCLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXBELE1BQU0sV0FBVyxHQUNoQixlQUFlLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUU5RixNQUFNLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUU7WUFDM0Usb0JBQW9CO1lBQ3BCLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7WUFDN0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxlQUFlLEtBQUssVUFBVSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM3RCxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsU0FBUyxRQUFRLENBQUMsT0FBNEM7WUFDN0QsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDekIsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELENBQUM7WUFFRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxhQUFhLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3BDLGFBQWEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDcEMsWUFBWSxFQUNYLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUM7b0JBQzlELGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQztpQkFDL0QsQ0FBQyxDQUFDLElBQUksSUFBSTthQUNaLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUVELFNBQVMsV0FBVyxDQUFDLEtBQVksRUFBRSxLQUFlO1lBQ2pELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUVoRixPQUFPLENBQ04sR0FBRztnQkFDSCxLQUFLLENBQUMsZUFBZTtnQkFDckIsR0FBRztnQkFDSCxLQUFLLENBQUMsV0FBVztnQkFDakIsTUFBTTtnQkFDTixLQUFLLENBQUMsYUFBYTtnQkFDbkIsR0FBRztnQkFDSCxLQUFLLENBQUMsU0FBUztnQkFDZixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLEdBQUcsQ0FDSCxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQWtCO1lBQzFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssYUFBYSxFQUFFLEVBQUU7WUFDbkUsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsS0FBSyxjQUFjLEVBQUUsRUFBRTtZQUNyRSxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM3QixhQUFhLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JELGFBQWEsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDckQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2FBQzVCLENBQUMsQ0FBQztTQUNILENBQUE7UUFDRCxJQUFJLG1CQUFtQixDQUFDLEtBQUssRUFBRSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFDakMsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLGVBQWUscUJBQXFCLENBQUMsQ0FBQTtRQUNsRixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsZUFBZSxvQkFBb0IsQ0FBQyxDQUFBO1FBRWhGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJFLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ25DLGlDQUFpQztZQUNqQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDOUMsMERBQTBEO1lBQzFELGFBQWEsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FDZCwyR0FBMkcsQ0FDM0csQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDNUQsSUFBSSxjQUFjLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzNCLHVCQUF1QjtnQkFDdkIsYUFBYSxDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixlQUFlLDhCQUE4QixDQUFDLENBQUE7WUFDckYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sc0JBQXNCLEdBQWtCLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ3hFLElBQUksQ0FBQztvQkFDSixNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixDQUFDLENBQUE7Z0JBQ3BFLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixhQUFhLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLENBQUE7b0JBQzlDLE1BQU0sQ0FBQyxDQUFBO2dCQUNSLENBQUM7Z0JBQ0QsMkVBQTJFO2dCQUMzRSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDOUQsTUFBTSxzQkFBc0IsR0FBa0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN6RSxJQUFJLENBQUM7Z0JBQ0osTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3BFLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLHVCQUF1QjtnQkFDdkIsYUFBYSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDL0MsdUJBQXVCO2dCQUN2QixhQUFhLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzlDLE1BQU0sQ0FBQyxDQUFBO1lBQ1IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakIsT0FBTyxDQUFDLHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QixLQUFLLE1BQU0sZUFBZSxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBVSxFQUFFLENBQUM7WUFDL0QsSUFBSSxDQUFDLEdBQUcsTUFBTSxJQUFJLGVBQWUsRUFBRSxFQUFFLEdBQUcsRUFBRTtnQkFDekMsT0FBTyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNqQyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUE7QUE0QkYsU0FBUyxxQkFBcUIsQ0FBQyxJQUFlLEVBQUUsUUFBa0IsRUFBRSxRQUFrQjtJQUNyRixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQWEsQ0FBQyxDQUFBO0lBQ3BFLE1BQU0sSUFBSSxHQUFHLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQzlFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUU5RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDcEQsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQy9CLGFBQXNDLEVBQ3RDLFFBQXNCO0lBRXRCLE9BQU8sSUFBSSxRQUFRLENBQ2xCLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUN2QixPQUFPLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtJQUN0RixDQUFDLENBQUMsQ0FDRixDQUFBO0FBQ0YsQ0FBQyJ9