var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import { CashuMint } from './CashuMint.js';
import * as dhke from './DHKE.js';
import { BlindedMessage } from './model/BlindedMessage.js';
import { CheckStateEnum } from './model/types/index.js';
import { bytesToNumber, cleanToken, getDecodedToken, getDefaultAmountPreference, splitAmount } from './utils.js';
import { deriveBlindingFactor, deriveSecret, deriveSeedFromMnemonic } from './secrets.js';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { createP2PKsecret, getSignedProofs } from '@cashu/crypto/modules/client/NUT11';
import { serializeProof } from '@cashu/crypto/modules/client';
import { pointFromHex } from './DHKE';
/**
 * Class that represents a Cashu wallet.
 * This class should act as the entry point for this library
 */
var CashuWallet = /** @class */ (function () {
    /**
     * @param unit optionally set unit
     * @param keys public keys from the mint. If set, it will override the unit with the keysets unit
     * @param mint Cashu mint instance is used to make api calls
     * @param mnemonicOrSeed mnemonic phrase or Seed to initial derivation key for this wallets deterministic secrets. When the mnemonic is provided, the seed will be derived from it.
     * This can lead to poor performance, in which case the seed should be directly provided
     */
    function CashuWallet(mint, options) {
        this._unit = 'sat';
        this.mint = mint;
        if (options === null || options === void 0 ? void 0 : options.unit)
            this._unit = options === null || options === void 0 ? void 0 : options.unit;
        if (options === null || options === void 0 ? void 0 : options.keys) {
            this._keys = options.keys;
            this._unit = options.keys.unit;
        }
        if (!(options === null || options === void 0 ? void 0 : options.mnemonicOrSeed)) {
            return;
        }
        if ((options === null || options === void 0 ? void 0 : options.mnemonicOrSeed) instanceof Uint8Array) {
            this._seed = options.mnemonicOrSeed;
            return;
        }
        if (!validateMnemonic(options.mnemonicOrSeed, wordlist)) {
            throw new Error('Tried to instantiate with mnemonic, but mnemonic was invalid');
        }
        this._seed = deriveSeedFromMnemonic(options.mnemonicOrSeed);
    }
    Object.defineProperty(CashuWallet.prototype, "unit", {
        get: function () {
            return this._unit;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CashuWallet.prototype, "keys", {
        get: function () {
            if (!this._keys) {
                throw new Error('Keys are not set');
            }
            return this._keys;
        },
        set: function (keys) {
            this._keys = keys;
            this._unit = keys.unit;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Receive an encoded or raw Cashu token
     * @param {(string|Token)} token - Cashu token
     * @param preference optional preference for splitting proofs into specific amounts
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @param privkey? will create a signature on the @param token secrets if set
     * @returns New token with newly created proofs, token entries that had errors
     */
    CashuWallet.prototype.receive = function (token, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var decodedToken, tokenEntries, tokenEntriesWithError, _i, decodedToken_1, tokenEntry, _b, proofs, proofsWithError, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (typeof token === 'string') {
                            decodedToken = cleanToken(getDecodedToken(token)).token;
                        }
                        else {
                            decodedToken = token.token;
                        }
                        tokenEntries = [];
                        tokenEntriesWithError = [];
                        _i = 0, decodedToken_1 = decodedToken;
                        _c.label = 1;
                    case 1:
                        if (!(_i < decodedToken_1.length)) return [3 /*break*/, 6];
                        tokenEntry = decodedToken_1[_i];
                        if (!((_a = tokenEntry === null || tokenEntry === void 0 ? void 0 : tokenEntry.proofs) === null || _a === void 0 ? void 0 : _a.length)) {
                            return [3 /*break*/, 5];
                        }
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.receiveTokenEntry(tokenEntry, {
                                preference: options === null || options === void 0 ? void 0 : options.preference,
                                counter: options === null || options === void 0 ? void 0 : options.counter,
                                pubkey: options === null || options === void 0 ? void 0 : options.pubkey,
                                privkey: options === null || options === void 0 ? void 0 : options.privkey
                            })];
                    case 3:
                        _b = _c.sent(), proofs = _b.proofs, proofsWithError = _b.proofsWithError;
                        if (proofsWithError === null || proofsWithError === void 0 ? void 0 : proofsWithError.length) {
                            tokenEntriesWithError.push(tokenEntry);
                            return [3 /*break*/, 5];
                        }
                        tokenEntries.push({ mint: tokenEntry.mint, proofs: __spreadArray([], proofs, true) });
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _c.sent();
                        console.error(error_1);
                        tokenEntriesWithError.push(tokenEntry);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, {
                            token: { token: tokenEntries },
                            tokensWithErrors: tokenEntriesWithError.length ? { token: tokenEntriesWithError } : undefined
                        }];
                }
            });
        });
    };
    /**
     * Receive a single cashu token entry
     * @param tokenEntry a single entry of a cashu token
     * @param preference optional preference for splitting proofs into specific amounts.
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @param privkey? will create a signature on the @param tokenEntry secrets if set
     * @returns New token entry with newly created proofs, proofs that had errors
     */
    CashuWallet.prototype.receiveTokenEntry = function (tokenEntry, options) {
        return __awaiter(this, void 0, void 0, function () {
            var proofsWithError, proofs, amount, preference, keys, _a, payload, blindedMessages, signatures, newProofs, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        proofsWithError = [];
                        proofs = [];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        amount = tokenEntry.proofs.reduce(function (total, curr) { return total + curr.amount; }, 0);
                        preference = options === null || options === void 0 ? void 0 : options.preference;
                        if (!preference) {
                            preference = getDefaultAmountPreference(amount);
                        }
                        return [4 /*yield*/, this.getKeys()];
                    case 2:
                        keys = _b.sent();
                        _a = this.createSwapPayload(amount, tokenEntry.proofs, keys, preference, options === null || options === void 0 ? void 0 : options.counter, options === null || options === void 0 ? void 0 : options.pubkey, options === null || options === void 0 ? void 0 : options.privkey), payload = _a.payload, blindedMessages = _a.blindedMessages;
                        return [4 /*yield*/, CashuMint.split(tokenEntry.mint, payload)];
                    case 3:
                        signatures = (_b.sent()).signatures;
                        newProofs = dhke.constructProofs(signatures, blindedMessages.rs, blindedMessages.secrets, keys);
                        proofs.push.apply(proofs, newProofs);
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _b.sent();
                        console.error(error_2);
                        proofsWithError.push.apply(proofsWithError, tokenEntry.proofs);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, {
                            proofs: proofs,
                            proofsWithError: proofsWithError.length ? proofsWithError : undefined
                        }];
                }
            });
        });
    };
    /**
     * Splits and creates sendable tokens
     * if no amount is specified, the amount is implied by the cumulative amount of all proofs
     * if both amount and preference are set, but the preference cannot fulfill the amount, then we use the default split
     * @param amount amount to send while performing the optimal split (least proofs possible). can be set to undefined if preference is set
     * @param proofs proofs matching that amount
     * @param preference optional preference for splitting proofs into specific amounts. overrides amount param
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @param privkey? will create a signature on the @param proofs secrets if set
     * @returns promise of the change- and send-proofs
     */
    CashuWallet.prototype.send = function (amount, proofs, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var keyset, amountAvailable, proofsToSend, proofsToKeep, _b, amountKeep_1, amountSend, _c, payload, blindedMessages, signatures, proofs_1, splitProofsToKeep_1, splitProofsToSend_1, amountKeepCounter_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (options === null || options === void 0 ? void 0 : options.preference) {
                            amount = (_a = options === null || options === void 0 ? void 0 : options.preference) === null || _a === void 0 ? void 0 : _a.reduce(function (acc, curr) { return acc + curr.amount * curr.count; }, 0);
                        }
                        return [4 /*yield*/, this.getKeys()];
                    case 1:
                        keyset = _d.sent();
                        amountAvailable = 0;
                        proofsToSend = [];
                        proofsToKeep = [];
                        proofs.forEach(function (proof) {
                            if (amountAvailable >= amount) {
                                proofsToKeep.push(proof);
                                return;
                            }
                            amountAvailable = amountAvailable + proof.amount;
                            proofsToSend.push(proof);
                        });
                        if (amount > amountAvailable) {
                            throw new Error('Not enough funds available');
                        }
                        if (!(amount < amountAvailable || (options === null || options === void 0 ? void 0 : options.preference) || (options === null || options === void 0 ? void 0 : options.pubkey))) return [3 /*break*/, 3];
                        _b = this.splitReceive(amount, amountAvailable), amountKeep_1 = _b.amountKeep, amountSend = _b.amountSend;
                        _c = this.createSwapPayload(amountSend, proofsToSend, keyset, options === null || options === void 0 ? void 0 : options.preference, options === null || options === void 0 ? void 0 : options.counter, options === null || options === void 0 ? void 0 : options.pubkey, options === null || options === void 0 ? void 0 : options.privkey), payload = _c.payload, blindedMessages = _c.blindedMessages;
                        return [4 /*yield*/, this.mint.split(payload)];
                    case 2:
                        signatures = (_d.sent()).signatures;
                        proofs_1 = dhke.constructProofs(signatures, blindedMessages.rs, blindedMessages.secrets, keyset);
                        splitProofsToKeep_1 = [];
                        splitProofsToSend_1 = [];
                        amountKeepCounter_1 = 0;
                        proofs_1.forEach(function (proof) {
                            if (amountKeepCounter_1 < amountKeep_1) {
                                amountKeepCounter_1 += proof.amount;
                                splitProofsToKeep_1.push(proof);
                                return;
                            }
                            splitProofsToSend_1.push(proof);
                        });
                        return [2 /*return*/, {
                                returnChange: __spreadArray(__spreadArray([], splitProofsToKeep_1, true), proofsToKeep, true),
                                send: splitProofsToSend_1
                            }];
                    case 3: return [2 /*return*/, { returnChange: proofsToKeep, send: proofsToSend }];
                }
            });
        });
    };
    /**
     * Regenerates
     * @param start set starting point for count (first cycle for each keyset should usually be 0)
     * @param count set number of blinded messages that should be generated
     * @returns proofs
     */
    CashuWallet.prototype.restore = function (start, count, options) {
        return __awaiter(this, void 0, void 0, function () {
            var keys, amounts, _a, blindedMessages, rs, secrets, _b, outputs, promises, validRs, validSecrets;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getKeys(options === null || options === void 0 ? void 0 : options.keysetId)];
                    case 1:
                        keys = _c.sent();
                        if (!this._seed) {
                            throw new Error('CashuWallet must be initialized with mnemonic to use restore');
                        }
                        amounts = Array(count).fill(0);
                        _a = this.createBlindedMessages(amounts, keys.id, start), blindedMessages = _a.blindedMessages, rs = _a.rs, secrets = _a.secrets;
                        return [4 /*yield*/, this.mint.restore({ outputs: blindedMessages })];
                    case 2:
                        _b = _c.sent(), outputs = _b.outputs, promises = _b.promises;
                        validRs = rs.filter(function (r, i) { return outputs.map(function (o) { return o.B_; }).includes(blindedMessages[i].B_); });
                        validSecrets = secrets.filter(function (s, i) {
                            return outputs.map(function (o) { return o.B_; }).includes(blindedMessages[i].B_);
                        });
                        return [2 /*return*/, {
                                proofs: dhke.constructProofs(promises, validRs, validSecrets, keys)
                            }];
                }
            });
        });
    };
    /**
     * Initialize the wallet with the mints public keys
     */
    CashuWallet.prototype.getKeys = function (keysetId, unit) {
        return __awaiter(this, void 0, void 0, function () {
            var allKeys, keys;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(!this._keys || this._keys.id !== keysetId)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.mint.getKeys(keysetId)];
                    case 1:
                        allKeys = _a.sent();
                        keys = void 0;
                        if (keysetId) {
                            keys = allKeys.keysets.find(function (k) { return k.id === keysetId; });
                        }
                        else {
                            keys = allKeys.keysets.find(function (k) { return (unit ? k.unit === unit : k.unit === 'sat'); });
                        }
                        if (!keys) {
                            throw new Error("could not initialize keys. No keyset with unit '".concat(unit ? unit : 'sat', "' found"));
                        }
                        if (!this._keys) {
                            this._keys = keys;
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, this._keys];
                }
            });
        });
    };
    /**
     * Requests a mint quote form the mint. Response returns a Lightning payment request for the requested given amount and unit.
     * @param amount Amount requesting for mint.
     * @returns the mint will return a mint quote with a Lightning invoice for minting tokens of the specified amount and unit
     */
    CashuWallet.prototype.mintQuote = function (amount) {
        return __awaiter(this, void 0, void 0, function () {
            var mintQuotePayload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mintQuotePayload = {
                            unit: this._unit,
                            amount: amount
                        };
                        return [4 /*yield*/, this.mint.mintQuote(mintQuotePayload)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Gets an existing mint quote from the mint.
     * @param quote Quote ID
     * @returns the mint will create and return a Lightning invoice for the specified amount
     */
    CashuWallet.prototype.getMintQuote = function (quote) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mint.getMintQuote(quote)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Mint tokens for a given mint quote
     * @param amount amount to request
     * @param quote ID of mint quote
     * @returns proofs
     */
    CashuWallet.prototype.mintTokens = function (amount, quote, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var keyset, _b, blindedMessages, secrets, rs, mintPayload, signatures;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getKeys(options === null || options === void 0 ? void 0 : options.keysetId)];
                    case 1:
                        keyset = _c.sent();
                        _b = this.createRandomBlindedMessages(amount, (_a = options === null || options === void 0 ? void 0 : options.keysetId) !== null && _a !== void 0 ? _a : keyset.id, options === null || options === void 0 ? void 0 : options.amountPreference, options === null || options === void 0 ? void 0 : options.counter, options === null || options === void 0 ? void 0 : options.pubkey), blindedMessages = _b.blindedMessages, secrets = _b.secrets, rs = _b.rs;
                        mintPayload = {
                            outputs: blindedMessages,
                            quote: quote
                        };
                        return [4 /*yield*/, this.mint.mint(mintPayload)];
                    case 2:
                        signatures = (_c.sent()).signatures;
                        return [2 /*return*/, {
                                proofs: dhke.constructProofs(signatures, rs, secrets, keyset)
                            }];
                }
            });
        });
    };
    /**
     * Requests a melt quote from the mint. Response returns amount and fees for a given unit in order to pay a Lightning invoice.
     * @param invoice LN invoice that needs to get a fee estimate
     * @returns the mint will create and return a melt quote for the invoice with an amount and fee reserve
     */
    CashuWallet.prototype.meltQuote = function (invoice) {
        return __awaiter(this, void 0, void 0, function () {
            var meltQuotePayload, meltQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        meltQuotePayload = {
                            unit: this._unit,
                            request: invoice
                        };
                        return [4 /*yield*/, this.mint.meltQuote(meltQuotePayload)];
                    case 1:
                        meltQuote = _a.sent();
                        return [2 /*return*/, meltQuote];
                }
            });
        });
    };
    /**
     * Return an existing melt quote from the mint.
     * @param quote ID of the melt quote
     * @returns the mint will return an existing melt quote
     */
    CashuWallet.prototype.getMeltQuote = function (quote) {
        return __awaiter(this, void 0, void 0, function () {
            var meltQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mint.getMeltQuote(quote)];
                    case 1:
                        meltQuote = _a.sent();
                        return [2 /*return*/, meltQuote];
                }
            });
        });
    };
    /**
     * Melt tokens for a melt quote. proofsToSend must be at least amount+fee_reserve form the melt quote.
     * Returns payment proof and change proofs
     * @param meltQuote ID of the melt quote
     * @param proofsToSend proofs to melt
     * @param options.keysetId? optionally set keysetId for blank outputs for returned change.
     * @param options.counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @returns
     */
    CashuWallet.prototype.meltTokens = function (meltQuote, proofsToSend, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var keys, _b, blindedMessages, secrets, rs, meltPayload, meltResponse;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getKeys(options === null || options === void 0 ? void 0 : options.keysetId)];
                    case 1:
                        keys = _c.sent();
                        _b = this.createBlankOutputs(meltQuote.fee_reserve, keys.id, options === null || options === void 0 ? void 0 : options.counter), blindedMessages = _b.blindedMessages, secrets = _b.secrets, rs = _b.rs;
                        meltPayload = {
                            quote: meltQuote.quote,
                            inputs: proofsToSend,
                            outputs: __spreadArray([], blindedMessages, true)
                        };
                        return [4 /*yield*/, this.mint.melt(meltPayload)];
                    case 2:
                        meltResponse = _c.sent();
                        return [2 /*return*/, {
                                isPaid: (_a = meltResponse.paid) !== null && _a !== void 0 ? _a : false,
                                preimage: meltResponse.payment_preimage,
                                change: (meltResponse === null || meltResponse === void 0 ? void 0 : meltResponse.change)
                                    ? dhke.constructProofs(meltResponse.change, rs, secrets, keys)
                                    : []
                            }];
                }
            });
        });
    };
    /**
     * Helper function that pays a Lightning invoice directly without having to create a melt quote before
     * The combined amount of Proofs must match the payment amount including fees.
     * @param invoice
     * @param proofsToSend the exact amount to send including fees
     * @param meltQuote melt quote for the invoice
     * @param options.keysetId? optionally set keysetId for blank outputs for returned change.
     * @param options.counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @returns
     */
    CashuWallet.prototype.payLnInvoice = function (invoice, proofsToSend, meltQuote, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!meltQuote) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.mint.meltQuote({ unit: this._unit, request: invoice })];
                    case 1:
                        meltQuote = _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.meltTokens(meltQuote, proofsToSend, {
                            keysetId: options === null || options === void 0 ? void 0 : options.keysetId,
                            counter: options === null || options === void 0 ? void 0 : options.counter
                        })];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Helper function to ingest a Cashu token and pay a Lightning invoice with it.
     * @param invoice Lightning invoice
     * @param token cashu token
     * @param meltQuote melt quote for the invoice
     * @param options.keysetId? optionally set keysetId for blank outputs for returned change.
     * @param options.counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     */
    CashuWallet.prototype.payLnInvoiceWithToken = function (invoice, token, meltQuote, options) {
        return __awaiter(this, void 0, void 0, function () {
            var decodedToken, proofs;
            var _this = this;
            return __generator(this, function (_a) {
                decodedToken = getDecodedToken(token);
                proofs = decodedToken.token
                    .filter(function (x) { return x.mint === _this.mint.mintUrl; })
                    .flatMap(function (t) { return t.proofs; });
                return [2 /*return*/, this.payLnInvoice(invoice, proofs, meltQuote, {
                        keysetId: options === null || options === void 0 ? void 0 : options.keysetId,
                        counter: options === null || options === void 0 ? void 0 : options.counter
                    })];
            });
        });
    };
    /**
     * Creates a split payload
     * @param amount amount to send
     * @param proofsToSend proofs to split*
     * @param preference optional preference for splitting proofs into specific amounts. overrides amount param
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @param privkey? will create a signature on the @param proofsToSend secrets if set
     * @returns
     */
    CashuWallet.prototype.createSwapPayload = function (amount, proofsToSend, keyset, preference, counter, pubkey, privkey) {
        var totalAmount = proofsToSend.reduce(function (total, curr) { return total + curr.amount; }, 0);
        var keepBlindedMessages = this.createRandomBlindedMessages(totalAmount - amount, keyset.id, undefined, counter);
        if (this._seed && counter) {
            counter = counter + keepBlindedMessages.secrets.length;
        }
        var sendBlindedMessages = this.createRandomBlindedMessages(amount, keyset.id, preference, counter, pubkey);
        if (privkey) {
            proofsToSend = getSignedProofs(proofsToSend.map(function (p) {
                return {
                    amount: p.amount,
                    C: pointFromHex(p.C),
                    id: p.id,
                    secret: new TextEncoder().encode(p.secret)
                };
            }), privkey).map(function (p) { return serializeProof(p); });
        }
        // join keepBlindedMessages and sendBlindedMessages
        var blindedMessages = {
            blindedMessages: __spreadArray(__spreadArray([], keepBlindedMessages.blindedMessages, true), sendBlindedMessages.blindedMessages, true),
            secrets: __spreadArray(__spreadArray([], keepBlindedMessages.secrets, true), sendBlindedMessages.secrets, true),
            rs: __spreadArray(__spreadArray([], keepBlindedMessages.rs, true), sendBlindedMessages.rs, true),
            amounts: __spreadArray(__spreadArray([], keepBlindedMessages.amounts, true), sendBlindedMessages.amounts, true)
        };
        var payload = {
            inputs: proofsToSend,
            outputs: __spreadArray([], blindedMessages.blindedMessages, true)
        };
        return { payload: payload, blindedMessages: blindedMessages };
    };
    /**
     * returns proofs that are already spent (use for keeping wallet state clean)
     * @param proofs (only the 'Y' field is required)
     * @returns
     */
    CashuWallet.prototype.checkProofsSpent = function (proofs) {
        return __awaiter(this, void 0, void 0, function () {
            var enc, Ys, payload, states;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        enc = new TextEncoder();
                        Ys = proofs.map(function (p) { return dhke.hashToCurve(enc.encode(p.secret)).toHex(true); });
                        payload = {
                            // array of Ys of proofs to check
                            Ys: Ys
                        };
                        return [4 /*yield*/, this.mint.check(payload)];
                    case 1:
                        states = (_a.sent()).states;
                        return [2 /*return*/, proofs.filter(function (_, i) {
                                var state = states.find(function (state) { return state.Y === Ys[i]; });
                                return state && state.state === CheckStateEnum.SPENT;
                            })];
                }
            });
        });
    };
    CashuWallet.prototype.splitReceive = function (amount, amountAvailable) {
        var amountKeep = amountAvailable - amount;
        var amountSend = amount;
        return { amountKeep: amountKeep, amountSend: amountSend };
    };
    /**
     * Creates blinded messages for a given amount
     * @param amount amount to create blinded messages for
     * @param amountPreference optional preference for splitting proofs into specific amounts. overrides amount param
     * @param keyksetId? override the keysetId derived from the current mintKeys with a custom one. This should be a keyset that was fetched from the `/keysets` endpoint
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @returns blinded messages, secrets, rs, and amounts
     */
    CashuWallet.prototype.createRandomBlindedMessages = function (amount, keysetId, amountPreference, counter, pubkey) {
        var amounts = splitAmount(amount, amountPreference);
        return this.createBlindedMessages(amounts, keysetId, counter, pubkey);
    };
    /**
     * Creates blinded messages for a according to @param amounts
     * @param amount array of amounts to create blinded messages for
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @param keyksetId? override the keysetId derived from the current mintKeys with a custom one. This should be a keyset that was fetched from the `/keysets` endpoint
     * @param pubkey? optionally locks ecash to pubkey. Will not be deterministic, even if counter is set!
     * @returns blinded messages, secrets, rs, and amounts
     */
    CashuWallet.prototype.createBlindedMessages = function (amounts, keysetId, counter, pubkey) {
        // if we atempt to create deterministic messages without a _seed, abort.
        if (counter != undefined && !this._seed) {
            throw new Error('Cannot create deterministic messages without seed. Instantiate CashuWallet with a mnemonic, or omit counter param.');
        }
        var blindedMessages = [];
        var secrets = [];
        var rs = [];
        for (var i = 0; i < amounts.length; i++) {
            var deterministicR = undefined;
            var secretBytes = undefined;
            if (pubkey) {
                secretBytes = createP2PKsecret(pubkey);
            }
            else if (this._seed && counter != undefined) {
                secretBytes = deriveSecret(this._seed, keysetId, counter + i);
                deterministicR = bytesToNumber(deriveBlindingFactor(this._seed, keysetId, counter + i));
            }
            else {
                secretBytes = randomBytes(32);
            }
            if (!pubkey) {
                var secretHex = bytesToHex(secretBytes);
                secretBytes = new TextEncoder().encode(secretHex);
            }
            secrets.push(secretBytes);
            var _a = dhke.blindMessage(secretBytes, deterministicR), B_ = _a.B_, r = _a.r;
            rs.push(r);
            var blindedMessage = new BlindedMessage(amounts[i], B_, keysetId);
            blindedMessages.push(blindedMessage.getSerializedBlindedMessage());
        }
        return { blindedMessages: blindedMessages, secrets: secrets, rs: rs, amounts: amounts };
    };
    /**
     * Creates NUT-08 blank outputs (fee returns) for a given fee reserve
     * See: https://github.com/cashubtc/nuts/blob/main/08.md
     * @param feeReserve amount to cover with blank outputs
     * @param keysetId mint keysetId
     * @param counter? optionally set counter to derive secret deterministically. CashuWallet class must be initialized with seed phrase to take effect
     * @returns blinded messages, secrets, and rs
     */
    CashuWallet.prototype.createBlankOutputs = function (feeReserve, keysetId, counter) {
        var count = Math.ceil(Math.log2(feeReserve)) || 1;
        //Prevent count from being -Infinity
        if (count < 0) {
            count = 0;
        }
        var amounts = count ? Array(count).fill(1) : [];
        var _a = this.createBlindedMessages(amounts, keysetId, counter), blindedMessages = _a.blindedMessages, rs = _a.rs, secrets = _a.secrets;
        return { blindedMessages: blindedMessages, secrets: secrets, rs: rs };
    };
    return CashuWallet;
}());
export { CashuWallet };
//# sourceMappingURL=CashuWallet.js.map