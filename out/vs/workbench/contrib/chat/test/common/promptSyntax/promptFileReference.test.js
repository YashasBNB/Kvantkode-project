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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9wcm9tcHRGaWxlUmVmZXJlbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVB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