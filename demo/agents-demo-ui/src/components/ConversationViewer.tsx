import { useEffect, useRef, useState } from "react";
import type { CarGateSimulationEvent } from "@d4ia/agents-demos";
import { CarGateSimulationEventType } from "@d4ia/agents-demos";
import { DaiaMessageUtil } from "@d4ia/core";
import { DaiaMessageViewer } from "./DaiaMessageViewer";

// Re-export types from agents-demos for convenience
export type { CarGateSimulationEvent };
export { CarGateSimulationEventType };

interface ConversationViewerProps {
	events: CarGateSimulationEvent[];
	title?: string;
}

export const ConversationViewer = ({ events, title = "Agent Conversation" }: ConversationViewerProps) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

	useEffect(() => {
		if (autoScroll) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [events, autoScroll]);

	const tryParseDaiaMessage = (message: string) => {
		try {
			if (DaiaMessageUtil.isDaiaMessage(message)) {
				return DaiaMessageUtil.deserialize(message);
			}
		} catch {
			// If parsing fails, return null
		}
		return null;
	};

	const renderEvent = (event: CarGateSimulationEvent, index: number) => {
		switch (event.type) {
			case CarGateSimulationEventType.GATE_TO_CAR_MESSAGE: {
				const daiaMessage = tryParseDaiaMessage(event.message);
				return (
					<div key={index} className="chat chat-start">
						<div className="chat-header">
							🚪 Gate
							<time className="text-xs opacity-50 ml-2">{new Date().toLocaleTimeString()}</time>
						</div>
						<div className="chat-bubble chat-bubble-primary">
							{daiaMessage ? (
								<DaiaMessageViewer message={daiaMessage} />
							) : (
								event.message
							)}
						</div>
					</div>
				);
			}

			case CarGateSimulationEventType.CAR_TO_GATE_MESSAGE: {
				const daiaMessage = tryParseDaiaMessage(event.message);
				return (
					<div key={index} className="chat chat-end">
						<div className="chat-header">
							🚗 Car
							<time className="text-xs opacity-50 ml-2">{new Date().toLocaleTimeString()}</time>
						</div>
						<div className="chat-bubble chat-bubble-secondary">
							{daiaMessage ? (
								<DaiaMessageViewer message={daiaMessage} />
							) : (
								event.message
							)}
						</div>
					</div>
				);
			}

case CarGateSimulationEventType.GATE_ACTION: {
			const actionEmoji = {
				"let-in": "✅",
				"let-out": "👋",
				reject: "❌",
			}[event.action];
			const actionText = {
				"let-in": "Gate let the car IN",
				"let-out": "Gate let the car OUT",
				reject: "Gate REJECTED the car",
			}[event.action];
			const actionColor = {
				"let-in": "alert-success",
				"let-out": "alert-info",
				reject: "alert-error",
			}[event.action];

			return (
				<div key={index} className="flex justify-center my-4">
					<div className={`alert ${actionColor} max-w-md`}>
						<span className="text-2xl">{actionEmoji}</span>
						<span className="font-bold">{actionText}</span>
					</div>
				</div>
			);
		}

			case CarGateSimulationEventType.GATE_LOG:
				return (
					<div key={index} className="flex justify-start my-2">
						<div className="badge badge-ghost badge-sm">
							<span className="mr-1">🚪</span>
							{event.message}
						</div>
					</div>
				);

			case CarGateSimulationEventType.CAR_LOG:
				return (
					<div key={index} className="flex justify-end my-2">
						<div className="badge badge-ghost badge-sm">
							<span className="mr-1">🚗</span>
							{event.message}
						</div>
					</div>
				);

			case CarGateSimulationEventType.SESSION_END:
				return (
					<div key={index} className="flex justify-center my-4">
						<div className="alert alert-warning max-w-md">
							<span>🏁</span>
							<span>Session ended by {event.side}</span>
						</div>
					</div>
				);

			case CarGateSimulationEventType.MAX_TURNS_REACHED:
				return (
					<div key={index} className="flex justify-center my-4">
						<div className="alert alert-warning max-w-md">
							<span>⏱️</span>
							<span>Maximum turns reached: {event.turns}</span>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full">
			<div className="navbar bg-base-300 rounded-t-xl">
				<div className="flex-1">
					<h2 className="text-xl font-bold ml-4">{title}</h2>
				</div>
				<div className="flex-none gap-4">
					<label className="label cursor-pointer gap-2">
						<span className="label-text">Auto-scroll</span>
						<input
							type="checkbox"
							className="checkbox checkbox-sm"
							checked={autoScroll}
							onChange={(e) => setAutoScroll(e.target.checked)}
						/>
					</label>
					<div className="badge badge-neutral">{events.length} events</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-6 bg-base-100 space-y-2">
				{events.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-base-content/50">
						<div className="text-6xl mb-4">💬</div>
						<p className="text-xl">No conversation yet</p>
						<p className="text-sm mt-2">Events will appear here as the agents communicate</p>
					</div>
				) : (
					<>
						{events.map((event, index) => renderEvent(event, index))}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>
		</div>
	);
};
