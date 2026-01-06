import React from "react";
import { useInView } from "react-intersection-observer";
import styles from "./AboutUsView.module.scss";
import { useTranslation } from "react-i18next";
import AboutUsLandingScreen from "./AboutUsLandingScreen";

import WladyslawKuczerenko from "../assets/WladyslawKuczerenko.jpeg";
import PrzemyslawGlowacki from "../assets/PrzemyslawGlowacki.jpeg";
import SzymonJozwiak from "../assets/SzymonJozwiak.jpg";
import StanislawJarocki from "../assets/StanislawJarocki.jpeg";

interface TeamMember {
	name: string;
	role: string;
	imageSrc: string;
}

const AboutUsView: React.FC = () => {
	const { t } = useTranslation();
	const [missionRef, missionInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});
	const [goalRef, goalInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});
	const [transparencyRef, transparencyInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});
	const [teamRef, teamInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	const teamMembersData = t("about_us_view.team_section.members", {
		returnObjects: true,
	}) as TeamMember[];

	const TEAM_MEMBERS: TeamMember[] = teamMembersData.map((member: any) => {
		let imageSrc;
		if (member.name === "Władysław Kuczerenko") {
			imageSrc = WladyslawKuczerenko;
		} else if (member.name === "Przemysław Głowacki") {
			imageSrc = PrzemyslawGlowacki;
		} else if (member.name === "Szymon Jóźwiak") {
			imageSrc = SzymonJozwiak;
		} else {
			imageSrc = StanislawJarocki;
		}
		return { ...member, imageSrc };
	});

	const missionText = `${t("about_us_view.mission_section.paragraph_1")} ${t("about_us_view.mission_section.paragraph_2")} ${t("about_us_view.mission_section.paragraph_3")}`;

	const goalsList = t("about_us_view.goal_section.goals_list", {
		returnObjects: true,
	}) as string[];
	return (
		<>
			<AboutUsLandingScreen />

			<section className={styles.sectionContainer}>
				<div className={styles.contentContainer}>
					<div
						ref={missionRef}
						className={`${styles.reveal} ${styles.slideRight} ${missionInView ? styles.isVisible : ""}`}
					>
						<h2 className={styles.sectionHeading}>{t("about_us_view.mission_section.heading")}</h2>
						<p className={styles.missionParagraph}>{missionText}</p>
					</div>

					<div
						ref={goalRef}
						className={`${styles.reveal} ${styles.slideLeft} ${goalInView ? styles.isVisible : ""}`}
					>
						<h2 className={styles.sectionHeading}>{t("about_us_view.goal_section.heading")}</h2>
						<p className={styles.missionParagraph}>{t("about_us_view.goal_section.intro")}</p>
						<ul className={styles.missionList}>
							{goalsList.map((goal, index) => (
								<li key={index}>{goal}</li>
							))}
						</ul>
						<p className={styles.missionParagraph} style={{ marginTop: "20px" }}>
							{t("about_us_view.goal_section.technology_paragraph")}
						</p>
					</div>

					<div
						ref={transparencyRef}
						className={`${styles.reveal} ${styles.slideRight} ${transparencyInView ? styles.isVisible : ""}`}
					>
						<h2 className={styles.sectionHeading}>{t("about_us_view.transparency_section.heading")}</h2>
						<p className={styles.missionParagraph}>
							{t("about_us_view.transparency_section.open_source")}
						</p>
						<p className={styles.missionParagraph}>{t("about_us_view.transparency_section.belief")}</p>
						<p className={styles.missionParagraph}>{t("about_us_view.transparency_section.protocol")}</p>
					</div>

					<div
						ref={teamRef}
						className={`${styles.teamSection} ${styles.reveal} ${styles.fadeUp} ${teamInView ? styles.isVisible : ""}`}
					>
						<h2 className={styles.teamHeading}>{t("about_us_view.team_section.heading")}</h2>
						<div className={styles.teamGrid}>
							{TEAM_MEMBERS.map((member) => (
								<div key={member.name} className={styles.teamMember}>
									<img
										src={member.imageSrc}
										alt={`Photo of ${member.name}`}
										className={styles.memberImage}
									/>
									<p className={styles.memberName}>{member.name}</p>
									<p className={styles.memberRole}>{member.role}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default AboutUsView;
