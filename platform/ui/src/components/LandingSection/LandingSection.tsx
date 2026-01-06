import React from "react";
import Button from "../Button/Button";
import DynamicGradientBackground from "../DynamicGradientBackground/DynamicGradientBackground";
import styles from "./LandingSection.module.scss";

interface LandingSectionProps {
	title: string;
	subtitle1?: string;
	subtitle2?: string;
	buttonText?: string;
	buttonIcon?: string;
	buttonClassName?: string;
	onButtonClick?: () => void;
}

const LandingSection: React.FC<LandingSectionProps> = ({
	title,
	subtitle1,
	subtitle2,
	buttonText,
	buttonIcon,
	buttonClassName,
	onButtonClick,
}) => {
	return (
		<div className={styles.container}>
			<DynamicGradientBackground className={styles.dynamicBackground} />

			<div className={`contentWrapper ${styles.landingContentPadding}`}>
				<h1 className={styles.title}>{title}</h1>

				{(subtitle1 || subtitle2) && (
					<p className="subtitle">
						{subtitle1}
						<br />
						{subtitle2}
					</p>
				)}

				{buttonText && (
					<div className="buttonContainer">
						<Button className={`actionButton ${buttonClassName ?? ""}`} onClick={onButtonClick}>
							{buttonIcon && <img src={buttonIcon} alt="icon" className="h-5 w-5 mr-2 invert" />}
							{buttonText}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};

export default LandingSection;
