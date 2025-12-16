import { useState, useEffect } from 'react';

export default function WorkControls() {
    const [status, setStatus] = useState("Ready");
    const [lastAction, setLastAction] = useState(null);
    const [workState, setWorkState] = useState("paused");

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:8000/status');
                const data = await response.json();
                setWorkState(data.work_state);
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll every 1 second
        const interval = setInterval(fetchStatus, 1000);

        return () => clearInterval(interval);
    }, []);

    const performAction = async (action, endpoint) => {
        setStatus(`${action}ing...`);
        try {
            const response = await fetch(`http://localhost:8000/${endpoint}`, {
                method: 'POST',
            });
            const data = await response.json();
            setStatus(data.message);
            setLastAction(data);
            if (data.work_state) {
                setWorkState(data.work_state);
            }
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
            setStatus(`Error: Failed to ${action}`);
        }
    };

    return (
        <div>
            <h2>Work Controls</h2>
            <p>State: <strong>{workState}</strong></p>

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
