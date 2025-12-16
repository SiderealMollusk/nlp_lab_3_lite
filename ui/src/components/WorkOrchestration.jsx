import { useState, useEffect } from 'react';

export default function WorkOrchestration() {
    const [status, setStatus] = useState({
        work_state: 'paused',
        planned_jobs: 0,
        queued_jobs: 0,
        completed_jobs: 0
    });
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [files, setFiles] = useState({ corpus: [], analysis_dirs: [] });
    const [fileInputs, setFileInputs] = useState({});
    const [collectLabel, setCollectLabel] = useState('');
    const [gitStatus, setGitStatus] = useState({ is_clean: true, uncommitted_files: [] });
    const [message, setMessage] = useState('');
    const [flashPlan, setFlashPlan] = useState(false);
    const [flashQueue, setFlashQueue] = useState(false);
    const [flashComplete, setFlashComplete] = useState(false);

    // Fetch available plans
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('http://localhost:8000/plans');
                const data = await response.json();
                setPlans(data.plans);
                if (data.plans.length > 0) {
                    setSelectedPlan(data.plans[0].id);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        };
        fetchPlans();
    }, []);

    // Fetch available files
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await fetch('http://localhost:8000/files');
                const data = await response.json();
                setFiles(data);
            } catch (error) {
                console.error('Error fetching files:', error);
            }
        };
        fetchFiles();
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:8000/status');
                const data = await response.json();

                // Check for completion flash
                if (data.completed_jobs > 0 &&
                    data.queued_jobs === 0 &&
                    data.completed_jobs === status.completed_jobs + 1) {
                    setFlashComplete(true);
                    setTimeout(() => setFlashComplete(false), 1000);
                }

                setStatus(data);

                // Also fetch git status
                try {
                    const gitResponse = await fetch('http://localhost:8001/git/status');
                    const gitData = await gitResponse.json();
                    setGitStatus(gitData);
                } catch (err) {
                    console.error('Error fetching git status:', err);
                }
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 500);
        return () => clearInterval(interval);
    }, [status.completed_jobs]);

    const makePlan = async () => {
        try {
            const response = await fetch('http://localhost:8000/make-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: selectedPlan,
                    inputs: fileInputs
                })
            });
            const data = await response.json();
            setMessage(data.message);

            if (data.status === 'success') {
                setFlashPlan(true);
                setTimeout(() => setFlashPlan(false), 1000);
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const collectResults = async () => {
        try {
            const response = await fetch(`http://localhost:8000/collect?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel(''); // Clear label after successful collect
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const collectWithStash = async () => {
        try {
            const response = await fetch(`http://localhost:8000/collect-with-stash?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel('');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const forceCollect = async () => {
        if (!window.confirm('Force collect will mark results as DIRTY. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/collect-force?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel('');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const callEndpoint = async (endpoint, flashSetter) => {
        try {
            const response = await fetch(`http://localhost:8000/${endpoint}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message);

            if (data.status === 'success' && flashSetter) {
                flashSetter(true);
                setTimeout(() => flashSetter(false), 1000);
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const canMakePlan = status.planned_jobs === 0;
    const canDispatch = status.planned_jobs > 0 && status.queued_jobs === 0;

    return (
        <div>
            <h1>Work Orchestration</h1>

            {/* Planning Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>1. Planning</h2>
                <p className={flashPlan ? 'flash' : ''}>
                    Planned Jobs: <strong>{status.planned_jobs}</strong>
                </p>

                <div style={{ marginBottom: '10px' }}>
                    <label>Select Plan: </label>
                    <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                    </select>
                </div>

                {selectedPlan && plans.find(p => p.id === selectedPlan)?.inputs.map(input => {
                    // Combine all files into one list
                    const allFiles = [...files.corpus, ...(files.analysis_dirs || [])];

                    return (
                        <div key={input.name} style={{ marginBottom: '10px' }}>
                            <label>{input.name}: </label>
                            <select
                                value={fileInputs[input.name] || ''}
                                onChange={(e) => setFileInputs({ ...fileInputs, [input.name]: e.target.value })}
                            >
                                <option value="">Select file...</option>
                                {allFiles.map(file => (
                                    <option key={file.path} value={file.path}>{file.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}

                <button
                    onClick={makePlan}
                    disabled={!canMakePlan}
                >
                    Make Plan
                </button>
                <button onClick={() => callEndpoint('flush-plan')}>
                    Flush Plan
                </button>
            </div>

            {/* Dispatch Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>2. Work Control</h2>
                <p className={flashQueue ? 'flash' : ''}>
                    Queued Jobs: <strong>{status.queued_jobs}</strong>
                </p>
                <p>State: <strong>{status.work_state}</strong></p>

                <button
                    onClick={() => callEndpoint(status.work_state === 'playing' ? 'pause' : 'play')}
                >
                    {status.work_state === 'playing' ? 'Pause' : 'Play'}
                </button>
                <button
                    onClick={() => callEndpoint('dispatch', setFlashQueue)}
                    disabled={!canDispatch}
                >
                    Dispatch
                </button>
                <button onClick={() => callEndpoint('flush-queue')}>
                    Flush Queue
                </button>
            </div>

            {/* Completion Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>3. Completion</h2>
                <p className={flashComplete ? 'flash' : ''}>
                    Completed Jobs: <strong>{status.completed_jobs}</strong>
                </p>
                {status.current_plan && (
                    <p>Output: <strong>{status.current_plan.output_dir}/{status.current_plan.output_file}_*.jsonl</strong></p>
                )}

                {/* Git Status Warning */}
                {!gitStatus.is_clean && (
                    <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', marginBottom: '10px' }}>
                        <strong>⚠️ Repository Dirty</strong>
                        <p style={{ margin: '5px 0', fontSize: '0.9em' }}>
                            {gitStatus.uncommitted_files.length} uncommitted file(s)
                        </p>
                    </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                    <label>Label (optional): </label>
                    <input
                        type="text"
                        value={collectLabel}
                        onChange={(e) => setCollectLabel(e.target.value)}
                        placeholder="e.g., test_run"
                    />
                </div>

                {gitStatus.is_clean ? (
                    <button onClick={collectResults} disabled={status.completed_jobs === 0}>
                        Collect Results
                    </button>
                ) : (
                    <>
                        <button onClick={collectWithStash} disabled={status.completed_jobs === 0}>
                            Stash & Collect
                        </button>
                        <button
                            onClick={forceCollect}
                            disabled={status.completed_jobs === 0}
                            style={{ background: '#dc3545', color: 'white' }}
                        >
                            Force Collect (DIRTY)
                        </button>
                    </>
                )}

                <button onClick={() => callEndpoint('reset')}>
                    Flush Results
                </button>
            </div>

            {/* Status Message */}
            {message && <p><em>{message}</em></p>}
        </div>
    );
}
