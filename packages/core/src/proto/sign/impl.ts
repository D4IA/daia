import {
	DaiaAgreement,
	DaiaOfferContent,
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaProofAgreementReference,
	DaiaProofPayment,
	DaiaProofSign,
} from "../defines";
import {
	SYMBOL_OFFER_SELF_PAID,
	OfferSignRequest,
	OfferSignResponse,
	OfferSigner,
} from "./defines";
import { UnsatisfiedOfferRequirementsError } from "./errors";

const serializeOffer = (offer: DaiaOfferContent): string =>
	JSON.stringify({
		...offer,
		requirements: Object.fromEntries(offer.requirements.entries()),
	});

const addPayment = (payments: Record<string, number>, to: string, amount: number) => {
	payments[to] = (payments[to] ?? 0) + amount;
};

const applyPaid = (payments: Record<string, number>, paid: Record<string, number>) => {
	for (const [to, amount] of Object.entries(paid)) {
		if (payments[to] === undefined) continue;
		payments[to] = Math.max(0, payments[to] - amount);
		if (payments[to] === 0) delete payments[to];
	}
};

const generateNonce = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class OfferSignerImpl implements OfferSigner {
	public async signOffer(request: OfferSignRequest): Promise<OfferSignResponse> {
		const { offer, signer, agreementReferencer, payer } = request;
		const proofs = new Map<string, DaiaProofSign | DaiaProofPayment | DaiaProofAgreementReference>();
		const unsatisfied: string[] = [];
		const paymentsLeft: Record<string, number> = {};

		const offerContentSerialized = serializeOffer(offer);

		for (const [requirementId, requirement] of offer.requirements.entries()) {
			if (requirement.type === DaiaRequirementType.SIGN) {
				if (requirement.sign) {
					proofs.set(requirementId, {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "",
						signature: requirement.sign,
					});
					continue;
				}

				if (!signer?.signForPublicKey) {
					unsatisfied.push(requirementId);
					continue;
				}

				const signeeNonce = generateNonce();
				const message = JSON.stringify({
					offerContentSerialized,
					offererNonce: requirement.offererNonce,
					signeeNonce,
				});

				const signature = await signer.signForPublicKey(requirement.pubKey, message);

				proofs.set(requirementId, {
					type: DaiaRequirementType.SIGN,
					signeeNonce,
					signature,
				});
				continue;
			}

			if (requirement.type === DaiaRequirementType.AGREEMENT_REFERENCE) {
				const reference =
					requirement.url ??
					(agreementReferencer
						? await agreementReferencer.getAgreementReferenceUrlForType(requirement.referenceType)
						: "");

				if (!reference) {
					unsatisfied.push(requirementId);
					continue;
				}

				proofs.set(requirementId, {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference,
				});
				continue;
			}

			if (requirement.type === DaiaRequirementType.PAYMENT) {
				addPayment(paymentsLeft, requirement.to, requirement.amount);

				if (requirement.auth.type === DaiaPaymentRequirementAuthType.REMOTE) {
					if (payer && payer !== SYMBOL_OFFER_SELF_PAID) {
						const payment = await payer.payRequirement(requirement.auth.paymentNonce, {
							[requirement.to]: requirement.amount,
						});
						if (payment) {
							applyPaid(paymentsLeft, payment.paid);
							proofs.set(requirementId, {
								type: DaiaRequirementType.PAYMENT,
								txId: payment.txId,
							});
							continue;
						}
					}

					proofs.set(requirementId, {
						type: DaiaRequirementType.PAYMENT,
						txId: requirement.auth.txId || "",
					});
				} else {
					proofs.set(requirementId, {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					});
				}
				continue;
			}

			unsatisfied.push(requirementId);
		}

		if (unsatisfied.length > 0) {
			throw new UnsatisfiedOfferRequirementsError({
				unsatisfiedRequirementIds: unsatisfied,
				paymentsLeft,
			});
		}

		const agreement: DaiaAgreement = {
			offerContentSerialized,
			proofs,
		};

		return { agreement, paymentsLeft };
	}
}
