/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { wait } from '../../../../../../../base/test/common/testUtils.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { NullPolicyService } from '../../../../../../../platform/policy/common/policy.js';
import { Line } from '../../../../../../../editor/common/codecs/linesCodec/tokens/line.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { LinesDecoder } from '../../../../../../../editor/common/codecs/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FilePromptContentProvider } from '../../../../common/promptSyntax/contentProviders/filePromptContentsProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
suite('FilePromptContentsProvider', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        const fileSystemProvider = testDisposables.add(new InMemoryFileSystemProvider());
        testDisposables.add(nullFileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('provides contents of a file', async function () {
        const fileService = instantiationService.get(IFileService);
        const fileName = `file-${randomInt(10000)}.prompt.md`;
        const fileUri = URI.file(`/${fileName}`);
        if (await fileService.exists(fileUri)) {
            await fileService.del(fileUri);
        }
        await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
        await wait(5);
        const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri));
        let streamOrError;
        testDisposables.add(contentsProvider.onContentChanged((event) => {
            streamOrError = event;
        }));
        contentsProvider.start();
        await wait(25);
        assertDefined(streamOrError, 'The `streamOrError` must be defined.');
        assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
        const stream = new LinesDecoder(streamOrError);
        const receivedLines = await stream.consumeAll();
        assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
        const expectedLine = new Line(1, 'Hello, world!');
        const receivedLine = receivedLines[0];
        assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDbkcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixF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