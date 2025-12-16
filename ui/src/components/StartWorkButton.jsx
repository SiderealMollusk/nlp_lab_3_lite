import { useState } from 'react';

export default function StartWorkButton() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/start-work', {
                method: 'POST',
            });
            const data = await response.json();
            setStatus(`Success: ${data.message} (${data.status})`);
        } catch (error) {
            console.error("Error starting work:", error);
            setStatus("Error starting work");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ marginTop: '20px' }}>
            <button onClick={handleClick} disabled={loading}>
                {loading ? 'Starting...' : 'Start Work'}
            </button>
            {status && <p>{status}</p>}
        </div>
    );
}
