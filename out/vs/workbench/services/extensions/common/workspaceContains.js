/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { QueryBuilder } from '../../search/common/queryBuilder.js';
import { ISearchService } from '../../search/common/search.js';
import { toWorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
const WORKSPACE_CONTAINS_TIMEOUT = 7000;
export function checkActivateWorkspaceContainsExtension(host, desc) {
    const activationEvents = desc.activationEvents;
    if (!activationEvents) {
        return Promise.resolve(undefined);
    }
    const fileNames = [];
    const globPatterns = [];
    for (const activationEvent of activationEvents) {
        if (/^workspaceContains:/.test(activationEvent)) {
            const fileNameOrGlob = activationEvent.substr('workspaceContains:'.length);
            if (fileNameOrGlob.indexOf('*') >= 0 ||
                fileNameOrGlob.indexOf('?') >= 0 ||
                host.forceUsingSearch) {
                globPatterns.push(fileNameOrGlob);
            }
            else {
                fileNames.push(fileNameOrGlob);
            }
        }
    }
    if (fileNames.length === 0 && globPatterns.length === 0) {
        return Promise.resolve(undefined);
    }
    const { promise, resolve } = promiseWithResolvers();
    const activate = (activationEvent) => resolve({ activationEvent });
    const fileNamePromise = Promise.all(fileNames.map((fileName) => _activateIfFileName(host, fileName, activate))).then(() => { });
    const globPatternPromise = _activateIfGlobPatterns(host, desc.identifier, globPatterns, activate);
    Promise.all([fileNamePromise, globPatternPromise]).then(() => {
        // when all are done, resolve with undefined (relevant only if it was not activated so far)
        resolve(undefined);
    });
    return promise;
}
async function _activateIfFileName(host, fileName, activate) {
    // find exact path
    for (const uri of host.folders) {
        if (await host.exists(resources.joinPath(URI.revive(uri), fileName))) {
            // the file was found
            activate(`workspaceContains:${fileName}`);
            return;
        }
    }
}
async function _activateIfGlobPatterns(host, extensionId, globPatterns, activate) {
    if (globPatterns.length === 0) {
        return Promise.resolve(undefined);
    }
    const tokenSource = new CancellationTokenSource();
    const searchP = host.checkExists(host.folders, globPatterns, tokenSource.token);
    const timer = setTimeout(async () => {
        tokenSource.cancel();
        host.logService.info(`Not activating extension '${extensionId.value}': Timed out while searching for 'workspaceContains' pattern ${globPatterns.join(',')}`);
    }, WORKSPACE_CONTAINS_TIMEOUT);
    let exists = false;
    try {
        exists = await searchP;
    }
    catch (err) {
        if (!errors.isCancellationError(err)) {
            errors.onUnexpectedError(err);
        }
    }
    tokenSource.dispose();
    clearTimeout(timer);
    if (exists) {
        // a file was found matching one of the glob patterns
        activate(`workspaceContains:${globPatterns.join(',')}`);
    }
}
export function checkGlobFileExists(accessor, folders, includes, token) {
    const instantiationService = accessor.get(IInstantiationService);
    const searchService = accessor.get(ISearchService);
    const queryBuilder = instantiationService.createInstance(QueryBuilder);
    const query = queryBuilder.file(folders.map((folder) => toWorkspaceFolder(URI.revive(folder))), {
        _reason: 'checkExists',
        includePattern: includes,
        exists: true,
    });
    return searchService.fileSearch(query, token).then((result) => {
        return !!result.limitHit;
    }, (err) => {
        if (!errors.isCancellationError(err)) {
            return Promise.reject(err);
        }
        return false;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29udGFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vd29ya3NwYWNlQ29udGFpbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBcUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBSzNELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZFLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFBO0FBbUJ2QyxNQUFNLFVBQVUsdUNBQXVDLENBQ3RELElBQThCLEVBQzlCLElBQTJCO0lBRTNCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzlDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFBO0lBQzlCLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQTtJQUVqQyxLQUFLLE1BQU0sZUFB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