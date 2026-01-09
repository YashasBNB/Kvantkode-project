/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isRecursiveWatchRequest, requestFilterToString, } from '../../common/watcher.js';
export function computeStats(requests, failedRecursiveRequests, recursiveWatcher, nonRecursiveWatcher) {
    const lines = [];
    const allRecursiveRequests = sortByPathPrefix(requests.filter((request) => isRecursiveWatchRequest(request)));
    const nonSuspendedRecursiveRequests = allRecursiveRequests.filter((request) => recursiveWatcher.isSuspended(request) === false);
    const suspendedPollingRecursiveRequests = allRecursiveRequests.filter((request) => recursiveWatcher.isSuspended(request) === 'polling');
    const suspendedNonPollingRecursiveRequests = allRecursiveRequests.filter((request) => recursiveWatcher.isSuspended(request) === true);
    const recursiveRequestsStatus = computeRequestStatus(allRecursiveRequests, recursiveWatcher);
    const recursiveWatcherStatus = computeRecursiveWatchStatus(recursiveWatcher);
    const allNonRecursiveRequests = sortByPathPrefix(requests.filter((request) => !isRecursiveWatchRequest(request)));
    const nonSuspendedNonRecursiveRequests = allNonRecursiveRequests.filter((request) => nonRecursiveWatcher.isSuspended(request) === false);
    const suspendedPollingNonRecursiveRequests = allNonRecursiveRequests.filter((request) => nonRecursiveWatcher.isSuspended(request) === 'polling');
    const suspendedNonPollingNonRecursiveRequests = allNonRecursiveRequests.filter((request) => nonRecursiveWatcher.isSuspended(request) === true);
    const nonRecursiveRequestsStatus = computeRequestStatus(allNonRecursiveRequests, nonRecursiveWatcher);
    const nonRecursiveWatcherStatus = computeNonRecursiveWatchStatus(nonRecursiveWatcher);
    lines.push('[Summary]');
    lines.push(`- Recursive Requests:     total: ${allRecursiveRequests.length}, suspended: ${recursiveRequestsStatus.suspended}, polling: ${recursiveRequestsStatus.polling}, failed: ${failedRecursiveRequests}`);
    lines.push(`- Non-Recursive Requests: total: ${allNonRecursiveRequests.length}, suspended: ${nonRecursiveRequestsStatus.suspended}, polling: ${nonRecursiveRequestsStatus.polling}`);
    lines.push(`- Recursive Watchers:     total: ${Array.from(recursiveWatcher.watchers).length}, active: ${recursiveWatcherStatus.active}, failed: ${recursiveWatcherStatus.failed}, stopped: ${recursiveWatcherStatus.stopped}`);
    lines.push(`- Non-Recursive Watchers: total: ${Array.from(nonRecursiveWatcher.watchers).length}, active: ${nonRecursiveWatcherStatus.active}, failed: ${nonRecursiveWatcherStatus.failed}, reusing: ${nonRecursiveWatcherStatus.reusing}`);
    lines.push(`- I/O Handles Impact:     total: ${recursiveRequestsStatus.polling + nonRecursiveRequestsStatus.polling + recursiveWatcherStatus.active + nonRecursiveWatcherStatus.active}`);
    lines.push(`\n[Recursive Requests (${allRecursiveRequests.length}, suspended: ${recursiveRequestsStatus.suspended}, polling: ${recursiveRequestsStatus.polling})]:`);
    const recursiveRequestLines = [];
    for (const request of [
        nonSuspendedRecursiveRequests,
        suspendedPollingRecursiveRequests,
        suspendedNonPollingRecursiveRequests,
    ].flat()) {
        fillRequestStats(recursiveRequestLines, request, recursiveWatcher);
    }
    lines.push(...alignTextColumns(recursiveRequestLines));
    const recursiveWatcheLines = [];
    fillRecursiveWatcherStats(recursiveWatcheLines, recursiveWatcher);
    lines.push(...alignTextColumns(recursiveWatcheLines));
    lines.push(`\n[Non-Recursive Requests (${allNonRecursiveRequests.length}, suspended: ${nonRecursiveRequestsStatus.suspended}, polling: ${nonRecursiveRequestsStatus.polling})]:`);
    const nonRecursiveRequestLines = [];
    for (const request of [
        nonSuspendedNonRecursiveRequests,
        suspendedPollingNonRecursiveRequests,
        suspendedNonPollingNonRecursiveRequests,
    ].flat()) {
        fillRequestStats(nonRecursiveRequestLines, request, nonRecursiveWatcher);
    }
    lines.push(...alignTextColumns(nonRecursiveRequestLines));
    const nonRecursiveWatcheLines = [];
    fillNonRecursiveWatcherStats(nonRecursiveWatcheLines, nonRecursiveWatcher);
    lines.push(...alignTextColumns(nonRecursiveWatcheLines));
    return `\n\n[File Watcher] request stats:\n\n${lines.join('\n')}\n\n`;
}
function alignTextColumns(lines) {
    let maxLength = 0;
    for (const line of lines) {
        maxLength = Math.max(maxLength, line.split('\t')[0].length);
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t');
        if (parts.length === 2) {
            const padding = ' '.repeat(maxLength - parts[0].length);
            lines[i] = `${parts[0]}${padding}\t${parts[1]}`;
        }
    }
    return lines;
}
function computeRequestStatus(requests, watcher) {
    let polling = 0;
    let suspended = 0;
    for (const request of requests) {
        const isSuspended = watcher.isSuspended(request);
        if (isSuspended === false) {
            continue;
        }
        suspended++;
        if (isSuspended === 'polling') {
            polling++;
        }
    }
    return { suspended, polling };
}
function computeRecursiveWatchStatus(recursiveWatcher) {
    let active = 0;
    let failed = 0;
    let stopped = 0;
    for (const watcher of recursiveWatcher.watchers) {
        if (!watcher.failed && !watcher.stopped) {
            active++;
        }
        if (watcher.failed) {
            failed++;
        }
        if (watcher.stopped) {
            stopped++;
        }
    }
    return { active, failed, stopped };
}
function computeNonRecursiveWatchStatus(nonRecursiveWatcher) {
    let active = 0;
    let failed = 0;
    let reusing = 0;
    for (const watcher of nonRecursiveWatcher.watchers) {
        if (!watcher.instance.failed && !watcher.instance.isReusingRecursiveWatcher) {
            active++;
        }
        if (watcher.instance.failed) {
            failed++;
        }
        if (watcher.instance.isReusingRecursiveWatcher) {
            reusing++;
        }
    }
    return { active, failed, reusing };
}
function sortByPathPrefix(requests) {
    requests.sort((r1, r2) => {
        const p1 = isUniversalWatchRequest(r1) ? r1.path : r1.request.path;
        const p2 = isUniversalWatchRequest(r2) ? r2.path : r2.request.path;
        const minLength = Math.min(p1.length, p2.length);
        for (let i = 0; i < minLength; i++) {
            if (p1[i] !== p2[i]) {
                return p1[i] < p2[i] ? -1 : 1;
            }
        }
        return p1.length - p2.length;
    });
    return requests;
}
function isUniversalWatchRequest(obj) {
    const candidate = obj;
    return typeof candidate?.path === 'string';
}
function fillRequestStats(lines, request, watcher) {
    const decorations = [];
    const suspended = watcher.isSuspended(request);
    if (suspended !== false) {
        if (suspended === 'polling') {
            decorations.push('[SUSPENDED <polling>]');
        }
        else {
            decorations.push('[SUSPENDED <non-polling>]');
        }
    }
    lines.push(` ${request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(request)})`);
}
function requestDetailsToString(request) {
    return `excludes: ${request.excludes.length > 0 ? request.excludes : '<none>'}, includes: ${request.includes && request.includes.length > 0 ? JSON.stringify(request.includes) : '<all>'}, filter: ${requestFilterToString(request.filter)}, correlationId: ${typeof request.correlationId === 'number' ? request.correlationId : '<none>'}`;
}
function fillRecursiveWatcherStats(lines, recursiveWatcher) {
    const watchers = sortByPathPrefix(Array.from(recursiveWatcher.watchers));
    const { active, failed, stopped } = computeRecursiveWatchStatus(recursiveWatcher);
    lines.push(`\n[Recursive Watchers (${watchers.length}, active: ${active}, failed: ${failed}, stopped: ${stopped})]:`);
    for (const watcher of watchers) {
        const decorations = [];
        if (watcher.failed) {
            decorations.push('[FAILED]');
        }
        if (watcher.stopped) {
            decorations.push('[STOPPED]');
        }
        if (watcher.subscriptionsCount > 0) {
            decorations.push(`[SUBSCRIBED:${watcher.subscriptionsCount}]`);
        }
        if (watcher.restarts > 0) {
            decorations.push(`[RESTARTED:${watcher.restarts}]`);
        }
        lines.push(` ${watcher.request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(watcher.request)})`);
    }
}
function fillNonRecursiveWatcherStats(lines, nonRecursiveWatcher) {
    const allWatchers = sortByPathPrefix(Array.from(nonRecursiveWatcher.watchers));
    const activeWatchers = allWatchers.filter((watcher) => !watcher.instance.failed && !watcher.instance.isReusingRecursiveWatcher);
    const failedWatchers = allWatchers.filter((watcher) => watcher.instance.failed);
    const reusingWatchers = allWatchers.filter((watcher) => watcher.instance.isReusingRecursiveWatcher);
    const { active, failed, reusing } = computeNonRecursiveWatchStatus(nonRecursiveWatcher);
    lines.push(`\n[Non-Recursive Watchers (${allWatchers.length}, active: ${active}, failed: ${failed}, reusing: ${reusing})]:`);
    for (const watcher of [activeWatchers, failedWatchers, reusingWatchers].flat()) {
        const decorations = [];
        if (watcher.instance.failed) {
            decorations.push('[FAILED]');
        }
        if (watcher.instance.isReusingRecursiveWatcher) {
            decorations.push('[REUSING]');
        }
        lines.push(` ${watcher.request.path}\t${decorations.length > 0 ? decorations.join(' ') + ' ' : ''}(${requestDetailsToString(watcher.request)})`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlclN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvd2F0Y2hlclN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTix1QkFBdUIsRUFFdkIscUJBQXFCLEdBQ3JCLE1BQU0seUJBQXlCLENBQUE7QUFJaEMsTUFBTSxVQUFVLFlBQVksQ0FDM0IsUUFBa0MsRUFDbEMsdUJBQStCLEVBQy9CLGdCQUErQixFQUMvQixtQkFBa0M7SUFFbEMsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFBO0lBRTFCLE1BQU0sb0JBQW9CLEdBQUcsZ0JBQWdCLENBQzVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQzlELENBQUE7SUFDRCxNQUFNLDZCQUE2QixHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FDaEUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLENBQzVELENBQUE7SUFDRCxNQUFNLGlDQUFpQyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FDcEUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLENBQ2hFLENBQUE7SUFDRCxNQUFNLG9DQUFvQyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FDdkUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQzNELENBQUE7SUFFRCxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixD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