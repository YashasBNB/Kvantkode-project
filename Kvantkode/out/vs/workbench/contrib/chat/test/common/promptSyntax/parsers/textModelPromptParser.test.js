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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvdGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsMEJBQTBCLEVB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