import React from "react";
import AgreementRequirements from "../AgreementDetailsCard/AgreementRequirements/AgreementRequirements";
import AgreementProofs from "../AgreementDetailsCard/AgreementProofs/AgreementProofs";
import styles from "./AgreementDetailsContainer.module.scss";

interface AgreementDetailsContainerProps {
	requirementsArray?: any[];
	proofsArray?: any[];
	requirements?: any;
	proofs?: any;
}

const AgreementDetailsContainer: React.FC<AgreementDetailsContainerProps> = ({
	requirementsArray,
	proofsArray,
	requirements,
	proofs,
}) => {
	return (
		<div className={styles.detailsContent}>
			<div className={styles.requirementsColumn}>
				<AgreementRequirements requirementsArray={requirementsArray} requirements={requirements} />
			</div>

			<div className={styles.proofsColumn}>
				<AgreementProofs proofsArray={proofsArray} proofs={proofs} />
			</div>
		</div>
	);
};

export default AgreementDetailsContainer;
