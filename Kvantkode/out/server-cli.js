/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-server.js'; // this MUST come before other imports as it changes global state
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { devInjectNodeModuleLookupPath } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
// NLS
const nlsConfiguration = await resolveNLSConfiguration({
    userLocale: 'en',
    osLocale: 'en',
    commit: product.commit,
    userDataPath: '',
    nlsMetadataPath: __dirname,
});
process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfiguration); // required for `bootstrap-esm` to pick up NLS messages
if (process.env['VSCODE_DEV']) {
    // When running out of sources, we need to load node modules from remote/node_modules,
    // which are compiled against nodejs, not electron
    process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] =
        process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'] ||
            join(__dirname, '..', 'remote', 'node_modules');
    devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
}
else {
    delete process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH'];
}
// Bootstrap ESM
await bootstrapESM();
// Load Server
await import('./vs/server/node/server.cli.js');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLWNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsic2VydmVyLWNsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHVCQUF1QixDQUFBLENBQUMsaUVBQWlFO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxLQUFLLENBQUE7QUFDbkMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU3QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUV6RCxNQUFNO0FBQ04sTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHVCQUF1QixDQUFDO0lBQ3RELFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFFBQVEsRUFBRSxJQUFJO0lBQ2QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0lBQ3RCLFlBQVksRUFBRSxFQUFFO0lBQ2hCLGVBQWUsRUFBRSxTQUFTO0NBQzFCLENBQUMsQ0FBQTtBQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUEsQ0FBQyx1REFBdUQ7QUFFM0gsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7SUFDL0Isc0ZBQXNGO0lBQ3RGLGtEQUFrRDtJQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDO1FBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ2hELDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxDQUFBO0FBQ3hGLENBQUM7S0FBTSxDQUFDO0lBQ1AsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUE7QUFDaEUsQ0FBQztBQUVELGdCQUFnQjtBQUNoQixNQUFNLFlBQVksRUFBRSxDQUFBO0FBRXBCLGNBQWM7QUFDZCxNQUFNLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBIn0=