import { useState } from 'react';

export default function WorkControls() {
    const [status, setStatus] = useState("Ready");
    const [lastAction, setLastAction] = useState(null);

    const performAction = async (action, endpoint) => {
        setStatus(`${action}ing...`);
        try {
            const response = await fetch(`http://localhost:8000/${endpoint}`, {
                method: 'POST',
            });
            const data = await response.json();
            setStatus(data.message);
            setLastAction(data);
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
            setStatus(`Error: Failed to ${action}`);
        }
    };

    return (
        <div>
            <h2>Work Controls</h2>

            <div>
                <button onClick={() => performAction('Start', 'start-work')}>
                    Start
                </button>
                <button onClick={() => performAction('Play', 'play')}>
                    Play
                </button>
                <button onClick={() => performAction('Pause', 'pause')}>
                    Pause
                </button>
                <button onClick={() => performAction('Flush', 'flush')}>
                    Flush
                </button>
            </div>

            <div>
                <p>Status: {status}</p>
                {lastAction && (
                    <p>Server Status: {lastAction.status}</p>
                )}
            </div>
        </div>
    );
}
