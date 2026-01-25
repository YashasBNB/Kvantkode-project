/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Sequencer } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { joinPath } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService, toFileOperationResult, } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatModel, normalizeSerializableChatData, } from './chatModel.js';
const maxPersistedSessions = 25;
const ChatIndexStorageKey = 'chat.ChatSessionStore.index';
// const ChatTransferIndexStorageKey = 'ChatSessionStore.transferIndex';
let ChatSessionStore = class ChatSessionStore extends Disposable {
    constructor(fileService, environmentService, logService, workspaceContextService, telemetryService, storageService, lifecycleService, userDataProfilesService) {
        super();
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.workspaceContextService = workspaceContextService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.lifecycleService = lifecycleService;
        this.userDataProfilesService = userDataProfilesService;
        // private readonly transferredSessionStorageRoot: URI;
        this.storeQueue = new Sequencer();
        this.shuttingDown = false;
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        const workspaceId = this.workspaceContextService.getWorkspace().id;
        this.storageRoot = isEmptyWindow
            ? joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, 'emptyWindowChatSessions')
            : joinPath(this.environmentService.workspaceStorageHome, workspaceId, 'chatSessions');
        this.previousEmptyWindowStorageRoot = isEmptyWindow
            ? joinPath(this.environmentService.workspaceStorageHome, 'no-workspace', 'chatSessions')
            : undefined;
        // TODO tmpdir
        // this.transferredSessionStorageRoot = joinPath(this.environmentService.workspaceStorageHome, 'transferredChatSessions');
        this._register(this.lifecycleService.onWillShutdown((e) => {
            this.shuttingDown = true;
            if (!this.storeTask) {
                return;
            }
            e.join(this.storeTask, {
                id: 'join.chatSessionStore',
                label: localize('join.chatSessionStore', 'Saving chat history'),
            });
        }));
    }
    async storeSessions(sessions) {
        if (this.shuttingDown) {
            // Don't start this task if we missed the chance to block shutdown
            return;
        }
        try {
            this.storeTask = this.storeQueue.queue(async () => {
                try {
                    await Promise.all(sessions.map((session) => this.writeSession(session)));
                    await this.trimEntries();
                    await this.flushIndex();
                }
                catch (e) {
                    this.reportError('storeSessions', 'Error storing chat sessions', e);
                }
            });
            await this.storeTask;
        }
        finally {
            this.storeTask = undefined;
        }
    }
    // async storeTransferSession(transferData: IChatTransfer, session: ISerializableChatData): Promise<void> {
    // 	try {
    // 		const content = JSON.stringify(session, undefined, 2);
    // 		await this.fileService.writeFile(this.transferredSessionStorageRoot, VSBuffer.fromString(content));
    // 	} catch (e) {
    // 		this.reportError('sessionWrite', 'Error writing chat session', e);
    // 		return;
    // 	}
    // 	const index = this.getTransferredSessionIndex();
    // 	index[transferData.toWorkspace.toString()] = transferData;
    // 	try {
    // 		this.storageService.store(ChatTransferIndexStorageKey, index, StorageScope.PROFILE, StorageTarget.MACHINE);
    // 	} catch (e) {
    // 		this.reportError('storeTransferSession', 'Error storing chat transfer session', e);
    // 	}
    // }
    // private getTransferredSessionIndex(): IChatTransferIndex {
    // 	try {
    // 		const data: IChatTransferIndex = this.storageService.getObject(ChatTransferIndexStorageKey, StorageScope.PROFILE, {});
    // 		return data;
    // 	} catch (e) {
    // 		this.reportError('getTransferredSessionIndex', 'Error reading chat transfer index', e);
    // 		return {};
    // 	}
    // }
    async writeSession(session) {
        try {
            const index = this.internalGetIndex();
            const storageLocation = this.getStorageLocation(session.sessionId);
            const content = JSON.stringify(session, undefined, 2);
            await this.fileService.writeFile(storageLocation, VSBuffer.fromString(content));
            // Write succeeded, update index
            index.entries[session.sessionId] = getSessionMetadata(session);
        }
        catch (e) {
            this.reportError('sessionWrite', 'Error writing chat session', e);
        }
    }
    async flushIndex() {
        const index = this.internalGetIndex();
        try {
            this.storageService.store(ChatIndexStorageKey, index, this.getIndexStorageScope(), 1 /* StorageTarget.MACHINE */);
        }
        catch (e) {
            // Only if JSON.stringify fails, AFAIK
            this.reportError('indexWrite', 'Error writing index', e);
        }
    }
    getIndexStorageScope() {
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        return isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */;
    }
    async trimEntries() {
        const index = this.internalGetIndex();
        const entries = Object.entries(index.entries)
            .sort((a, b) => b[1].lastMessageDate - a[1].lastMessageDate)
            .map(([id]) => id);
        if (entries.length > maxPersistedSessions) {
            const entriesToDelete = entries.slice(maxPersistedSessions);
            for (const entry of entriesToDelete) {
                delete index.entries[entry];
            }
            this.logService.trace(`ChatSessionStore: Trimmed ${entriesToDelete.length} old chat sessions from index`);
        }
    }
    async internalDeleteSession(sessionId) {
        const index = this.internalGetIndex();
        if (!index.entries[sessionId]) {
            return;
        }
        const storageLocation = this.getStorageLocation(sessionId);
        try {
            await this.fileService.del(storageLocation);
        }
        catch (e) {
            if (toFileOperationResult(e) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.reportError('sessionDelete', 'Error deleting chat session', e);
            }
        }
        finally {
            delete index.entries[sessionId];
        }
    }
    hasSessions() {
        return Object.keys(this.internalGetIndex().entries).length > 0;
    }
    isSessionEmpty(sessionId) {
        const index = this.internalGetIndex();
        return index.entries[sessionId]?.isEmpty ?? true;
    }
    async deleteSession(sessionId) {
        await this.storeQueue.queue(async () => {
            await this.internalDeleteSession(sessionId);
            await this.flushIndex();
        });
    }
    async clearAllSessions() {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            const entries = Object.keys(index.entries);
            this.logService.info(`ChatSessionStore: Clearing ${entries.length} chat sessions`);
            await Promise.all(entries.map((entry) => this.internalDeleteSession(entry)));
            await this.flushIndex();
        });
    }
    async setSessionTitle(sessionId, title) {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            if (index.entries[sessionId]) {
                index.entries[sessionId].title = title;
            }
        });
    }
    reportError(reasonForTelemetry, message, error) {
        this.logService.error(`ChatSessionStore: ` + message, toErrorMessage(error));
        const fileOperationReason = error && toFileOperationResult(error);
        this.telemetryService.publicLog2('chatSessionStoreError', {
            reason: reasonForTelemetry,
            fileOperationReason: fileOperationReason ?? -1,
        });
    }
    internalGetIndex() {
        if (this.indexCache) {
            return this.indexCache;
        }
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        if (!data) {
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
        try {
            const index = JSON.parse(data);
            if (isChatSessionIndex(index)) {
                // Success
                this.indexCache = index;
            }
            else {
                this.reportError('invalidIndexFormat', `Invalid index format: ${data}`);
                this.indexCache = { version: 1, entries: {} };
            }
            return this.indexCache;
        }
        catch (e) {
            // Only if JSON.parse fails
            this.reportError('invalidIndexJSON', `Index corrupt: ${data}`, e);
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
    }
    async getIndex() {
        return this.storeQueue.queue(async () => {
            return this.internalGetIndex().entries;
        });
    }
    logIndex() {
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        this.logService.info('ChatSessionStore index: ', data);
    }
    async migrateDataIfNeeded(getInitialData) {
        await this.storeQueue.queue(async () => {
            const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
            const needsMigrationFromStorageService = !data;
            if (needsMigrationFromStorageService) {
                const initialData = getInitialData();
                if (initialData) {
                    await this.migrate(initialData);
                }
            }
        });
    }
    async migrate(initialData) {
        const numSessions = Object.keys(initialData).length;
        this.logService.info(`ChatSessionStore: Migrating ${numSessions} chat sessions from storage service to file system`);
        await Promise.all(Object.values(initialData).map(async (session) => {
            await this.writeSession(session);
        }));
        await this.flushIndex();
    }
    async readSession(sessionId) {
        return await this.storeQueue.queue(async () => {
            let rawData;
            const storageLocation = this.getStorageLocation(sessionId);
            try {
                rawData = (await this.fileService.readFile(storageLocation)).value.toString();
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId}`, e);
                if (toFileOperationResult(e) === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
                    this.previousEmptyWindowStorageRoot) {
                    rawData = await this.readSessionFromPreviousLocation(sessionId);
                }
                if (!rawData) {
                    return undefined;
                }
            }
            try {
                // TODO Copied from ChatService.ts, cleanup
                const session = revive(JSON.parse(rawData)); // Revive serialized URIs in session data
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                return normalizeSerializableChatData(session);
            }
            catch (err) {
                this.reportError('malformedSession', `Malformed session data in ${storageLocation.fsPath}: [${rawData.substring(0, 20)}${rawData.length > 20 ? '...' : ''}]`, err);
                return undefined;
            }
        });
    }
    async readSessionFromPreviousLocation(sessionId) {
        let rawData;
        if (this.previousEmptyWindowStorageRoot) {
            const storageLocation2 = joinPath(this.previousEmptyWindowStorageRoot, `${sessionId}.json`);
            try {
                rawData = (await this.fileService.readFile(storageLocation2)).value.toString();
                this.logService.info(`ChatSessionStore: Read chat session ${sessionId} from previous location`);
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId} from previous location`, e);
                return undefined;
            }
        }
        return rawData;
    }
    getStorageLocation(chatSessionId) {
        return joinPath(this.storageRoot, `${chatSessionId}.json`);
    }
    getChatStorageFolder() {
        return this.storageRoot;
    }
};
ChatSessionStore = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, ITelemetryService),
    __param(5, IStorageService),
    __param(6, ILifecycleService),
    __param(7, IUserDataProfilesService)
], ChatSessionStore);
export { ChatSessionStore };
function isChatSessionEntryMetadata(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        typeof obj.sessionId === 'string' &&
        typeof obj.title === 'string' &&
        typeof obj.lastMessageDate === 'number');
}
// TODO if we update the index version:
// Don't throw away index when moving backwards in VS Code version. Try to recover it. But this scenario is hard.
function isChatSessionIndex(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const index = data;
    if (index.version !== 1) {
        return false;
    }
    if (typeof index.entries !== 'object' || index.entries === null) {
        return false;
    }
    for (const key in index.entries) {
        if (!isChatSessionEntryMetadata(index.entries[key])) {
            return false;
        }
    }
    return true;
}
function getSessionMetadata(session) {
    const title = session instanceof ChatModel
        ? session.title || localize('newChat', 'New Chat')
        : (session.customTitle ?? ChatModel.getDefaultTitle(session.requests));
    return {
        sessionId: session.sessionId,
        title,
        lastMessageDate: session.lastMessageDate,
        isImported: session.isImported,
        initialLocation: session.initialLocation,
        isEmpty: session instanceof ChatModel
            ? session.getRequests().length === 0
            : session.requests.length === 0,
    };
}
// type IChatTransferDto = Dto<IChatTransfer>;
/**
 * Map of destination workspace URI to chat transfer data
 */
