import React from "react";
import CardContainer from "../AgreementDetailsCard";
import styles from "./AgreementMembers.module.scss";

type MemberStatus = "Primary" | "Secondary";

interface AgreementMember {
	address: string;
	status: MemberStatus;
}

interface AgreementMembersProps {
	members: AgreementMember[];
}

interface WalletItemProps {
	address: string;
	status: MemberStatus;
}

const WalletItem: React.FC<WalletItemProps> = ({ address, status }) => {
	const statusClass = status === "Primary" ? styles.walletPrimary : styles.walletSecondary;

	return <div className={`${styles.walletItem} ${statusClass}`}>{address}</div>;
};

const AgreementMembers: React.FC<AgreementMembersProps> = ({ members }) => {
	return (
		<CardContainer icon="members" title="Agreement members">
			<div className={styles.membersList}>
				{members.map((member, index) => (
					<WalletItem key={index} address={member.address} status={member.status} />
				))}
			</div>
		</CardContainer>
	);
};

export default AgreementMembers;
