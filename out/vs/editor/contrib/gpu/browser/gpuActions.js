/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { ensureNonNullable } from '../../../browser/gpu/gpuUtils.js';
import { GlyphRasterizer } from '../../../browser/gpu/raster/glyphRasterizer.js';
import { ViewGpuContext } from '../../../browser/gpu/viewGpuContext.js';
class DebugEditorGpuRendererAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.debugEditorGpuRenderer',
            label: localize2('gpuDebug.label', 'Developer: Debug Editor GPU Renderer'),
            // TODO: Why doesn't `ContextKeyExpr.equals('config:editor.experimentalGpuAcceleration', 'on')` work?
            precondition: ContextKeyExpr.true(),
        });
    }
    async run(accessor, editor) {
        const instantiationService = accessor.get(IInstantiationService);
        const quickInputService = accessor.get(IQuickInputService);
        const choice = await quickInputService.pick([
            {
                label: localize('logTextureAtlasStats.label', 'Log Texture Atlas Stats'),
                id: 'logTextureAtlasStats',
            },
            {
                label: localize('saveTextureAtlas.label', 'Save Texture Atlas'),
                id: 'saveTextureAtlas',
            },
            {
                label: localize('drawGlyph.label', 'Draw Glyph'),
                id: 'drawGlyph',
            },
        ], { canPickMany: false });
        if (!choice) {
            return;
        }
        switch (choice.id) {
            case 'logTextureAtlasStats':
                instantiationService.invokeFunction((accessor) => {
                    const logService = accessor.get(ILogService);
                    const atlas = ViewGpuContext.atlas;
                    if (!ViewGpuContext.atlas) {
                        logService.error('No texture atlas found');
                        return;
                    }
                    const stats = atlas.getStats();
                    logService.info(['Texture atlas stats', ...stats].join('\n\n'));
                });
                break;
            case 'saveTextureAtlas':
                instantiationService.invokeFunction(async (accessor) => {
                    const workspaceContextService = accessor.get(IWorkspaceContextService);
                    const fileService = accessor.get(IFileService);
                    const folders = workspaceContextService.getWorkspace().folders;
                    if (folders.length > 0) {
                        const atlas = ViewGpuContext.atlas;
                        const promises = [];
                        for (const [layerIndex, page] of atlas.pages.entries()) {
                            promises.push(...[
                                fileService.writeFile(URI.joinPath(folders[0].uri, `textureAtlasPage${layerIndex}_actual.png`), VSBuffer.wrap(new Uint8Array(await (await page.source.convertToBlob()).arrayBuffer()))),
                                fileService.writeFile(URI.joinPath(folders[0].uri, `textureAtlasPage${layerIndex}_usage.png`), VSBuffer.wrap(new Uint8Array(await (await page.getUsagePreview()).arrayBuffer()))),
                            ]);
                        }
                        await Promise.all(promises);
                    }
                });
                break;
            case 'drawGlyph':
                instantiationService.invokeFunction(async (accessor) => {
                    const configurationService = accessor.get(IConfigurationService);
                    const fileService = accessor.get(IFileService);
                    const quickInputService = accessor.get(IQuickInputService);
                    const workspaceContextService = accessor.get(IWorkspaceContextService);
                    const folders = workspaceContextService.getWorkspace().folders;
                    if (folders.length === 0) {
                        return;
                    }
                    const atlas = ViewGpuContext.atlas;
                    const fontFamily = configurationService.getValue('editor.fontFamily');
                    const fontSize = configurationService.getValue('editor.fontSize');
                    const rasterizer = new GlyphRasterizer(fontSize, fontFamily, getActiveWindow().devicePixelRatio);
                    let chars = await quickInputService.input({
                        prompt: 'Enter a character to draw (prefix with 0x for code point))',
                    });
                    if (!chars) {
                        return;
                    }
                    const codePoint = chars.match(/0x(?<codePoint>[0-9a-f]+)/i)?.groups?.codePoint;
                    if (codePoint !== undefined) {
                        chars = String.fromCodePoint(parseInt(codePoint, 16));
                    }
                    const tokenMetadata = 0;
                    const charMetadata = 0;
                    const rasterizedGlyph = atlas.getGlyph(rasterizer, chars, tokenMetadata, charMetadata, 0);
                    if (!rasterizedGlyph) {
                        return;
                    }
                    const imageData = atlas.pages[rasterizedGlyph.pageIndex].source
                        .getContext('2d')
                        ?.getImageData(rasterizedGlyph.x, rasterizedGlyph.y, rasterizedGlyph.w, rasterizedGlyph.h);
                    if (!imageData) {
                        return;
                    }
                    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
                    const ctx = ensureNonNullable(canvas.getContext('2d'));
                    ctx.putImageData(imageData, 0, 0);
                    const blob = await canvas.convertToBlob({ type: 'image/png' });
                    const resource = URI.joinPath(folders[0].uri, `glyph_${chars}_${tokenMetadata}_${fontSize}px_${fontFamily.replaceAll(/[,\\\/\.'\s]/g, '_')}.png`);
                    await fileService.writeFile(resource, VSBuffer.wrap(new Uint8Array(await blob.arrayBuffer())));
                });
                break;
        }
    }
}
registerEditorAction(DebugEditorGpuRendererAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dwdS9icm93c2VyL2dwdUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3RixPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUVwQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsTUFBTSw0QkFBNkIsU0FBUSxZQUFZO0lB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