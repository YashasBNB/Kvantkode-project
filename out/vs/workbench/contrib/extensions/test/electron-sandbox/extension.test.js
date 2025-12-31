/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Extension } from '../../browser/extensionsWorkbenchService.js';
import { URI } from '../../../../../base/common/uri.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Extension Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IProductService, { quality: 'insiders' });
    });
    test('extension is not outdated when there is no local and gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is local and no gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), undefined, undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when there is no local and has gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, undefined, aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension(), aGalleryExtension(), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local is older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is built in and older than gallery', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local is built in and older than gallery but product quality is stable', () => {
        instantiationService.stub(IProductService, { quality: 'stable' });
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are on same version but on different target platforms', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "win32-arm64" /* TargetPlatform.WIN32_ARM64 */ }), aGalleryExtension('somext', {}, { targetPlatform: "win32-x64" /* TargetPlatform.WIN32_X64 */ }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is not outdated when local and gallery are on same version and local is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), aGalleryExtension('somext'), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local and gallery are on same version and gallery is on web', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext'), aGalleryExtension('somext', {}, { targetPlatform: "web" /* TargetPlatform.WEB */ }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is not outdated when local is not pre-release but gallery is pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, false);
    });
    test('extension is outdated when local and gallery are pre-releases', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted to pre-release but current version is not pre-release', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }, { isPreReleaseVersion: true }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local is pre-release but gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: true }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    test('extension is outdated when local was opted pre-release but current version is not and gallery is not', () => {
        const extension = instantiationService.createInstance(Extension, () => 1 /* ExtensionState.Installed */, () => undefined, undefined, aLocalExtension('somext', { version: '1.0.0' }, { preRelease: true, isPreReleaseVersion: false }), aGalleryExtension('somext', { version: '1.0.1' }), undefined);
        assert.strictEqual(extension.outdated, true);
    });
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            ...properties,
        };
        return Object.create({ manifest, ...properties });
    }
    function aGalleryExtension(name = 'somext', properties = {}, galleryExtensionProperties = {}) {
        const targetPlatform = galleryExtensionProperties.targetPlatform ?? "undefined" /* TargetPlatform.UNDEFINED */;
        const galleryExtension = (Object.create({
            name,
            publisher: 'pub',
            version: '1.0.0',
            allTargetPlatforms: [targetPlatform],
            properties: {},
            assets: {},
            ...properties,
        }));
        galleryExtension.properties = {
            ...galleryExtension.properties,
            dependencies: [],
            targetPlatform,
            ...galleryExtensionProperties,
        };
        galleryExtension.identifier = {
            id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name),
            uuid: generateUuid(),
        };
        return galleryExtension;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBV3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNySCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxJQUFJLG9CQUE4QyxDQUFBO0lBRWxELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4REFBOEQsRUFBRSxHQUFHLEVBQUU7UUFDekUsTUFBTSxTQUFTLEdB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