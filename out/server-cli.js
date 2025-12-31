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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLWNsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInNlcnZlci1jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQSxDQUFDLGlFQUFpRTtBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUNwQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFBO0FBQ25DLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFN0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFekQsTUFBTTtBQUNOLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztJQUN0RCxVQUFVLEVBQUUsSUFBSTtJQUNoQixRQUFRLEVBQUUsSUFBSTtJQUNkLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtJQUN0QixZQUFZLEVBQUUsRUFBRTtJQUNoQixlQUFlLEVBQUUsU0FBUztDQUMxQixDQUFDLENBQUE7QUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBLENBQUMsdURBQXVEO0FBRTNILElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO0lBQy9CLHNGQUFzRjtJQUN0RixrREFBa0Q7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNoRCw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsQ0FBQTtBQUN4RixDQUFDO0tBQU0sQ0FBQztJQUNQLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO0FBQ2hFLENBQUM7QUFFRCxnQkFBZ0I7QUFDaEIsTUFBTSxZQUFZLEVBQUUsQ0FBQTtBQUVwQixjQUFjO0FBQ2QsTUFBTSxNQUFNLENBQUMsZ0NBQWdDLENBQUMsQ0FBQSJ9