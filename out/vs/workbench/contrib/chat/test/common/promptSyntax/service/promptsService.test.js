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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvc2VydmljZS9wcm9tcHRzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDckQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVsRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFGQUFxRixDQUFBO0FBQzlI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