// type IChatTransferIndex = Record<string, IChatTransferDto>;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlc3Npb25TdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixZQUFZLEVBQ1oscUJBQXFCLEdBQ3JCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQ04sU0FBUyxFQUlULDZCQUE2QixHQUM3QixNQUFNLGdCQUFnQixDQUFBO0FBR3ZCLE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxDQUFBO0FBRS9CLE1BQU0sbUJBQW1CLEdBQUcsNkJBQTZCLENBQUE7QUFDekQsd0VBQXdFO0FBRWpFLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQVUvQyxZQUNlLFdBQTBDLEVBQ25DLGtCQUF3RCxFQUNoRSxVQUF3QyxFQUMzQix1QkFBa0UsRUFDekUsZ0JBQW9ELEVBQ3RELGNBQWdELEVBQzlDLGdCQUFvRCxFQUM3Qyx1QkFBa0U7UUFFNUYsS0FBSyxFQUFFLENBQUE7UUFUd0IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUMvQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ1YsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUN4RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3JDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQzVCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFmN0YsdURBQXVEO1FBRXRDLGVBQVUsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBR3JDLGlCQUFZLEdBQUcsS0FBSyxDQUFBO1FBYzNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUM3RCxNQUFNLGFBQWEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDbEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxhQUFhO1lBQy9CLENBQUMsQ0FBQyxRQUFRLENBQ1IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFDN0QseUJBQXlCLENBQ3pCO1lBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRGLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxhQUFhO1lBQ2xELENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUM7WUFDeEYsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVaLGNBQWM7UUFDZCwwSEFBMEg7UUFFMUgsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7WUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDckIsT0FBTTtZQUNQLENBQUM7WUFFRCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3RCLEVBQUUsRUFBRSx1QkFBdUI7Z0JBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUscUJBQXFCLENBQUM7YUFDL0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQXFCO1FBQ3hDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLGtFQUFrRTtZQUNsRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2pELElBQUksQ0FBQztvQkFDSixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3hFLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUN4QixNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNwRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDRixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDckIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCwyR0FBMkc7SUFDM0csU0FBUztJQUNULDJEQUEyRDtJQUMzRCx3R0FBd0c7SUFDeEcsaUJBQWlCO0lBQ2pCLHVFQUF1RTtJQUN2RSxZQUFZO0lBQ1osS0FBSztJQUVMLG9EQUFvRDtJQUNwRCw4REFBOEQ7SUFDOUQsU0FBUztJQUNULGdIQUFnSDtJQUNoSCxpQkFBaUI7SUFDakIsd0ZBQXdGO0lBQ3hGLEtBQUs7SUFDTCxJQUFJO0lBRUosNkRBQTZEO0lBQzdELFNBQVM7SUFDVCwySEFBMkg7SUFDM0gsaUJBQWlCO0lBQ2pCLGlCQUFpQjtJQUNqQiw0RkFBNEY7SUFDNUYsZUFBZTtJQUNmLEtBQUs7SUFDTCxJQUFJO0lBRUksS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUEwQztRQUNwRSxJQUFJLENBQUM7WUFDSixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNyQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFFL0UsZ0NBQWdDO1lBQ2hDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsbUJBQW1CLEVBQ25CLEtBQUssRUFDTCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsZ0NBRTNCLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLHNDQUFzQztZQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDN0QsTUFBTSxhQUFhLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQTtRQUNoRixPQUFPLGFBQWEsQ0FBQyxDQUFDLG1DQUEwQixDQUFDLCtCQUF1QixDQUFBO0lBQ3pFLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVztRQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDM0MsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO2FBQzNELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRW5CLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxvQkFBb0IsRUFBRSxDQUFDO1lBQzNDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUMzRCxLQUFLLE1BQU0sS0FBSyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUVELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQiw2QkFBNkIsZUFBZSxDQUFDLE1BQU0sK0JBQStCLENBQ2xGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxTQUFpQjtRQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQywrQ0FBdUMsRUFBRSxDQUFDO2dCQUNyRSxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwRSxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxjQUFjLENBQUMsU0FBaUI7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDckMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUE7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUI7UUFDcEMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN0QyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMzQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCO1FBQ3JCLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsOEJBQThCLE9BQU8sQ0FBQyxNQUFNLGdCQUFnQixDQUFDLENBQUE7WUFDbEYsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUUsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFpQixFQUFFLEtBQWE7UUFDNUQsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxXQUFXLENBQUMsa0JBQTBCLEVBQUUsT0FBZSxFQUFFLEtBQWE7UUFDN0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRTVFLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBcUJqRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qix1QkFBdUIsRUFBRTtZQUMxQixNQUFNLEVBQUUsa0JBQWtCO1lBQzFCLG1CQUFtQixFQUFFLG1CQUFtQixJQUFJLENBQUMsQ0FBQztTQUM5QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBR08sZ0JBQWdCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUN2QixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ25DLG1CQUFtQixFQUNuQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFDM0IsU0FBUyxDQUNULENBQUE7UUFDRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7WUFDN0MsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBWSxDQUFBO1lBQ3pDLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsVUFBVTtnQkFDVixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtZQUN4QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO1lBQzlDLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDdkIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWiwyQkFBMkI7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO1lBQzdDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRO1FBQ2IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN2QyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBQTtRQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ25DLG1CQUFtQixFQUNuQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFDM0IsU0FBUyxDQUNULENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUN4QixjQUF3RDtRQUV4RCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUNuQyxtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEVBQzNCLFNBQVMsQ0FDVCxDQUFBO1lBQ0QsTUFBTSxnQ0FBZ0MsR0FBRyxDQUFDLElBQUksQ0FBQTtZQUM5QyxJQUFJLGdDQUFnQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sV0FBVyxHQUFHLGNBQWMsRUFBRSxDQUFBO2dCQUNwQyxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFtQztRQUN4RCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsK0JBQStCLFdBQVcsb0RBQW9ELENBQzlGLENBQUE7UUFFRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNoRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFTSxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQWlCO1FBQ3pDLE9BQU8sTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM3QyxJQUFJLE9BQTJCLENBQUE7WUFDL0IsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFELElBQUksQ0FBQztnQkFDSixPQUFPLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzlFLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsbUNBQW1DLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUV0RixJQUNDLHFCQUFxQixDQUFDLENBQUMsQ0FBQywrQ0FBdUM7b0JBQy9ELElBQUksQ0FBQyw4QkFBOEIsRUFDbEMsQ0FBQztvQkFDRixPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNkLE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQztnQkFDSiwyQ0FBMkM7Z0JBQzNDLE1BQU0sT0FBTyxHQUE0QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBLENBQUMseUNBQXlDO2dCQUM5RyxzREFBc0Q7Z0JBQ3RELEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7d0JBQ3JDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDcEQsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQ0FDbEMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTs0QkFDcEMsQ0FBQzs0QkFDRCxPQUFPLFFBQVEsQ0FBQTt3QkFDaEIsQ0FBQyxDQUFDLENBQUE7b0JBQ0gsQ0FBQzt5QkFBTSxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDakQsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO29CQUMxRCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsV0FBVyxDQUNmLGtCQUFrQixFQUNsQiw2QkFBNkIsZUFBZSxDQUFDLE1BQU0sTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFDdkgsR0FBRyxDQUNILENBQUE7Z0JBQ0QsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxTQUFpQjtRQUM5RCxJQUFJLE9BQTJCLENBQUE7UUFFL0IsSUFBSSxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxTQUFTLE9BQU8sQ0FBQyxDQUFBO1lBQzNGLElBQUksQ0FBQztnQkFDSixPQUFPLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQzlFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQix1Q0FBdUMsU0FBUyx5QkFBeUIsQ0FDekUsQ0FBQTtZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxXQUFXLENBQ2YsaUJBQWlCLEVBQ2pCLG1DQUFtQyxTQUFTLHlCQUF5QixFQUNyRSxDQUFDLENBQ0QsQ0FBQTtnQkFDRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLGFBQXFCO1FBQy9DLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxhQUFhLE9BQU8sQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7Q0FDRCxDQUFBO0FBdlpZLGdCQUFnQjtJQVcxQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsd0JBQXdCLENBQUE7R0FsQmQsZ0JBQWdCLENBdVo1Qjs7QUFpQkQsU0FBUywwQkFBMEIsQ0FBQyxHQUFZO0lBQy9DLE9BQU8sQ0FDTixDQUFDLENBQUMsR0FBRztRQUNMLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsT0FBUSxHQUFpQyxDQUFDLFNBQVMsS0FBSyxRQUFRO1FBQ2hFLE9BQVEsR0FBaUMsQ0FBQyxLQUFLLEtBQUssUUFBUTtRQUM1RCxPQUFRLEdBQWlDLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FDdEUsQ0FBQTtBQUNGLENBQUM7QUFTRCx1Q0FBdUM7QUFDdkMsaUhBQWlIO0FBQ2pILFNBQVMsa0JBQWtCLENBQUMsSUFBYTtJQUN4QyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDL0MsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBNkIsQ0FBQTtJQUMzQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDekIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxPQUFPLEtBQUssQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDakUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE9BQTBDO0lBQ3JFLE1BQU0sS0FBSyxHQUNWLE9BQU8sWUFBWSxTQUFTO1FBQzNCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUN4RSxPQUFPO1FBQ04sU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1FBQzVCLEtBQUs7UUFDTCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWU7UUFDeEMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1FBQzlCLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtRQUN4QyxPQUFPLEVBQ04sT0FBTyxZQUFZLFNBQVM7WUFDM0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUNwQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQztLQUNqQyxDQUFBO0FBQ0YsQ0FBQztBQWNELDhDQUE4QztBQUU5Qzs7R0FFRztBQUNILDhEQUE4RCJ9