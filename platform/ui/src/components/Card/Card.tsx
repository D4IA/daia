import React from "react";
import negotiateSvgUrl from "../../assets/negotiate.svg";
import secureSvgUrl from "../../assets/secure.svg";
import encryptedSvgUrl from "../../assets/encrypted.svg";
import encryptedBlockchainStorageSvgUrl from "../../assets/encrypted_blockchain_storage.svg";
import lightweightSvgUrl from "../../assets/lightweight.svg";
import simpleIntegrationSvgUrl from "../../assets/simple_integration.svg";

import styles from "./Card.module.scss";
interface CardData {
	id: number;
	iconKey:
		| "Negotiate"
		| "Secure"
		| "Encrypted"
		| "EncryptedBlockchainStorage"
		| "Lightweight"
		| "SimpleIntegration";
	title: string;
	description: string;
}

interface CardProps {
	data: CardData;
}

const getIconUrl = (key: CardData["iconKey"]) => {
	switch (key) {
		case "Negotiate":
			return negotiateSvgUrl;
		case "Secure":
			return secureSvgUrl;
		case "Encrypted":
			return encryptedSvgUrl;
		case "EncryptedBlockchainStorage":
			return encryptedBlockchainStorageSvgUrl;
		case "Lightweight":
			return lightweightSvgUrl;
		case "SimpleIntegration":
			return simpleIntegrationSvgUrl;
		default:
			return "";
	}
};

const Card: React.FC<CardProps> = ({ data }) => {
	const iconUrl = getIconUrl(data.iconKey);

	return (
		<div className={styles.cardContainer}>
			<div className={styles.iconWrapper}>
				<img src={iconUrl} alt={data.iconKey} className={styles.iconStyle} />
			</div>
			<h3 className="subtitle">{data.title}</h3>{" "}
			<p className={styles.descriptionText}>{data.description}</p>
		</div>
	);
};

export default Card;
