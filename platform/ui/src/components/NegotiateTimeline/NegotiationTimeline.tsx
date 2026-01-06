import React from "react";
import styles from "./NegotiationTimeline.module.scss";

export interface TimelineEvent {
	id: string;
	title: string;
	action: string;
	timestamp: string;
	txId: string;
	isSigned: boolean;
}

interface NegotiationTimelineProps {
	events: TimelineEvent[];
}

const TimelineItem: React.FC<TimelineEvent> = ({ title, action, timestamp, txId, isSigned }) => {
	const shortHash = txId
		? `${txId.substring(0, 6)}...${txId.substring(txId.length - 4)}`
		: "Pending";
	const colorClass = isSigned ? styles.colorGreen : styles.colorPurple;

	return (
		<div className={styles.timelineItem}>
			<div className={`${styles.timelineSegment} ${colorClass}`}>
				<div className={styles.timelineDot}></div>
			</div>

			<div className={styles.content}>
				<div className={styles.titleText}>{title}</div>
				<div className={styles.actionText}>{action}</div>

				{txId && (
					<div className={styles.transactionLink}>
						Transaction ID: <span style={{ fontFamily: "monospace" }}>{shortHash}</span>
					</div>
				)}
			</div>

			<div className={styles.timestamp}>{timestamp}</div>
		</div>
	);
};

const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({ events }) => {
	return (
		<div className={styles.timelineWrapper}>
			<h2 className={styles.timelineHeader}>Negotiation timeline</h2>
			<div className={styles.timelineBody}>
				{events.length > 0 ? (
					events.map((event) => <TimelineItem key={event.id} {...event} />)
				) : (
					<div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
						No agreements found in this transaction.
					</div>
				)}
			</div>
		</div>
	);
};

export default NegotiationTimeline;
