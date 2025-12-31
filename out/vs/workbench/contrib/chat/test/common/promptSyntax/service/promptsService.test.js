/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createURI } from '../testUtils/createUri.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { waitRandom } from '../../../../../../../base/test/common/testUtils.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsService.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
/**
 * Helper class to assert the properties of a link.
 */
class ExpectedLink {
    constructor(uri, fullRange, linkRange) {
        this.uri = uri;
        this.fullRange = fullRange;
        this.linkRange = linkRange;
    }
    /**
     * Assert a provided link has the same properties as this object.
     */
    assertEqual(link) {
        assert.strictEqual(link.type, 'file', 'Link must have correct type.');
        assert.strictEqual(link.uri.toString(), this.uri.toString(), 'Link must have correct URI.');
        assert(this.fullRange.equalsRange(link.range), `Full range must be '${this.fullRange}', got '${link.range}'.`);
        assertDefined(link.linkRange, 'Link must have a link range.');
        assert(this.linkRange.equalsRange(link.linkRange), `Link range must be '${this.linkRange}', got '${link.linkRange}'.`);
    }
}
/**
 * Asserts that provided links are equal to the expected links.
 * @param links Links to assert.
 * @param expectedLinks Expected links to compare against.
 */
const assertLinks = (links, expectedLinks) => {
    for (let i = 0; i < links.length; i++) {
        try {
            expectedLinks[i].assertEqual(links[i]);
        }
        catch (error) {
            throw new Error(`link#${i}: ${error}`);
        }
    }
    assert.strictEqual(links.length, expectedLinks.length, `Links count must be correct.`);
};
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IFileService, disposables.add(instantiationService.createInstance(FileService)));
        service = disposables.add(instantiationService.createInstance(PromptsService));
    });
    suite('• getParserFor', () => {
        test('• provides cached parser instance', async () => {
            const langId = 'fooLang';
            /**
             * Create a text model, get a parser for it, and perform basic assertions.
             */
            const model1 = disposables.add(createTextModel('test1\n\t#file:./file.md\n\n\n   [bin file](/root/tmp.bin)\t\n', langId, undefined, createURI('/Users/vscode/repos/test/file1.txt')));
            const parser1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1.uri.toString(), model1.uri.toString(), 'Must create parser1 with the correct URI.');
            assert(!parser1.disposed, 'Parser1 must not be disposed.');
            assert(parser1 instanceof TextModelPromptParser, 'Parser1 must be an instance of TextModelPromptParser.');
            /**
             * Validate that all links of the model are correctly parsed.
             */
            await parser1.settled();
            assertLinks(parser1.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * Next, get parser for the same exact model and
             * validate that the same cached object is returned.
             */
            // get the same parser again, the call must return the same object
            const parser1_1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1, parser1_1, 'Must return the same parser object.');
            assert.strictEqual(parser1_1.uri.toString(), model1.uri.toString(), 'Must create parser1_1 with the correct URI.');
            /**
             * Get parser for a different model and perform basic assertions.
             */
            const model2 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \t\ntest-text2', langId, undefined, createURI('/Users/vscode/repos/test/some-folder/file.md')));
            // wait for some random amount of time
            await waitRandom(5);
            const parser2 = service.getSyntaxParserFor(model2);
            assert.strictEqual(parser2.uri.toString(), model2.uri.toString(), 'Must create parser2 with the correct URI.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            assert(parser2 instanceof TextModelPromptParser, 'Parser2 must be an instance of TextModelPromptParser.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            assert(!parser1.disposed, 'Parser1 must not be disposed.');
            assert(!parser1_1.disposed, 'Parser1_1 must not be disposed.');
            /**
             * Validate that all links of the model 2 are correctly parsed.
             */
            await parser2.settled();
            assert.notStrictEqual(parser1.uri.toString(), parser2.uri.toString(), 'Parser2 must have its own URI.');
            assertLinks(parser2.allReferences, [
                new ExpectedLink(createURI('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
            ]);
            /**
             * Validate the first parser was not affected by the presence
             * of the second parser.
             */
            await parser1_1.settled();
            // parser1_1 has the same exact links as before
            assertLinks(parser1_1.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * Dispose the first parser, perform basic validations, and confirm
             * that the second parser is not affected by the disposal of the first one.
             */
            parser1.dispose();
            assert(parser1.disposed, 'Parser1 must be disposed.');
            assert(parser1_1.disposed, 'Parser1_1 must be disposed.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            /**
             * Get parser for the first model again. Confirm that we get
             * a new non-disposed parser object back with correct properties.
             */
            const parser1_2 = service.getSyntaxParserFor(model1);
            assert(!parser1_2.disposed, 'Parser1_2 must not be disposed.');
            assert.notStrictEqual(parser1_2, parser1, 'Must create a new parser object for the model1.');
            assert.strictEqual(parser1_2.uri.toString(), model1.uri.toString(), 'Must create parser1_2 with the correct URI.');
            /**
             * Validate that the contents of the second parser did not change.
             */
            await parser1_2.settled();
            // parser1_2 must have the same exact links as before
            assertLinks(parser1_2.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * This time dispose model of the second parser instead of
             * the parser itself. Validate that the parser is disposed too, but
             * the newly created first parser is not affected.
             */
            // dispose the `model` of the second parser now
            model2.dispose();
            // assert that the parser is also disposed
            assert(parser2.disposed, 'Parser2 must be disposed.');
            // sanity check that the other parser is not affected
            assert(!parser1_2.disposed, 'Parser1_2 must not be disposed.');
            /**
             * Create a new second parser with new model - we cannot use
             * the old one because it was disposed. This new model also has
             * a different second link.
             */
            // we cannot use the same model since it was already disposed
            const model2_1 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \n [caption](.copilot/prompts/test.prompt.md)\t\n\t\n more text', langId, undefined, createURI('/Users/vscode/repos/test/some-folder/file.md')));
            const parser2_1 = service.getSyntaxParserFor(model2_1);
            assert(!parser2_1.disposed, 'Parser2_1 must not be disposed.');
            assert.notStrictEqual(parser2_1, parser2, 'Parser2_1 must be a new object.');
            assert.strictEqual(parser2_1.uri.toString(), model2.uri.toString(), 'Must create parser2_1 with the correct URI.');
            /**
             * Validate that new model2 contents are parsed correctly.
             */
            await parser2_1.settled();
            // parser2_1 must have 2 links now
            assertLinks(parser2_1.allReferences, [
                // the first link didn't change
                new ExpectedLink(createURI('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
                // the second link is new
                new ExpectedLink(createURI('/Users/vscode/repos/test/some-folder/.copilot/prompts/test.prompt.md'), new Range(2, 2, 2, 2 + 42), new Range(2, 12, 2, 12 + 31)),
            ]);
        });
        test('• auto-updated on model changes', async () => {
            const langId = 'bazLang';
            const model = disposables.add(createTextModel(' \t #file:../file.md\ntest1\n\t\n  [another file](/Users/root/tmp/file2.txt)\t\n', langId, undefined, createURI('/repos/test/file1.txt')));
            const parser = service.getSyntaxParserFor(model);
            // sanity checks
            assert(!parser.disposed, 'Parser must not be disposed.');
            assert(parser instanceof TextModelPromptParser, 'Parser must be an instance of TextModelPromptParser.');
            await parser.settled();
            assertLinks(parser.allReferences, [
                new ExpectedLink(createURI('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                new ExpectedLink(createURI('/Users/root/tmp/file2.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
            model.applyEdits([
                {
                    range: new Range(4, 18, 4, 18 + 25),
                    text: '/Users/root/tmp/file3.txt',
                },
            ]);
            await parser.settled();
            assertLinks(parser.allReferences, [
                // link1 didn't change
                new ExpectedLink(createURI('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                // link2 changed in the file name only
                new ExpectedLink(createURI('/Users/root/tmp/file3.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
        });
        test('• throws if disposed model provided', async function () {
            const model = disposables.add(createTextModel('test1\ntest2\n\ntest3\t\n', 'barLang', undefined, URI.parse('./github/prompts/file.prompt.md')));
            // dispose the model before using it
            model.dispose();
            assert.throws(() => {
                service.getSyntaxParserFor(model);
            }, 'Cannot create a prompt parser for a disposed model.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3NlcnZpY2UvcHJvbXB0c1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQTtBQUM5SCxPQUFP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