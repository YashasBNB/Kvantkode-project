/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toErrorMessage } from '../common/errorMessage.js';
import { ErrorNoTelemetry, getErrorMessage } from '../common/errors.js';
import { mark } from '../common/performance.js';
class MissingStoresError extends Error {
    constructor(db) {
        super('Missing stores');
        this.db = db;
    }
}
export class DBClosedError extends Error {
    constructor(dbName) {
        super(`IndexedDB database '${dbName}' is closed.`);
        this.code = 'DBClosed';
    }
}
export class IndexedDB {
    static async create(name, version, stores) {
        const database = await IndexedDB.openDatabase(name, version, stores);
        return new IndexedDB(database, name);
    }
    static async openDatabase(name, version, stores) {
        mark(`code/willOpenDatabase/${name}`);
        try {
            return await IndexedDB.doOpenDatabase(name, version, stores);
        }
        catch (err) {
            if (err instanceof MissingStoresError) {
                console.info(`Attempting to recreate the IndexedDB once.`, name);
                try {
                    // Try to delete the db
                    await IndexedDB.deleteDatabase(err.db);
                }
                catch (error) {
                    console.error(`Error while deleting the IndexedDB`, getErrorMessage(error));
                    throw error;
                }
                return await IndexedDB.doOpenDatabase(name, version, stores);
            }
            throw err;
        }
        finally {
            mark(`code/didOpenDatabase/${name}`);
        }
    }
    static doOpenDatabase(name, version, stores) {
        return new Promise((c, e) => {
            const request = indexedDB.open(name, version);
            request.onerror = () => e(request.error);
            request.onsuccess = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        console.error(`Error while opening IndexedDB. Could not find '${store}'' object store`);
                        e(new MissingStoresError(db));
                        return;
                    }
                }
                c(db);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store);
                    }
                }
            };
        });
    }
    static deleteDatabase(database) {
        return new Promise((c, e) => {
            // Close any opened connections
            database.close();
            // Delete the db
            const deleteRequest = indexedDB.deleteDatabase(database.name);
            deleteRequest.onerror = (err) => e(deleteRequest.error);
            deleteRequest.onsuccess = () => c();
        });
    }
    constructor(database, name) {
        this.name = name;
        this.database = null;
        this.pendingTransactions = [];
        this.database = database;
    }
    hasPendingTransactions() {
        return this.pendingTransactions.length > 0;
    }
    close() {
        if (this.pendingTransactions.length) {
            this.pendingTransactions
                .splice(0, this.pendingTransactions.length)
                .forEach((transaction) => transaction.abort());
        }
        this.database?.close();
        this.database = null;
    }
    async runInTransaction(store, transactionMode, dbRequestFn) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, transactionMode);
        this.pendingTransactions.push(transaction);
        return new Promise((c, e) => {
            transaction.oncomplete = () => {
                if (Array.isArray(request)) {
                    c(request.map((r) => r.result));
                }
                else {
                    c(request.result);
                }
            };
            transaction.onerror = () => e(transaction.error
                ? ErrorNoTelemetry.fromError(transaction.error)
                : new ErrorNoTelemetry('unknown error'));
            transaction.onabort = () => e(transaction.error
                ? ErrorNoTelemetry.fromError(transaction.error)
                : new ErrorNoTelemetry('unknown error'));
            const request = dbRequestFn(transaction.objectStore(store));
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
    async getKeyValues(store, isValid) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, 'readonly');
        this.pendingTransactions.push(transaction);
        return new Promise((resolve) => {
            const items = new Map();
            const objectStore = transaction.objectStore(store);
            // Open a IndexedDB Cursor to iterate over key/values
            const cursor = objectStore.openCursor();
            if (!cursor) {
                return resolve(items); // this means the `ItemTable` was empty
            }
            // Iterate over rows of `ItemTable` until the end
            cursor.onsuccess = () => {
                if (cursor.result) {
                    // Keep cursor key/value in our map
                    if (isValid(cursor.result.value)) {
                        items.set(cursor.result.key.toString(), cursor.result.value);
                    }
                    // Advance cursor to next row
                    cursor.result.continue();
                }
                else {
                    resolve(items); // reached end of table
                }
            };
            // Error handlers
            const onError = (error) => {
                console.error(`IndexedDB getKeyValues(): ${toErrorMessage(error, true)}`);
                resolve(items);
            };
            cursor.onerror = () => onError(cursor.error);
            transaction.onerror = () => onError(transaction.error);
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2luZGV4ZWREQi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUUvQyxNQUFNLGtCQUFtQixTQUFRLEtBQUs7SUFDckMsWUFBcUIsRUFBZTtRQUNuQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQURILE9BQUUsR0FBRixFQUFFLENBQWE7SUFFcEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWMsU0FBUSxLQUFLO0lBRXZDLFlBQVksTUFBYztRQUN6QixLQUFLLENBQUMsdUJBQXVCLE1BQU0sY0FBYyxDQUFDLENBQUE7UUFGMUMsU0FBSSxHQUFHLFVBQVUsQ0FBQTtJQUcxQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDbEIsSUFBWSxFQUNaLE9BQTJCLEVBQzNCLE1BQWdCO1FBRWhCLE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BFLE9BQU8sSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FDaEMsSUFBWSxFQUNaLE9BQTJCLEVBQzNCLE1BQWdCO1FBRWhCLElBQUksQ0FBQyx5QkFBeUIsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUM7WUFDSixPQUFPLE1BQU0sU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxHQUFHLFlBQVksa0JBQWtCLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFFaEUsSUFBSSxDQUFDO29CQUNKLHVCQUF1QjtvQkFDdkIsTUFBTSxTQUFTLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO29CQUMzRSxNQUFNLEtBQUssQ0FBQTtnQkFDWixDQUFDO2dCQUVELE9BQU8sTUFBTSxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDN0QsQ0FBQztZQUVELE1BQU0sR0FBRyxDQUFBO1FBQ1YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLGNBQWMsQ0FDNUIsSUFBWSxFQUNaLE9BQTJCLEVBQzNCLE1BQWdCO1FBRWhCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDN0MsT0FBTyxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3hDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFO2dCQUN4QixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO2dCQUN6QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxPQUFPLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxLQUFLLGlCQUFpQixDQUFDLENBQUE7d0JBQ3ZGLENBQUMsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQzdCLE9BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO2dCQUNELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQTtZQUNELE9BQU8sQ0FBQyxlQUFlLEdBQUcsR0FBRyxFQUFFO2dCQUM5QixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO2dCQUN6QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQzVCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBcUI7UUFDbEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQiwrQkFBK0I7WUFDL0IsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBRWhCLGdCQUFnQjtZQUNoQixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3RCxhQUFhLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELGFBQWEsQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBS0QsWUFDQyxRQUFxQixFQUNKLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBTHRCLGFBQVEsR0FBdUIsSUFBSSxDQUFBO1FBQzFCLHdCQUFtQixHQUFxQixFQUFFLENBQUE7UUFNMUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7SUFDekIsQ0FBQztJQUVELHNCQUFzQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLG1CQUFtQjtpQkFDdEIsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDO2lCQUMxQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO0lBQ3JCLENBQUM7SUFZRCxLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLEtBQWEsRUFDYixlQUFtQyxFQUNuQyxXQUF1RTtRQUV2RSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMxQyxPQUFPLElBQUksT0FBTyxDQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BDLFdBQVcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFO2dCQUM3QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQztZQUNGLENBQUMsQ0FBQTtZQUNELFdBQVcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQzFCLENBQUMsQ0FDQSxXQUFXLENBQUMsS0FBSztnQkFDaEIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO2dCQUMvQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FDeEMsQ0FBQTtZQUNGLFdBQVcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQzFCLENBQUMsQ0FDQSxXQUFXLENBQUMsS0FBSztnQkFDaEIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO2dCQUMvQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FDeEMsQ0FBQTtZQUNGLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUNmLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDakYsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixLQUFhLEVBQ2IsT0FBdUM7UUFFdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixNQUFNLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDMUMsT0FBTyxJQUFJLE9BQU8sQ0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUM5QyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFBO1lBRWxDLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFbEQscURBQXFEO1lBQ3JELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyx1Q0FBdUM7WUFDOUQsQ0FBQztZQUVELGlEQUFpRDtZQUNqRCxNQUFNLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRTtnQkFDdkIsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25CLG1DQUFtQztvQkFDbkMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNsQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQzdELENBQUM7b0JBRUQsNkJBQTZCO29CQUM3QixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUN6QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsdUJBQXVCO2dCQUN2QyxDQUFDO1lBQ0YsQ0FBQyxDQUFBO1lBRUQsaUJBQWlCO1lBQ2pCLE1BQU0sT0FBTyxHQUFHLENBQUMsS0FBbUIsRUFBRSxFQUFFO2dCQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFFekUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFBO1lBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzVDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2RCxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQ2YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNqRixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=