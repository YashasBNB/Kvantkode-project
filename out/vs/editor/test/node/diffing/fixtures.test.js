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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4dHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3Qvbm9kZS9kaWZmaW5nL2ZpeHR1cmVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQTRCLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBRXBILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBZ0IsU0FBUyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdwRyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsTUFBTSxDQUFDLENBQUE7UUFDUixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lB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