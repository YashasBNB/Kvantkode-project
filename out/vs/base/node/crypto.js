/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createSingleCallFunction } from '../common/functional.js';
export async function checksum(path, sha256hash) {
    const checksumPromise = new Promise((resolve, reject) => {
        const input = fs.createReadStream(path);
        const hash = crypto.createHash('sha256');
        input.pipe(hash);
        const done = createSingleCallFunction((err, result) => {
            input.removeAllListeners();
            hash.removeAllListeners();
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
        input.once('error', done);
        input.once('end', done);
        hash.once('error', done);
        hash.once('data', (data) => done(undefined, data.toString('hex')));
    });
    const hash = await checksumPromise;
    if (hash !== sha256hash) {
        throw new Error('Hash mismatch');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL2NyeXB0by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVsRSxNQUFNLENBQUMsS0FBSyxVQUFVLFFBQVEsQ0FBQyxJQUFZLEVBQUUsVUFBOEI7SUFDMUUsTUFBTSxlQUFlLEdBQUcsSUFBSSxPQUFPLENBQXFCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzNFLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEIsTUFBTSxJQUFJLEdBQUcsd0JBQXdCLENBQUMsQ0FBQyxHQUFXLEVBQUUsTUFBZSxFQUFFLEVBQUU7WUFDdEUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFDMUIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFFekIsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDWixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxJQUFJLEdBQUcsTUFBTSxlQUFlLENBQUE7SUFFbEMsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0FBQ0YsQ0FBQyJ9