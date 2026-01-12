/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { randomInt } from '../../../../base/common/numbers.js';
import { assertDefined } from '../../../../base/common/types.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * A reusable test utility that asserts that the given decoder
 * produces the expected `expectedTokens` sequence of tokens.
 *
 * ## Examples
 *
 * ```typescript
 * const stream = newWriteableStream<VSBuffer>(null);
 * const decoder = testDisposables.add(new LinesDecoder(stream));
 *
 * // create a new test utility instance
 * const test = testDisposables.add(new TestDecoder(stream, decoder));
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 * 	   new Line(1, ' hello world'),
 * 	   new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestDecoder extends Disposable {
    constructor(stream, decoder) {
        super();
        this.stream = stream;
        this.decoder = decoder;
        this._register(this.decoder);
    }
    /**
     * Write provided {@linkcode inputData} data to the input byte stream
     * asynchronously in the background in small random-length chunks.
     *
     * @param inputData Input data to send.
     */
    sendData(inputData) {
        // if input data was passed as an array of lines,
        // join them into a single string with newlines
        if (Array.isArray(inputData)) {
            inputData = inputData.join('\n');
        }
        // write the input data to the stream in multiple random-length
        // chunks to simulate real input stream data flows
        let inputDataBytes = VSBuffer.fromString(inputData);
        const interval = setInterval(() => {
            if (inputDataBytes.byteLength <= 0) {
                clearInterval(interval);
                this.stream.end();
                return;
            }
            const dataToSend = inputDataBytes.slice(0, randomInt(inputDataBytes.byteLength));
            this.stream.write(dataToSend);
            inputDataBytes = inputDataBytes.slice(dataToSend.byteLength);
        }, randomInt(5));
        return this;
    }
    /**
     * Run the test sending the `inputData` data to the stream and asserting
     * that the decoder produces the `expectedTokens` sequence of tokens.
     *
     * @param inputData Input data of the input byte stream.
     * @param expectedTokens List of expected tokens the test token must produce.
     * @param tokensConsumeMethod *Optional* method of consuming the decoder stream.
     *       					  Defaults to a random method (see {@linkcode randomTokensConsumeMethod}).
     */
    async run(inputData, expectedTokens, tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        try {
            // initiate the data sending flow
            this.sendData(inputData);
            // consume the decoder tokens based on specified
            // (or randomly generated) tokens consume method
            const receivedTokens = [];
            switch (tokensConsumeMethod) {
                // test the `async iterator` code path
                case 'async-generator': {
                    for await (const token of this.decoder) {
                        if (token === null) {
                            break;
                        }
                        receivedTokens.push(token);
                    }
                    break;
                }
                // test the `.consumeAll()` method code path
                case 'consume-all-method': {
                    receivedTokens.push(...(await this.decoder.consumeAll()));
                    break;
                }
                // test the `.onData()` event consume flow
                case 'on-data-event': {
                    this.decoder.onData((token) => {
                        receivedTokens.push(token);
                    });
                    this.decoder.start();
                    // in this case we also test the `settled` promise of the decoder
                    await this.decoder.settled;
                    break;
                }
                // ensure that the switch block is exhaustive
                default: {
                    throw new Error(`Unknown consume method '${tokensConsumeMethod}'.`);
                }
            }
            // validate the received tokens
            this.validateReceivedTokens(receivedTokens, expectedTokens);
        }
        catch (error) {
            assertDefined(error, `An non-nullable error must be thrown.`);
            assert(error instanceof Error, `An error error instance must be thrown.`);
            // add the tokens consume method to the error message so we
            // would know which method of consuming the tokens failed exactly
            error.message = `[${tokensConsumeMethod}] ${error.message}`;
            throw error;
        }
    }
    /**
     * Randomly generate a tokens consume method type for the test.
     */
    randomTokensConsumeMethod() {
        const testConsumeMethodIndex = randomInt(2);
        switch (testConsumeMethodIndex) {
            // test the `async iterator` code path
            case 0: {
                return 'async-generator';
            }
            // test the `.consumeAll()` method code path
            case 1: {
                return 'consume-all-method';
            }
            // test the `.onData()` event consume flow
            case 2: {
                return 'on-data-event';
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method index '${testConsumeMethodIndex}'.`);
            }
        }
    }
    /**
     * Validate that received tokens list is equal to the expected one.
     */
    validateReceivedTokens(receivedTokens, expectedTokens) {
        for (let i = 0; i < expectedTokens.length; i++) {
            const expectedToken = expectedTokens[i];
            const receivedToken = receivedTokens[i];
            assertDefined(receivedToken, `Expected token '${i}' to be '${expectedToken}', got 'undefined'.`);
            assert(receivedToken.equals(expectedToken), `Expected token '${i}' to be '${expectedToken}', got '${receivedToken}'.`);
        }
        if (receivedTokens.length === expectedTokens.length) {
            return;
        }
        // sanity check - if received/expected list lengths are not equal, the received
        // list must be longer than the expected one, because the other way around case
        // must have been caught by the comparison loop above
        assert(receivedTokens.length > expectedTokens.length, 'Must have received more tokens than expected.');
        const index = expectedTokens.length;
        throw new Error([
            `Expected no '${index}' token present, got '${receivedTokens[index]}'.`,
            `(received ${receivedTokens.length} tokens in total)`,
        ].join(' '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi91dGlscy90ZXN0RGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBVWpFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxNQUFNLE9BQU8sV0FBMkQsU0FBUSxVQUFVO0lBQ3pGLFlBQ2tCLE1BQWlDLEVBQ2xDLE9BQVU7UUFFMUIsS0FBSyxFQUFFLENBQUE7UUFIVSxXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUNsQyxZQUFPLEdBQVAsT0FBTyxDQUFHO1FBSTFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLFFBQVEsQ0FBQyxTQUE0QjtRQUMzQyxpREFBaUQ7UUFDakQsK0NBQStDO1FBQy9DLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzlCLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFFRCwrREFBK0Q7UUFDL0Qsa0RBQWtEO1FBQ2xELElBQUksY0FBYyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbkQsTUFBTSxRQUFRLEdB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