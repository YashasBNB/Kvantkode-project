/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isUUID } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { sortExtensionVersions, } from '../../common/extensionGalleryService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { resolveMarketplaceHeaders } from '../../../externalServices/common/marketplace.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
import { TELEMETRY_SETTING_ID, } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class EnvironmentServiceMock extends mock() {
    constructor(serviceMachineIdResource) {
        super();
        this.serviceMachineIdResource = serviceMachineIdResource;
        this.isBuilt = true;
    }
}
suite('Extension Gallery Service', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileService, environmentService, storageService, productService, configurationService;
    setup(() => {
        const serviceMachineIdResource = joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'machineid');
        environmentService = new EnvironmentServiceMock(serviceMachineIdResource);
        fileService = disposables.add(new FileService(new NullLogService()));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(serviceMachineIdResource.scheme, fileSystemProvider));
        storageService = disposables.add(new InMemoryStorageService());
        configurationService = new TestConfigurationService({
            [TELEMETRY_SETTING_ID]: "all" /* TelemetryConfiguration.ON */,
        });
        configurationService.updateValue(TELEMETRY_SETTING_ID, "all" /* TelemetryConfiguration.ON */);
        productService = { _serviceBrand: undefined, ...product, enableTelemetry: true };
    });
    test('marketplace machine id', async () => {
        const headers = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.ok(headers['X-Market-User-Id']);
        assert.ok(isUUID(headers['X-Market-User-Id']));
        const headers2 = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.strictEqual(headers['X-Market-User-Id'], headers2['X-Market-User-Id']);
    });
    test('sorting single extension version without target platform', async () => {
        const actual = [aExtensionVersion('1.1.2')];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with preferred target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-x64" /* TargetPlatform.DARWIN_X64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with not compatible target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-x64" /* TargetPlatform.WIN32_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions without target platforms', async () => {
        const actual = [
            aExtensionVersion('1.2.4'),
            aExtensionVersion('1.1.3'),
            aExtensionVersion('1.1.2'),
            aExtensionVersion('1.1.1'),
        ];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 1', async () => {
        const actual = [
            aExtensionVersion('1.2.4', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */),
            aExtensionVersion('1.2.4', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */),
            aExtensionVersion('1.2.4', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */),
            aExtensionVersion('1.1.3'),
            aExtensionVersion('1.1.2'),
            aExtensionVersion('1.1.1'),
        ];
        const expected = [actual[1], actual[0], actual[2], actual[3], actual[4], actual[5]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 2', async () => {
        const actual = [
            aExtensionVersion('1.2.4'),
            aExtensionVersion('1.2.3', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */),
            aExtensionVersion('1.2.3', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */),
            aExtensionVersion('1.2.3', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */),
            aExtensionVersion('1.1.2'),
            aExtensionVersion('1.1.1'),
        ];
        const expected = [actual[0], actual[3], actual[1], actual[2], actual[4], actual[5]];
        sortExtensionVersions(actual, "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 3', async () => {
        const actual = [
            aExtensionVersion('1.2.4'),
            aExtensionVersion('1.1.2'),
            aExtensionVersion('1.1.1'),
            aExtensionVersion('1.0.0', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */),
            aExtensionVersion('1.0.0', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */),
        ];
        const expected = [actual[0], actual[1], actual[2], actual[4], actual[3]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    function aExtensionVersion(version, targetPlatform) {
        return { version, targetPlatform };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBRXpHLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRXhELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxzQkFBc0IsRUFBbUIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHVD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