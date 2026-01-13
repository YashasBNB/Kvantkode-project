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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvY3J5cHRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRWxFLE1BQU0sQ0FBQyxLQUFLLFVBQVUsUUFBUSxDQUFDLElBQVksRUFBRSxVQUE4QjtJQUMxRSxNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sQ0FBcUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDM0UsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVoQixNQUFNLElBQUksR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLEdBQVcsRUFBRSxNQUFlLEVBQUUsRUFBRTtZQUN0RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUMxQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtZQUV6QixJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNULE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNaLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQTtJQUVsQyxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7QUFDRixDQUFDIn0=