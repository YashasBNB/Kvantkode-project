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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29udGFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi93b3Jrc3BhY2VDb250YWlucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFxQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFLM0QsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUE7QUFtQnZDLE1BQU0sVUFBVSx1Q0FBdUMsQ0FDdEQsSUFBOEIsRUFDOUIsSUFBMkI7SUFFM0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDOUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDdkIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUE7SUFDOUIsTUFBTSxZQUFZLEdBQWEsRUFBRSxD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TUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQzlEO1FBQ0MsT0FBTyxFQUFFLGFBQWE7UUFDdEIsY0FBYyxFQUFFLFFBQVE7UUFDeEIsTUFBTSxFQUFFLElBQUk7S0FDWixDQUNELENBQUE7SUFFRCxPQUFPLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDakQsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNWLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7SUFDekIsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUMsQ0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9