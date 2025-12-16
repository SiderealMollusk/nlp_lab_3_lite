import { useState, useEffect } from 'react';

export default function JobsList() {
    const [jobs, setJobs] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch('http://localhost:8000/jobs');
                const data = await response.json();
                setJobs(data.jobs);
                setError(null);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                setError('Failed to fetch jobs');
            }
        };

        // Initial fetch
        fetchJobs();

        // Poll every 2 seconds
        const interval = setInterval(fetchJobs, 2000);

        return () => clearInterval(interval);
    }, []);

    const jobEntries = Object.entries(jobs);

    return (
        <div>
            <h2>Jobs ({jobEntries.length})</h2>
            {error && <p>{error}</p>}
            {jobEntries.length === 0 ? (
                <p>No jobs</p>
            ) : (
                <ul>
                    {jobEntries.map(([id, job]) => (
                        <li key={id}>
                            Task #{job.task_number}: {job.payload.handler} - {id.substring(0, 8)}...
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
