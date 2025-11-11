import { useState, useCallback } from 'react';
import { GateAgent, GateAgentConfig } from '../agents/agents/gate/agent';
import { GateControls } from '../agents/agents/gate/controls';
import { Conn } from '../agents/conn/conn';
import { CallbackConn } from '../agents/conn/callbackConn';
import { MessageType, SocketMessage } from '../socket/message';

type RunResult =
    | { status: 'pending' }
    | { status: 'success' }
    | { status: 'error'; error: Error };

export interface UseGateAgentParams {
    controls: GateControls;
    config: GateAgentConfig;
    sessionId: string;
}

export interface UseGateAgentReturn {
    run: (conn: Conn) => Promise<void>;
    messages: SocketMessage[];
    result: RunResult;
}

export const useGateAgent = ({
    controls,
    config,
    sessionId
}: UseGateAgentParams): UseGateAgentReturn => {
    const [messages, setMessages] = useState<SocketMessage[]>([]);
    const [result, setResult] = useState<RunResult>({ status: 'pending' });

    const run = useCallback(async (conn: Conn): Promise<void> => {
        setMessages([]);
        setResult({ status: 'pending' });

        // Create callback connection to track messages
        const callbackConn = new CallbackConn(conn, {
            onSend: (message: string) => {
                const socketMessage: SocketMessage = {
                    role: MessageType.GATE,
                    sessionId: sessionId,
                    content: message,
                };
                setMessages(prev => [...prev, socketMessage]);
            },
            onReceive: (message: string) => {
                const socketMessage: SocketMessage = {
                    role: MessageType.CAR,
                    sessionId: sessionId,
                    content: message,
                };
                setMessages(prev => [...prev, socketMessage]);
            },
            onError: (error: Error) => {
                setResult({ status: 'error', error });
            },
        });

        try {
            const gateAgent = new GateAgent(controls, config);
            await gateAgent.handle(callbackConn);
            setResult({ status: 'success' });
        } catch (error) {
            console.error("Error in handling gate agent:", error);
            const err = error instanceof Error ? error : new Error(String(error));
            setResult({ status: 'error', error: err });
        } finally {
            callbackConn.close().catch(() => { })
        }
    }, [controls, config, sessionId]);

    return {
        run,
        messages,
        result,
    };
};