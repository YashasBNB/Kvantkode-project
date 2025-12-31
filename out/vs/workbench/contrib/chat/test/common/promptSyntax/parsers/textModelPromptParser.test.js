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
import assert from 'assert';
import { createURI } from '../testUtils/createUri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { ExpectedReference } from '../testUtils/expectedReference.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { OpenFailed } from '../../../../common/promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
/**
 * Test helper to run unit tests for the {@link TextModelPromptParser}
 * class using different test input parameters
 */
let TextModelPromptParserTest = class TextModelPromptParserTest extends Disposable {
    constructor(uri, initialContents, fileService, initService) {
        super();
        // create in-memory file system for this test instance
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.file, fileSystemProvider));
        // both line endings should yield the same results
        const lineEnding = randomBoolean() ? '\r\n' : '\n';
        // create the underlying model
        this.model = this._register(createTextModel(initialContents.join(lineEnding), 'fooLang', undefined, uri));
        // create the parser instance
        this.parser = this._register(initService.createInstance(TextModelPromptParser, this.model, [])).start();
    }
    /**
     * Validate the current state of the parser.
     */
    async validateReferences(expectedReferences) {
        await this.parser.allSettled();
        const { references } = this.parser;
        for (let i = 0; i < expectedReferences.length; i++) {
            const reference = references[i];
            assertDefined(reference, `Expected reference #${i} be ${expectedReferences[i]}, got 'undefined'.`);
            expectedReferences[i].validateEqual(reference);
        }
        assert.strictEqual(expectedReferences.length, references.length, `[${this.model.uri}] Unexpected number of references.`);
    }
};
TextModelPromptParserTest = __decorate([
    __param(2, IFileService),
    __param(3, IInstantiationService)
], TextModelPromptParserTest);
suite('TextModelPromptParser', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IFileService, disposables.add(instantiationService.createInstance(FileService)));
    });
    /**
     * Create a new test instance with provided input parameters.
     */
    const createTest = (uri, initialContents) => {
        return disposables.add(instantiationService.createInstance(TextModelPromptParserTest, uri, initialContents));
    };
    test('core logic #1', async () => {
        const test = createTest(createURI('/foo/bar.md'), [
            /* 01 */ 'The quick brown fox tries #file:/abs/path/to/file.md online yoga for the first time.',
            /* 02 */ 'Maria discovered a stray turtle roaming in her kitchen.',
            /* 03 */ 'Why did the robot write a poem about existential dread?',
            /* 04 */ 'Sundays are made for two things: pancakes and procrastination.',
            /* 05 */ 'Sometimes, the best code is the one you never have to write.',
            /* 06 */ 'A lone kangaroo once hopped into the local cafe, seeking free Wi-Fi.',
            /* 07 */ 'Critical #file:./folder/binary.file thinking is like coffee; best served strong [md link](/etc/hosts/random-file.txt) and without sugar.',
            /* 08 */ 'Music is the mind’s way of doodling in the air.',
            /* 09 */ 'Stargazing is just turning your eyes into cosmic explorers.',
            /* 10 */ 'Never trust a balloon salesman who hates birthdays.',
            /* 11 */ 'Running backward can be surprisingly enlightening.',
            /* 12 */ 'There’s an art to whispering loudly.',
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: createURI('/abs/path/to/file.md'),
                text: '#file:/abs/path/to/file.md',
                path: '/abs/path/to/file.md',
                startLine: 1,
                startColumn: 27,
                pathStartColumn: 33,
                childrenOrError: new OpenFailed(createURI('/abs/path/to/file.md'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/foo/folder/binary.file'),
                text: '#file:./folder/binary.file',
                path: './folder/binary.file',
                startLine: 7,
                startColumn: 10,
                pathStartColumn: 16,
                childrenOrError: new OpenFailed(createURI('/foo/folder/binary.file'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/etc/hosts/random-file.txt'),
                text: '[md link](/etc/hosts/random-file.txt)',
                path: '/etc/hosts/random-file.txt',
                startLine: 7,
                startColumn: 81,
                pathStartColumn: 91,
                childrenOrError: new OpenFailed(createURI('/etc/hosts/random-file.txt'), 'File not found.'),
            }),
        ]);
    });
    test('core logic #2', async () => {
        const test = createTest(createURI('/absolute/folder/and/a/filename.txt'), [
            /* 01 */ 'The penguin wore sunglasses but never left the iceberg.',
            /* 02 */ 'I once saw a cloud that looked like an antique teapot.',
            /* 03 */ 'Midnight snacks are the secret to eternal [link text](./foo-bar-baz/another-file.ts) happiness.',
            /* 04 */ 'A stray sock in the hallway is a sign of chaotic creativity.',
            /* 05 */ 'Dogs dream in colorful squeaks and belly rubs.',
            /* 06 */ 'Never [caption](../../../c/file_name.prompt.md)\t underestimate the power of a well-timed nap.',
            /* 07 */ 'The cactus on my desk has a thriving Instagram account.',
            /* 08 */ 'In an alternate universe, pigeons deliver sushi by drone.',
            /* 09 */ 'Lunar rainbows only appear when you sing in falsetto.',
            /* 10 */ 'Carrots have secret telepathic abilities, but only on Tuesdays.',
            /* 11 */ 'Sometimes, the best advice comes \t\t#file:../../main.rs\t#file:./somefolder/../samefile.jpeg\tfrom a talking dishwasher.',
            /* 12 */ 'Paper airplanes believe they can fly until proven otherwise.',
            /* 13 */ 'A library without stories is just a room full of silent trees.',
            /* 14 */ 'The invisible cat meows only when it sees a postman.',
            /* 15 */ 'Code reviews are like detective novels without the plot twists.',
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: createURI('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                text: '[link text](./foo-bar-baz/another-file.ts)',
                path: './foo-bar-baz/another-file.ts',
                startLine: 3,
                startColumn: 43,
                pathStartColumn: 55,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/and/a/foo-bar-baz/another-file.ts'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/c/file_name.prompt.md'),
                text: '[caption](../../../c/file_name.prompt.md)',
                path: '../../../c/file_name.prompt.md',
                startLine: 6,
                startColumn: 7,
                pathStartColumn: 17,
                childrenOrError: new OpenFailed(createURI('/absolute/c/file_name.prompt.md'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/folder/main.rs'),
                text: '#file:../../main.rs',
                path: '../../main.rs',
                startLine: 11,
                startColumn: 36,
                pathStartColumn: 42,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/main.rs'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/folder/and/a/samefile.jpeg'),
                text: '#file:./somefolder/../samefile.jpeg',
                path: './somefolder/../samefile.jpeg',
                startLine: 11,
                startColumn: 56,
                pathStartColumn: 62,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/and/a/samefile.jpeg'), 'File not found.'),
            }),
        ]);
    });
    test('gets disposed with the model', async () => {
        const test = createTest(createURI('/some/path/file.prompt.md'), ['line1', 'line2', 'line3']);
        // no references in the model contents
        await test.validateReferences([]);
        test.model.dispose();
        assert(test.parser.disposed, 'The parser should be disposed with its model.');
    });
    test('toString() implementation', async () => {
        const modelUri = createURI('/Users/legomushroom/repos/prompt-snippets/README.md');
        const test = createTest(modelUri, ['line1', 'line2', 'line3']);
        assert.strictEqual(test.parser.toString(), `text-model-prompt:${modelUri.path}`, 'The parser should provide correct `toString()` implementation.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3RleHRNb2RlbFByb21wdFBhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDM0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1B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