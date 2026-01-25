/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MockFilesystem } from './mockFilesystem.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
/**
 * Validates that file at {@link filePath} has expected attributes.
 */
const validateFile = async (filePath, expectedFile, fileService) => {
    let readFile;
    try {
        readFile = await fileService.resolve(URI.file(filePath));
    }
    catch (error) {
        throw new Error(`Failed to read file '${filePath}': ${error}.`);
    }
    assert.strictEqual(readFile.name, expectedFile.name, `File '${filePath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFile.resource, expectedFile.resource, `File '${filePath}' must have correct 'URI'.`);
    assert.strictEqual(readFile.isFile, expectedFile.isFile, `File '${filePath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFile.isDirectory, expectedFile.isDirectory, `File '${filePath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFile.isSymbolicLink, expectedFile.isSymbolicLink, `File '${filePath}' must have correct 'isSymbolicLink' value.`);
    assert.strictEqual(readFile.children, undefined, `File '${filePath}' must not have children.`);
    const fileContents = await fileService.readFile(readFile.resource);
    assert.strictEqual(fileContents.value.toString(), expectedFile.contents, `File '${expectedFile.resource.fsPath}' must have correct contents.`);
};
/**
 * Validates that folder at {@link folderPath} has expected attributes.
 */
const validateFolder = async (folderPath, expectedFolder, fileService) => {
    let readFolder;
    try {
        readFolder = await fileService.resolve(URI.file(folderPath));
    }
    catch (error) {
        throw new Error(`Failed to read folder '${folderPath}': ${error}.`);
    }
    assert.strictEqual(readFolder.name, expectedFolder.name, `Folder '${folderPath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFolder.resource, expectedFolder.resource, `Folder '${folderPath}' must have correct 'URI'.`);
    assert.strictEqual(readFolder.isFile, expectedFolder.isFile, `Folder '${folderPath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFolder.isDirectory, expectedFolder.isDirectory, `Folder '${folderPath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFolder.isSymbolicLink, expectedFolder.isSymbolicLink, `Folder '${folderPath}' must have correct 'isSymbolicLink' value.`);
    assertDefined(readFolder.children, `Folder '${folderPath}' must have children.`);
    assert.strictEqual(readFolder.children.length, expectedFolder.children.length, `Folder '${folderPath}' must have correct number of children.`);
    for (const expectedChild of expectedFolder.children) {
        const childPath = URI.joinPath(expectedFolder.resource, expectedChild.name).fsPath;
        if ('children' in expectedChild) {
            await validateFolder(childPath, expectedChild, fileService);
            continue;
        }
        await validateFile(childPath, expectedChild, fileService);
    }
};
suite('MockFilesystem', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let initService;
    let fileService;
    setup(async () => {
        initService = disposables.add(new TestInstantiationService());
        initService.stub(ILogService, new NullLogService());
        fileService = disposables.add(initService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        initService.stub(IFileService, fileService);
    });
    test('• mocks file structure', async () => {
        const mockFilesystem = initService.createInstance(MockFilesystem, [
            {
                name: '/root/folder',
                children: [
                    {
                        name: 'file.txt',
                        contents: 'contents',
                    },
                    {
                        name: 'Subfolder',
                        children: [
                            {
                                name: 'test.ts',
                                contents: 'other contents',
                            },
                            {
                                name: 'file.test.ts',
                                contents: 'hello test',
                            },
                            {
                                name: '.file-2.TEST.ts',
                                contents: 'test hello',
                            },
                        ],
                    },
                ],
            },
        ]);
        await mockFilesystem.mock();
        /**
         * Validate files and folders next.
         */
        await validateFolder('/root/folder', {
            resource: URI.file('/root/folder'),
            name: 'folder',
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
            children: [
                {
                    resource: URI.file('/root/folder/file.txt'),
                    name: 'file.txt',
                    isFile: true,
                    isDirectory: false,
                    isSymbolicLink: false,
                    contents: 'contents',
                },
                {
                    resource: URI.file('/root/folder/Subfolder'),
                    name: 'Subfolder',
                    isFile: false,
                    isDirectory: true,
                    isSymbolicLink: false,
                    children: [
                        {
                            resource: URI.file('/root/folder/Subfolder/test.ts'),
                            name: 'test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'other contents',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/file.test.ts'),
                            name: 'file.test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'hello test',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/.file-2.TEST.ts'),
                            name: '.file-2.TEST.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'test hello',
                        },
                    ],
                },
            ],
        }, fileService);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL21vY2tGaWxlc3lzdGVtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0scURBQXFELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDckgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUE7QUE0QjlIOztHQUVHO0FBQ0gsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUN6QixRQUFnQixFQUNoQixZQUEyQixFQUMzQixXQUF5QixFQUN4QixFQUFFO0lBQ0gsSUFBSSxRQUErQixDQUFBO0lBQ25DLElBQUksQ0FBQztRQUNKLFFBQVEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUks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