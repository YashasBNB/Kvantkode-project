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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy9maWxlUHJvbXB0Q29udGVudHNQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtB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