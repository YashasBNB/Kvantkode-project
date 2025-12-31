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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlclN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL3dhdGNoZXJTdGF0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBR04sdUJBQXVCLEVBRXZCLHFCQUFxQixHQUNyQixNQUFNLHlCQUF5QixDQUFBO0FBSWhDLE1BQU0sVUFBVSxZQUFZLENBQzNCLFFBQWtDLEVBQ2xDLHVCQUErQixFQUMvQixnQkFBK0IsRUFDL0IsbUJBQWtDO0lBRWxDLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQTtJQUUxQixNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUM1QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUM5RCxDQUFBO0lBQ0QsTUFBTSw2QkFBNkIsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQ2hFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxDQUM1RCxDQUFBO0lBQ0QsTUFBTSxpQ0FBaUMsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQ3BFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxDQUNoRSxDQUFBO0lBQ0QsTUFBTSxvQ0FBb0MsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQ3ZFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUMzRCxDQUFBO0lBRUQsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0Is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