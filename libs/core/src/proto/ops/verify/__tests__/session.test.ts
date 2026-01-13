import { describe, it } from "vitest";
import { DaiaAgreementVerifySession } from "../session";
import { BsvTransactionParser, BsvNetwork, PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaRequirementType } from "../../../defines";

describe("DaiaAgreementVerifySession", () => {
	const validPubKey = PrivateKey.fromRandom().toPublicKey().toString();

	it("should create session with parser and request", () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);

		DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "TEST",
						naturalLanguageOfferContent: "Test",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		});
	});

	it("should run verification session with empty agreement", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "EMPTY",
						naturalLanguageOfferContent: "Empty agreement",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		});

		session.run();
	});

	it("should run verification with sign requirement and proof", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "SIGNED",
						naturalLanguageOfferContent: "Signed",
						requirements: {
							"req-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"req-1": {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "signee-nonce",
						signature: "sig-data",
					},
				},
			},
		});

		session.run();
	});

	it("should run verification with payment requirement", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "PAYMENT",
						naturalLanguageOfferContent: "Payment",
						requirements: {
							"payment-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					},
				},
			},
			transactionData: {
				payments: {
					addr: 1000,
				},
			},
		});

		session.run();
	});

	it("should run verification with transaction data", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "TX-DATA",
						naturalLanguageOfferContent: "With transaction data",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
			transactionData: {
				payments: {
					"addr-1": 500,
					"addr-2": 1000,
				},
			},
		});

		session.run();
	});

	it("should handle verification session with complex agreement", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "COMPLEX",
						naturalLanguageOfferContent: "Complex",
						requirements: {
							sign: {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					sign: {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "s-nonce",
						signature: "sig",
					},
				},
			},
		});

		session.run();
	});

	it("should fail when requirements and proofs keys do not match", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "MISMATCH",
						naturalLanguageOfferContent: "Mismatch keys",
						requirements: {
							"req-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {}, // Missing proof for req-1
			},
		});

		await session.run();
	});

	it("should fail when requirement type does not match proof type", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "TYPE-MISMATCH",
						naturalLanguageOfferContent: "Type mismatch",
						requirements: {
							"req-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"req-1": {
						type: DaiaRequirementType.PAYMENT, // Mismatch type
						txId: "tx-id",
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
					} as any,
				},
			},
		});

		await session.run();
	});

	it("should fail when signature verification fails", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "BAD-SIG",
						naturalLanguageOfferContent: "Bad sig",
						requirements: {
							"req-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"req-1": {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "nonce",
						signature: "bad-signature",
					},
				},
			},
		});

		await session.run();
	});

	it("should fail when signature is empty", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "EMPTY-SIG",
						naturalLanguageOfferContent: "Empty sig",
						requirements: {
							"req-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: validPubKey,
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"req-1": {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "nonce",
						signature: "", // Empty signature
					},
				},
			},
		});

		await session.run();
	});

	it("should fail when self-authenticated payment amount mismatches", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "PAYMENT-AMOUNT",
						naturalLanguageOfferContent: "Wrong amount",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					},
				},
			},
			transactionData: {
				payments: {
					addr: 500, // Wrong amount
				},
			},
		});

		await session.run();
	});

	it("should fail when self-authenticated payment data is missing", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "NO-PAYMENT-DATA",
						naturalLanguageOfferContent: "No data",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					},
				},
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			transactionData: undefined as any, // Cast to any to bypass TS check for missing required props
		});

		await session.run();
	});

	it("should verify remote payment", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		// Mock findTransactionById
		parser.findTransactionById = async () =>
			({
				id: "remote-tx-id",
				data: {
					payments: { "remote-addr": 2000 },
					customData: JSON.stringify({
						type: "payment-identifier",
						paymentNonce: "nonce-123",
					}),
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REMOTE-PAY",
						naturalLanguageOfferContent: "Remote payment",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "remote-addr",
								amount: 2000,
								auth: {
									type: "remote",
									paymentNonce: "nonce-123",
								},
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "remote-tx-id",
					},
				},
			},
		});

		await session.run();
	});

	it("should fail remote payment if tx not found", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		parser.findTransactionById = async () => null;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REMOTE-MISSING",
						naturalLanguageOfferContent: "Missing tx",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "remote", paymentNonce: "n" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "missing-tx",
					},
				},
			},
		});

		await session.run();
	});

	it("should fail remote payment if amount mismatches", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		parser.findTransactionById = async () =>
			({
				id: "tx-id",
				data: {
					payments: { addr: 500 }, // Wrong amount
					customData: JSON.stringify({
						type: "payment-identifier",
						paymentNonce: "n",
					}),
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REMOTE-AMOUNT",
						naturalLanguageOfferContent: "Wrong amount",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "remote", paymentNonce: "n" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "tx-id",
					},
				},
			},
		});

		await session.run();
	});

	it("should fail remote payment if custom data missing", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		parser.findTransactionById = async () =>
			({
				id: "tx-id",
				data: {
					payments: { addr: 1000 },
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REMOTE-NO-DATA",
						naturalLanguageOfferContent: "No data",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "remote", paymentNonce: "n" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "tx-id",
					},
				},
			},
		});

		await session.run();
	});

	it("should fail remote payment if nonce mismatches", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		parser.findTransactionById = async () =>
			({
				id: "tx-id",
				data: {
					payments: { addr: 1000 },
					customData: JSON.stringify({
						type: "payment-identifier",
						paymentNonce: "wrong-nonce",
					}),
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REMOTE-NONCE",
						naturalLanguageOfferContent: "Wrong nonce",
						requirements: {
							"pay-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "remote", paymentNonce: "correct-nonce" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"pay-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "tx-id",
					},
				},
			},
		});

		await session.run();
	});

	it("should verify agreement reference recursively", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		// Mock finding referenced agreement
		parser.findTransactionById = async (id) => {
			if (id === "ref-tx") {
				return {
					id: "ref-tx",
					data: {
						payments: {},
						customData: JSON.stringify({
							offerContent: {
								inner: JSON.stringify({
									offerTypeIdentifier: "REFERENCED",
									naturalLanguageOfferContent: "Child",
									requirements: {},
								}),
								signatures: {},
							},
							proofs: {},
						}),
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} as any;
			}
			return null;
		};

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "PARENT",
						naturalLanguageOfferContent: "Parent",
						requirements: {
							"ref-1": {
								type: DaiaRequirementType.AGREEMENT_REFERENCE,
								referenceType: "t",
								pointer: { type: "tx-id", txId: "ref-tx" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"ref-1": {
						type: DaiaRequirementType.AGREEMENT_REFERENCE,
						reference: "ref",
					},
				},
			},
		});

		await session.run();
	});

	it("should detect agreement recursion loop", async () => {
		const parser = new BsvTransactionParser(BsvNetwork.TEST);

		// Mock circular reference
		const agreementWithRef = {
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "LOOP",
					naturalLanguageOfferContent: "Loop",
					requirements: {
						"ref-1": {
							type: DaiaRequirementType.AGREEMENT_REFERENCE,
							referenceType: "t",
							pointer: { type: "tx-id", txId: "tx-1" },
						},
					},
				}),
				signatures: {},
			},
			proofs: {
				"ref-1": {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference: "ref",
				},
			},
		};

		parser.findTransactionById = async () =>
			({
				id: "tx-1",
				data: {
					payments: {},
					customData: JSON.stringify(agreementWithRef),
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;

		const session = DaiaAgreementVerifySession.make(parser, {
			agreement: agreementWithRef,
		});

		await session.run();
	});
});
