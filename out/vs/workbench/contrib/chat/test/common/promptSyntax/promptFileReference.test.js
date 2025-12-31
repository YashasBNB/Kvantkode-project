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
import { URI } from '../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { extUri } from '../../../../../../base/common/resources.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { MockFilesystem } from './testUtils/mockFilesystem.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { NullPolicyService } from '../../../../../../platform/policy/common/policy.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { FileReference } from '../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { waitRandom, randomBoolean } from '../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ConfigurationService } from '../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NotPromptFile, RecursiveReference, OpenFailed, FolderReference, } from '../../../common/promptFileReferenceErrors.js';
/**
 * Represents a file reference with an expected
 * error condition value for testing purposes.
 */
class ExpectedReference {
    constructor(dirname, lineToken, errorCondition) {
        this.lineToken = lineToken;
        this.errorCondition = errorCondition;
        this.uri = extUri.resolvePath(dirname, lineToken.path);
    }
    /**
     * String representation of the expected reference.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
}
/**
 * A reusable test utility to test the `PromptFileReference` class.
 */
let TestPromptFileReference = class TestPromptFileReference extends Disposable {
    constructor(fileStructure, rootFileUri, expectedReferences, fileService, initService) {
        super();
        this.fileStructure = fileStructure;
        this.rootFileUri = rootFileUri;
        this.expectedReferences = expectedReferences;
        this.fileService = fileService;
        this.initService = initService;
        // create in-memory file system
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(this.fileService.registerProvider(Schemas.file, fileSystemProvider));
    }
    /**
     * Run the test.
     */
    async run() {
        // create the files structure on the disk
        await this.initService.createInstance(MockFilesystem, this.fileStructure).mock();
        // randomly test with and without delay to ensure that the file
        // reference resolution is not susceptible to race conditions
        if (randomBoolean()) {
            await waitRandom(5);
        }
        // start resolving references for the specified root file
        const rootReference = this._register(this.initService.createInstance(FilePromptParser, this.rootFileUri, [])).start();
        // wait until entire prompts tree is resolved
        await rootReference.allSettled();
        // resolve the root file reference including all nested references
        const resolvedReferences = rootReference.allReferences;
        for (let i = 0; i < this.expectedReferences.length; i++) {
            const expectedReference = this.expectedReferences[i];
            const resolvedReference = resolvedReferences[i];
            assert(resolvedReference && resolvedReference.uri.toString() === expectedReference.uri.toString(), [
                `Expected ${i}th resolved reference URI to be '${expectedReference.uri}'`,
                `got '${resolvedReference?.uri}'.`,
            ].join(', '));
            if (expectedReference.errorCondition === undefined) {
                assert(resolvedReference.errorCondition === undefined, [
                    `Expected ${i}th error condition to be 'undefined'`,
                    `got '${resolvedReference.errorCondition}'.`,
                ].join(', '));
                continue;
            }
            assert(expectedReference.errorCondition.equal(resolvedReference.errorCondition), [
                `Expected ${i}th error condition to be '${expectedReference.errorCondition}'`,
                `got '${resolvedReference.errorCondition}'.`,
            ].join(', '));
        }
        assert.strictEqual(resolvedReferences.length, this.expectedReferences.length, [
            `\nExpected(${this.expectedReferences.length}): [\n ${this.expectedReferences.join('\n ')}\n]`,
            `Received(${resolvedReferences.length}): [\n ${resolvedReferences.join('\n ')}\n]`,
        ].join('\n'));
    }
};
TestPromptFileReference = __decorate([
    __param(3, IFileService),
    __param(4, IInstantiationService)
], TestPromptFileReference);
/**
 * Create expected file reference for testing purposes.
 *
 * Note! This utility also use for `markdown links` at the moment.
 *
 * @param filePath The expected path of the file reference (without the `#file:` prefix).
 * @param lineNumber The expected line number of the file reference.
 * @param startColumnNumber The expected start column number of the file reference.
 */
const createTestFileReference = (filePath, lineNumber, startColumnNumber) => {
    const range = new Range(lineNumber, startColumnNumber, lineNumber, startColumnNumber + `#file:${filePath}`.length);
    return new FileReference(range, filePath);
};
suite('PromptFileReference (Unix)', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('• resolves nested file references', async function () {
        if (isWindows) {
            this.skip();
        }
        const rootFolderName = 'resolves-nested-file-references';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [
            {
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.prompt.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: '## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!\n ',
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n[](./some-other-folder/non-existing-folder)\n\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference\n\n\nand some\n non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                    },
                                    {
                                        name: 'file.txt',
                                        contents: 'contents of a non-prompt-snippet file',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                contents: `[](${rootFolder}/folder1/some-other-folder)\nanother-file.prompt.md contents\t [#file:file.txt](../file.txt)`,
                                            },
                                            {
                                                name: 'one_more_file_just_in_case.prompt.md',
                                                contents: 'one_more_file_just_in_case.prompt.md contents',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 14)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`./some-other-folder/non-existing-folder`, 2, 1), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/non-existing-folder'), 'Reference to non-existing file cannot be opened.')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`/${rootFolderName}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md`, 3, 26)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('.', 1, 1), new FolderReference(URI.joinPath(rootUri, './folder1/some-other-folder'), 'This folder is not a prompt file!')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder/yetAnotherFolder🤭'), createTestFileReference('../file.txt', 2, 35), new NotPromptFile(URI.joinPath(rootUri, './folder1/some-other-folder/file.txt'), 'Ughh oh, that is not a prompt file!')),
            new ExpectedReference(rootUri, createTestFileReference('./folder1/some-other-folder/file4.prompt.md', 3, 14)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('./some-non-existing/file.prompt.md', 1, 30), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/some-non-existing/file.prompt.md'), 'Failed to open non-existring prompt snippets file')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('./some-non-prompt-file.md', 5, 13), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/some-non-prompt-file.md'), 'Oh no!')),
            new ExpectedReference(URI.joinPath(rootUri, './some-other-folder/folder1'), createTestFileReference('../../folder1', 5, 48), new FolderReference(URI.joinPath(rootUri, './folder1'), 'Uggh ohh!')),
        ]));
        await test.run();
    });
    test('• does not fall into infinite reference recursion', async function () {
        if (isWindows) {
            this.skip();
        }
        const rootFolderName = 'infinite-recursion';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [
            {
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: `## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this #file:./folder1/some-other-folder/file4.prompt.md\n\n#file:${rootFolder}/folder1/some-other-folder/file5.prompt.md\t please!\n\t[some (snippet!) #name))](./file1.md)`,
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n\n\t- some seemingly random [another-file.prompt.md](${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md) contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:../some-non-existing/file.prompt.md\t\treference',
                                    },
                                    {
                                        name: 'file5.prompt.md',
                                        contents: 'this file has a relative recursive #file:../../file2.prompt.md\nreference\n ',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                // absolute path with recursion
                                                contents: `some test goes\t\nhere #file:${rootFolder}/file2.prompt.md`,
                                            },
                                            {
                                                name: 'one_more_file_just_in_case.prompt.md',
                                                contents: 'one_more_file_just_in_case.prompt.md contents',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 9)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md`, 3, 23)),
            /**
             * This reference should be resolved with a recursive
             * reference error condition. (the absolute reference case)
             */
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder/yetAnotherFolder🤭'), createTestFileReference(`${rootFolder}/file2.prompt.md`, 2, 6), new RecursiveReference(URI.joinPath(rootUri, './file2.prompt.md'), [
                '/infinite-recursion/file2.prompt.md',
                '/infinite-recursion/folder1/file3.prompt.md',
                '/infinite-recursion/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md',
                '/infinite-recursion/file2.prompt.md',
            ])),
            new ExpectedReference(rootUri, createTestFileReference('./folder1/some-other-folder/file4.prompt.md', 3, 14), undefined),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('../some-non-existing/file.prompt.md', 1, 30), new OpenFailed(URI.joinPath(rootUri, './folder1/some-non-existing/file.prompt.md'), 'Uggh ohh!')),
            new ExpectedReference(rootUri, createTestFileReference(`${rootFolder}/folder1/some-other-folder/file5.prompt.md`, 5, 1), undefined),
            /**
             * This reference should be resolved with a recursive
             * reference error condition. (the relative reference case)
             */
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('../../file2.prompt.md', 1, 36), new RecursiveReference(URI.joinPath(rootUri, './file2.prompt.md'), [
                '/infinite-recursion/file2.prompt.md',
                '/infinite-recursion/folder1/some-other-folder/file5.prompt.md',
                '/infinite-recursion/file2.prompt.md',
            ])),
            new ExpectedReference(rootUri, createTestFileReference('./file1.md', 6, 2), new NotPromptFile(URI.joinPath(rootUri, './file1.md'), 'Uggh oh!')),
        ]));
        await test.run();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFp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